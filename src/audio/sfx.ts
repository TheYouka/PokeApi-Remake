// Sonido sintetizado con Web Audio (§12). Sin archivos de audio. Nada del DOM al importar (P-12).
import { settings } from '../state/settings';

export type SfxName = 'tick' | 'select' | 'back' | 'chime' | 'boot' | 'error';
export type AudioStatus = 'locked' | 'suspended' | 'running' | 'unavailable';
export type CryResult = 'ok' | 'unsupported' | 'failed';

type AudioContextCtor = new () => AudioContext;

let ctx: AudioContext | null = null;
let unavailable = false;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let lastTick = Number.NEGATIVE_INFINITY;
const TICK_MIN_GAP_MS = 50;
const CRY_PREFIX = 'https://raw.githubusercontent.com/PokeAPI/';

function getCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function unlock(): void {
  if (unavailable) return;
  try {
    if (!ctx) {
      const Ctor = getCtor();
      if (!Ctor) { unavailable = true; return; }
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => { /* sigue en silencio */ });
  } catch {
    unavailable = true;
    ctx = null;
  }
}

/**
 * Desbloqueo en el primer `pointerdown` o `keydown` (captura, una vez). El mando no cuenta como
 * gesto válido. Lo llama main.tsx; devuelve la limpieza.
 */
export function initAudioUnlock(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (!getCtor()) { unavailable = true; return () => {}; }
  const handler = () => {
    window.removeEventListener('pointerdown', handler, true);
    window.removeEventListener('keydown', handler, true);
    unlock();
  };
  window.addEventListener('pointerdown', handler, { capture: true, once: true });
  window.addEventListener('keydown', handler, { capture: true, once: true });
  return () => {
    window.removeEventListener('pointerdown', handler, true);
    window.removeEventListener('keydown', handler, true);
  };
}

export function audioStatus(): AudioStatus {
  if (unavailable) return 'unavailable';
  if (!ctx) return 'locked';
  return ctx.state === 'running' ? 'running' : 'suspended';
}

// ------------------------------------------------------------------ síntesis

function getMaster(c: AudioContext): GainNode {
  if (!master) {
    master = c.createGain();
    master.gain.value = 0.5;
    master.connect(c.destination);
  }
  return master;
}

