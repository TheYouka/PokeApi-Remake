// Mando (§11.5): bucle de sondeo SOLO con algún mando conectado y la pestaña visible (AC-30).
// Nada del DOM al importar: startGamepad() lo llama GamepadBridge al montarse.
import { es } from '../i18n/es';
import { track } from '../state/achievements';
import { setInput } from '../state/input';
import { addNotification } from '../state/notifications';
import { enqueueToast } from '../state/toasts';
import { dispatch, type NavAction } from './actions';
import { isTextField, leaveField } from './focusEngine';
import type { Dir } from './spatial';

/** Mapeo estándar de botones (sin el D-pad). */
const BUTTONS: Record<number, NavAction> = {
  0: 'accept', 1: 'back', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 6: 'lt', 7: 'rt', 9: 'guide', 16: 'guide',
};
const DPAD: [number, Dir][] = [[12, 'up'], [13, 'down'], [14, 'left'], [15, 'right']];
const STICK_ON = 0.5;
const STICK_OFF = 0.3;
const REPEAT_FIRST_MS = 400;
const REPEAT_NEXT_MS = 110;

let rafId: number | null = null;
let pressed = new Set<number>();
let stickDir: Dir | null = null;
let held: { dir: Dir; nextAt: number } | null = null;
let usedOnce = false;

const pads = (): Gamepad[] => {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return [];
  try {
    return [...navigator.getGamepads()].filter((p): p is Gamepad => p !== null);
  } catch {
    return [];
  }
};
const visible = () => typeof document !== 'undefined' && document.visibilityState === 'visible';

function act(action: NavAction): void {
  setInput('gamepad');
  if (!usedOnce) {
    usedOnce = true;
    track({ type: 'gamepad-used' });
  }
  const active = document.activeElement;
  if (isTextField(active)) {
    // El mando no escribe: B sale del campo sin Atrás; A solo enfoca.
    if (action === 'back') { leaveField(); return; }
    if (action === 'accept') { active.focus(); return; }
  }
  dispatch(action, 'gamepad');
}

/** Stick izquierdo con histéresis: activa con |v| > 0.5 y se suelta con |v| < 0.3. */
function readStick(all: Gamepad[]): Dir | null {
  let x = 0;
  let y = 0;
  for (const p of all) {
    const ax = p.axes[0] ?? 0;
    const ay = p.axes[1] ?? 0;
    if (Math.abs(ax) > Math.abs(x)) x = ax;
    if (Math.abs(ay) > Math.abs(y)) y = ay;
  }
  if (stickDir !== null) {
    const magnitude = stickDir === 'left' || stickDir === 'right' ? Math.abs(x) : Math.abs(y);
    if (magnitude >= STICK_OFF) return stickDir;
  }
  if (Math.abs(x) <= STICK_ON && Math.abs(y) <= STICK_ON) return null;
  return Math.abs(x) >= Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
}

function poll(now: number): void {
  rafId = null;
  const all = pads();
  if (all.length === 0 || !visible()) { stopLoop(); return; }

  const down = new Set<number>();
  for (const p of all) {
    p.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.5) down.add(i); });
  }
  for (const i of down) {
    const action = BUTTONS[i];
    if (action && !pressed.has(i)) act(action);          // flanco de subida
  }
  pressed = down;

  stickDir = readStick(all);
  const dpad = DPAD.find(([i]) => down.has(i))?.[1] ?? null;
  const dir = dpad ?? stickDir;
  if (dir === null) {
    held = null;
  } else if (!held || held.dir !== dir) {
    held = { dir, nextAt: now + REPEAT_FIRST_MS };
    act(dir);
  } else if (now >= held.nextAt) {
    held = { dir, nextAt: now + REPEAT_NEXT_MS };
    act(dir);
  }
  rafId = requestAnimationFrame(poll);
}

function ensureLoop(): void {
  if (rafId !== null || pads().length === 0 || !visible()) return;   // arrancar dos veces no tiene efecto
  rafId = requestAnimationFrame(poll);
}

function stopLoop(): void {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  pressed = new Set();
  stickDir = null;
  held = null;                                           // la repetición se corta
}

function announce(text: string): void {
  enqueueToast({ kind: 'info', text, icon: 'mando' });
  addNotification({ kind: 'gamepad', title: text });
}

/** Registra los eventos y comprueba una vez si ya hay mando (arranca en silencio). Devuelve la limpieza. */
export function startGamepad(): () => void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return () => {};
  }
  const onConnected = () => {                            // no lee event.gamepad: solo navigator.getGamepads()
    announce(es.notif.gamepadConnected);
    ensureLoop();
  };
  const onDisconnected = () => {
    announce(es.notif.gamepadDisconnected);
    if (pads().length === 0) stopLoop();
    else held = null;
  };
  const onVisibility = () => { if (visible()) ensureLoop(); else stopLoop(); };
  window.addEventListener('gamepadconnected', onConnected);
  window.addEventListener('gamepaddisconnected', onDisconnected);
  document.addEventListener('visibilitychange', onVisibility);
  ensureLoop();
  return () => {
    window.removeEventListener('gamepadconnected', onConnected);
    window.removeEventListener('gamepaddisconnected', onDisconnected);
    document.removeEventListener('visibilitychange', onVisibility);
    stopLoop();
  };
}
