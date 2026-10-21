import { RESOURCES, type ResourceKey } from './resources';

// api/urls.ts
export const BASE_URL = 'https://pokeapi.co/api/v2/';
const NUM_RE = /^-?\d{1,6}$/;
/** IDs de la API: enteros en [-1, 999999]. -1 y 0 existen en move-ailment y move-category. */
export function parseApiId(s: string): number | null {
  if (!NUM_RE.test(s)) return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= -1 && n <= 999_999 ? n + 0 : null;   // + 0 convierte -0 en 0
}
const RES_URL_RE = /^https:\/\/pokeapi\.co\/api\/v2\/([a-z-]+)\/(-?\d{1,6})\/?$/;
export function parseResourceUrl(url: string): { resource: ResourceKey; id: number } | null {
  const m = RES_URL_RE.exec(url);
  if (!m || !Object.hasOwn(RESOURCES, m[1]!)) return null;
  const id = parseApiId(m[2]!);
  return id === null ? null : { resource: m[1] as ResourceKey, id };
}
const ENC_URL_RE = /^https:\/\/pokeapi\.co\/api\/v2\/pokemon\/(\d{1,6})\/encounters\/?$/;
/** URL de pokemon.location_area_encounters → ID del Pokémon, o null. */
export function parseEncountersUrl(url: string): number | null {
  const m = ENC_URL_RE.exec(url);
  return m ? parseApiId(m[1]!) : null;
}
export type IdOrName = { kind: 'id'; value: number } | { kind: 'slug'; value: string };
export function validateIdOrName(v: string | number): IdOrName | null {
  const s = String(v).trim().toLowerCase();
  if (/^-?\d+$/.test(s)) { const n = parseApiId(s); return n === null ? null : { kind: 'id', value: n }; }
  return /^[a-z0-9-]{1,100}$/.test(s) ? { kind: 'slug', value: s } : null;  // "10-000-000-volt-thunderbolt" es slug
}
/** Forma canónica para rutas, claves de caché y queryKey: String(n) o el slug. */
export const canonicalIdOrName = (x: IdOrName) => (x.kind === 'id' ? String(x.value) : x.value);

const LIST_PATH_RE = /^\/api\/v2\/([a-z-]+)\/?$/;
const INT_RE = /^\d{1,6}$/;
/**
 * Enlace `next`/`previous` de una lista → `{resource, limit, offset}`, o null.
 * Exige el prefijo exacto BASE_URL, una clave de RESOURCES como único segmento y
 * `limit` (1–100000) y `offset` (≥ 0) enteros. Los parámetros pueden venir en cualquier
 * orden (la API en vivo devuelve `?offset=…&limit=…`), pero no se admite ningún otro.
 */
export function parseListUrl(url: string): { resource: ResourceKey; limit: number; offset: number } | null {
  if (!url.startsWith(BASE_URL)) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.origin !== 'https://pokeapi.co' || u.hash !== '' || u.username !== '' || u.password !== '') return null;
  const m = LIST_PATH_RE.exec(u.pathname);
  if (!m || !Object.hasOwn(RESOURCES, m[1]!)) return null;
  const keys = [...u.searchParams.keys()];
  if (keys.length !== 2 || !u.searchParams.has('limit') || !u.searchParams.has('offset')) return null;
  const l = u.searchParams.get('limit')!;
  const o = u.searchParams.get('offset')!;
  if (!INT_RE.test(l) || !INT_RE.test(o)) return null;
  const limit = Number(l);
  const offset = Number(o);
  if (limit < 1 || limit > 100_000) return null;
  return { resource: m[1] as ResourceKey, limit, offset };
}
