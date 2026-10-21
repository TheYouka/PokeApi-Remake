// Ajustes (§9, §10.1): store 'pbx1:settings' v1 validado campo a campo. Sin DOM al importar:
// aplicar tema y acento a <html> lo hace main.tsx suscrito a este store.
import type { KeyValueStorage } from '../api/storage';
import { es } from '../i18n/es';
import * as achievements from './achievements';
import { persistedStore, type PersistedStore } from './persist';
import { validateAvatarId, validateGamertag } from './validation';

// ------------------------------------------------------------------ idiomas de datos

export const KNOWN_LANGS = ['ja-hrkt', 'ja-roma', 'ko', 'zh-hant', 'fr', 'de', 'es', 'it', 'en',
  'cs', 'ja', 'zh-hans', 'pt-br', 'es-419'] as const;
export type KnownLang = (typeof KNOWN_LANGS)[number];
export const isKnownLang = (c: string): c is KnownLang => (KNOWN_LANGS as readonly string[]).includes(c);

// ------------------------------------------------------------------ acento y contraste

export const ACCENT_PALETTE = ['#107C10', '#0063B1', '#744DA9', '#C50F1F', '#C2410C',
  '#BF0077', '#037A7E', '#4C4A48', '#F2C811', '#7FBA00'] as const;
export type AccentHex = (typeof ACCENT_PALETTE)[number];
export const DEFAULT_ACCENT: AccentHex = '#107C10';
/** Muestras con su nombre en español (Ajustes y Guía). */
export const ACCENT_SWATCHES: readonly { hex: AccentHex; name: string }[] =
  ACCENT_PALETTE.map((hex) => ({ hex, name: es.settings.accentNames[hex] }));
export const isAccent = (v: string): v is AccentHex => (ACCENT_PALETTE as readonly string[]).includes(v);

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Luminancia relativa WCAG 2.x de un color #RRGGBB. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Contraste WCAG entre dos colores (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Texto sobre el acento: blanco si su contraste es ≥ 4.5; si no, negro. */
export const onAccent = (hex: string): '#FFFFFF' | '#000000' => (contrastRatio('#FFFFFF', hex) >= 4.5 ? '#FFFFFF' : '#000000');

// ------------------------------------------------------------------ store

export type Theme = 'dark' | 'light';
export type Avatar = 'default' | { pokemonId: number };
export interface Settings {
  theme: Theme;
  accent: AccentHex;
  sfx: boolean;
  reduceMotion: boolean;
  dataLang: KnownLang;
  gamertag: string;
  avatar: Avatar;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: DEFAULT_ACCENT,
  sfx: true,
  reduceMotion: false,
  dataLang: 'es',
  gamertag: 'Entrenador',
  avatar: 'default',
};
export const SETTINGS_KEY = 'pbx1:settings';
export const SETTINGS_VERSION = 1;

/** Validación campo a campo: un campo inválido vuelve a su valor por defecto sin tocar los demás. */
export function validateSettings(raw: unknown): Settings | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const accent = typeof r.accent === 'string' ? r.accent.toUpperCase() : '';
  const tag = typeof r.gamertag === 'string' ? validateGamertag(r.gamertag) : null;
  let avatar: Avatar = d.avatar;
  if (typeof r.avatar === 'object' && r.avatar !== null) {
    const id = validateAvatarId((r.avatar as { pokemonId?: unknown }).pokemonId);
    if (id !== null) avatar = { pokemonId: id };
  }
  return {
    theme: r.theme === 'dark' || r.theme === 'light' ? r.theme : d.theme,
    accent: isAccent(accent) ? accent : d.accent,
    sfx: typeof r.sfx === 'boolean' ? r.sfx : d.sfx,
    reduceMotion: typeof r.reduceMotion === 'boolean' ? r.reduceMotion : d.reduceMotion,
    dataLang: typeof r.dataLang === 'string' && isKnownLang(r.dataLang) ? r.dataLang : d.dataLang,
    gamertag: tag && tag.ok ? tag.value : d.gamertag,
    avatar,
  };
}

/** Fábrica (los tests le inyectan memoryStorage()). */
export function createSettingsStore(storage?: KeyValueStorage | null): PersistedStore<Settings> {
  return persistedStore<Settings>({
    key: SETTINGS_KEY,
    version: SETTINGS_VERSION,
    defaults: DEFAULT_SETTINGS,
    validate: validateSettings,
    ...(storage === undefined ? {} : { storage }),
  });
}

export const settings = createSettingsStore();

// ------------------------------------------------------------------ setters

// Único punto de disparo de "A mi estilo" (§9).
export function setAccent(hex: string): void {
  const next = hex.toUpperCase();
  if (!(ACCENT_PALETTE as readonly string[]).includes(next)) return;  // fuera de la paleta (§10.1): se ignora
  if (settings.get().accent === next) return;          // mismo valor: ni escritura ni evento
  settings.set(s => ({ ...s, accent: next as AccentHex }));
  achievements.track({ type: 'accent-changed' });      // "A mi estilo"
}
// Único punto de disparo de "Políglota" (§9).
export function setDataLang(code: string): void {
  if (!isKnownLang(code)) return;                       // ∉ KNOWN_LANGS: se ignora
  if (settings.get().dataLang === code) return;
  settings.set(s => ({ ...s, dataLang: code }));
  achievements.track({ type: 'data-language-changed' }); // "Políglota"
}

export function setTheme(theme: Theme): void {
  if (theme !== 'dark' && theme !== 'light') return;
  if (settings.get().theme === theme) return;
  settings.set((s) => ({ ...s, theme }));
}
export function setSfx(on: boolean): void {
  if (settings.get().sfx === on) return;
  settings.set((s) => ({ ...s, sfx: on }));
}
export function setReduceMotion(on: boolean): void {
  if (settings.get().reduceMotion === on) return;
  settings.set((s) => ({ ...s, reduceMotion: on }));
}
/** Valida con la regla de §19; si es inválido el store no cambia. */
export function setGamertag(value: string): { ok: true } | { error: string } {
  const r = validateGamertag(value);
  if (!r.ok) return { error: r.error };
  if (settings.get().gamertag !== r.value) settings.set((s) => ({ ...s, gamertag: r.value }));
  return { ok: true };
}
export function setAvatar(avatar: Avatar): { ok: true } | { error: string } {
  if (avatar === 'default') {
    if (settings.get().avatar !== 'default') settings.set((s) => ({ ...s, avatar: 'default' }));
    return { ok: true };
  }
  const id = validateAvatarId(avatar.pokemonId);
  if (id === null) return { error: es.validation.avatar };
  const cur = settings.get().avatar;
  if (cur === 'default' || cur.pokemonId !== id) settings.set((s) => ({ ...s, avatar: { pokemonId: id } }));
  return { ok: true };
}