function getNoise(c: AudioContext): AudioBuffer {
  if (!noise) {
    const len = Math.floor(c.sampleRate * 0.3);
    noise = c.createBuffer(1, len, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** Envolvente: 0.0001 → pico (ataque) → 0.0001 (exponencial). Suelta los nodos en onended. */
function envelope(c: AudioContext, start: number, attack: number, end: number, peak: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  return g;
}

function release(src: AudioScheduledSourceNode, ...nodes: AudioNode[]): void {
  src.onended = () => {
    src.disconnect();
    for (const n of nodes) n.disconnect();
  };
}

interface ToneSpec {
  type: OscillatorType;
  freq: number;
  /** Frecuencia final (rampa exponencial) o null. */
  to?: number;
  /** Cambio brusco de frecuencia: [segundos desde el inicio, Hz]. */
  step?: [number, number];
  start: number;
  dur: number;
  peak: number;
  attack?: number;
}

function tone(c: AudioContext, dest: AudioNode, s: ToneSpec): void {
  const osc = c.createOscillator();
  osc.type = s.type;
  osc.frequency.setValueAtTime(s.freq, s.start);
  if (s.to !== undefined) osc.frequency.exponentialRampToValueAtTime(s.to, s.start + s.dur);
  if (s.step) osc.frequency.setValueAtTime(s.step[1], s.start + s.step[0]);
  const g = envelope(c, s.start, s.attack ?? Math.min(0.005, s.dur / 4), s.start + s.dur, s.peak);
  osc.connect(g).connect(dest);
  release(osc, g);
  osc.start(s.start);
  osc.stop(s.start + s.dur + 0.02);
}

function noiseBurst(c: AudioContext, dest: AudioNode, start: number, dur: number, peak: number, bandHz: number): void {
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = bandHz;
  const g = envelope(c, start, 0.005, start + dur, peak);
  src.connect(bp).connect(g).connect(dest);
  release(src, bp, g);
  src.start(start);
  src.stop(start + dur + 0.02);
}

function boot(c: AudioContext, dest: AudioNode, t: number): void {
  // Golpe grave
  tone(c, dest, { type: 'sine', freq: 60, start: t, dur: 0.15, peak: 0.12 });
  // Acorde en dientes de sierra por un pasa-bajos que barre 400 → 4000 Hz en 1,6 s
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, t);
  lp.frequency.exponentialRampToValueAtTime(4000, t + 1.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.3);      // ataque 0,3 s
  g.gain.setValueAtTime(0.12, t + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); // liberación 1,2 s
  lp.connect(g).connect(dest);
  const voices = [220, 329.6, 440, 554.4];
  let pending = voices.length;
  for (const f of voices) {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    const v = c.createGain();
    v.gain.value = 1 / voices.length;
    osc.connect(v).connect(lp);
    osc.onended = () => {
      osc.disconnect();
      v.disconnect();
      if (--pending === 0) { lp.disconnect(); g.disconnect(); }
    };
    osc.start(t);
    osc.stop(t + 1.65);
  }
}

const RECIPES: Record<SfxName, (c: AudioContext, dest: AudioNode, t: number) => void> = {
  tick: (c, d, t) => tone(c, d, { type: 'triangle', freq: 1200, to: 900, start: t, dur: 0.03, peak: 0.05, attack: 0.003 }),
  select: (c, d, t) => tone(c, d, { type: 'sine', freq: 660, step: [0.035, 990], start: t, dur: 0.08, peak: 0.08 }),
  back: (c, d, t) => tone(c, d, { type: 'sine', freq: 520, to: 330, start: t, dur: 0.08, peak: 0.07 }),
  chime: (c, d, t) => {
    tone(c, d, { type: 'triangle', freq: 880, start: t, dur: 0.12, peak: 0.06 });
    tone(c, d, { type: 'triangle', freq: 1318.5, start: t + 0.1, dur: 0.3, peak: 0.05 });
    tone(c, d, { type: 'sine', freq: 2637, start: t + 0.15, dur: 0.45, peak: 0.03 });
    noiseBurst(c, d, t, 0.2, 0.02, 6000);
  },
  boot,
  error: (c, d, t) => tone(c, d, { type: 'square', freq: 200, start: t, dur: 0.12, peak: 0.03 }),
};

/** No hace nada si los efectos están desactivados, sin contexto o si no está en 'running'. */
export function play(name: SfxName): void {
  if (!settings.get().sfx) return;
  const c = ctx;
  if (!c || c.state !== 'running') return;
  if (name === 'tick') {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastTick < TICK_MIN_GAP_MS) return;      // ≤ 20 tics por segundo (RF-SND-3)
    lastTick = now;
  }
  try {
    RECIPES[name](c, getMaster(c), c.currentTime + 0.005);
  } catch { /* sin sonido */ }
}

// ------------------------------------------------------------------ gritos

let probe: HTMLAudioElement | null = null;

/**
 * Reproduce un grito (RF-POK-3). Suena aunque los efectos estén silenciados. Nunca lanza ni
 * escribe en consola: 'unsupported' si el navegador no reproduce Ogg Vorbis (sin crear el Audio),
 * 'failed' si play() se rechaza, salta `error` o la URL no es de los sprites de la PokeAPI.
 */
export function playCry(url: string): Promise<CryResult> {
  if (typeof url !== 'string' || !url.startsWith(CRY_PREFIX)) return Promise.resolve('failed');
  if (typeof document === 'undefined' || typeof Audio === 'undefined') return Promise.resolve('failed');
  try {
    probe ??= document.createElement('audio');
    if (probe.canPlayType('audio/ogg; codecs="vorbis"') === '') return Promise.resolve('unsupported');
  } catch {
    return Promise.resolve('failed');
  }
  return new Promise<CryResult>((resolve) => {
    let done = false;
    let audio: HTMLAudioElement | null = null;
    const finish = (r: CryResult) => {
      if (done) return;
      done = true;
      if (r !== 'ok' && audio) {
        audio.removeAttribute('src');   // se descarta el Audio
        audio = null;
      }
      resolve(r);
    };
    try {
      audio = new Audio();
      audio.preload = 'none';
      audio.volume = 0.6;
      audio.addEventListener('error', () => finish('failed'), { once: true });
      audio.src = url;
      audio.play().then(() => finish('ok'), () => finish('failed'));
    } catch {
      finish('failed');
    }
  });
}
