// Validación de entradas externas (§19). Puro: sin DOM ni almacenamiento.
import { normalizeQuery } from '../data/search';
import { es } from '../i18n/es';

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

const GAMERTAG_RE = /^[\p{L}\p{N} _-]{1,15}$/u;
/** RF-UI-7: se recorta; 1–15 puntos de código; letras (con tilde), números, espacio, `_` y `-`. */
export function validateGamertag(v: string): Validated<string> {
  const value = String(v).trim();
  const length = [...value].length;
  if (length < 1 || length > 15 || !GAMERTAG_RE.test(value)) return { ok: false, error: es.validation.gamertag };
  return { ok: true, value };
}

/** Normalización del nombre de un Pokémon creado: recorte y espacios colapsados. */
export const cleanCreatedName = (name: string): string => String(name).trim().replace(/\s+/g, ' ');
const CREATED_NAME_RE = /^[\p{L}\p{N} .'-]{1,20}$/u;
/** slugify del nombre creado = normalizeQuery (§13.1). */
export const slugifyName = normalizeQuery;

/**
 * Nombre de un Pokémon creado. `existingSlugs` reúne los slugs de `pokemon`, `pokemon-species`
 * y de los otros creados. Formato inválido o slug vacío → "Revise su ortografía";
 * colisión → "Ya existe un Pokémon con ese nombre".
 */
export function validateCreatedName(
  name: string,
  existingSlugs: ReadonlySet<string> | readonly string[],
): Validated<{ name: string; slug: string }> {
  const clean = cleanCreatedName(name);
  if (!CREATED_NAME_RE.test(clean)) return { ok: false, error: es.validation.spelling };
  const slug = slugifyName(clean);
  if (slug === '') return { ok: false, error: es.validation.spelling };
  const taken = existingSlugs instanceof Set ? existingSlugs.has(slug) : (existingSlugs as readonly string[]).includes(slug);
  if (taken) return { ok: false, error: es.validation.nameTaken };
  return { ok: true, value: { name: clean, slug } };
}

/** Formato del nombre creado sin comprobar colisiones (lectura del store). */
export function isValidCreatedNameFormat(name: unknown): name is string {
  return typeof name === 'string' && name === cleanCreatedName(name) && CREATED_NAME_RE.test(name) && slugifyName(name) !== '';
}

const intIn = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,6}$/.test(v.trim()) ? Number(v.trim()) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/** Avatar: número de Pokémon entero 1–1025. */
export const validateAvatarId = (v: unknown): number | null => intIn(v, 1, 1025);

/** Slug genérico de la API (sin comprobar que exista). */
export const isSlug = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9-]{1,100}$/.test(v);

// ------------------------------------------------------------------ parámetros de query (§19)

/** `?gen=` (Pokédex y Estadísticas): entero 1–9 o null (se descarta). */
export const parseGenParam = (v: string | null): number | null => (v === null ? null : intIn(v, 1, 9));

/** `?type=`: 1–2 slugs separados por coma, válidos y distintos; el resto se descarta. */
export function parseTypeParam(v: string | null, validTypes: ReadonlySet<string> | null = null): string[] {
  if (v === null) return [];
  const out: string[] = [];
  for (const part of v.split(',')) {
    const s = part.trim().toLowerCase();
    if (!isSlug(s) || out.includes(s)) continue;
    if (validTypes && !validTypes.has(s)) continue;
    out.push(s);
    if (out.length === 2) break;
  }
  return out;
}

/** `?color=`, `?habitat=`, `?shape=`, `?egg=`: slug ∈ valores válidos (si ya se conocen). */
export function parseSlugParam(v: string | null, valid: ReadonlySet<string> | null = null): string | null {
  if (v === null) return null;
  const s = v.trim().toLowerCase();
  if (!isSlug(s)) return null;
  return valid && !valid.has(s) ? null : s;
}

/** `?forms=1`, `?buscar=1`: solo `'1'` cuenta. */
export const parseFlagParam = (v: string | null): boolean => v === '1';

/** `?boot=`: `'1'`, `'0'` o null. */
export const parseBootParam = (v: string | null): '1' | '0' | null => (v === '1' || v === '0' ? v : null);

/** `?q=` de la Pokédex: normalizado; vacío → null (se elimina). */
export const parseQueryParam = (v: string | null): string | null => {
  if (v === null) return null;
  const q = normalizeQuery(v);
  return q === '' ? null : q;
};

export const SETTINGS_SECTIONS = ['personalizacion', 'sonido', 'accesibilidad', 'idioma', 'perfil', 'datos', 'acerca'] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];
/** `?seccion=`: inválida → Personalización. */
export const parseSettingsSection = (v: string | null): SettingsSection =>
  (SETTINGS_SECTIONS as readonly string[]).includes(v ?? '') ? (v as SettingsSection) : 'personalizacion';

export const POKEMON_TABS = ['resumen', 'movimientos', 'evolucion', 'encuentros', 'formas', 'naturaleza'] as const;
export type PokemonTab = (typeof POKEMON_TABS)[number];
/** `:tab` de la ficha: undefined → resumen; inválida → null (replace a la base). */
export const parsePokemonTab = (v: string | undefined): PokemonTab | null =>
  v === undefined ? 'resumen' : (POKEMON_TABS as readonly string[]).includes(v) ? (v as PokemonTab) : null;

export const HUB_PIVOTS = ['pokedex', 'juegos', 'objetos', 'movimientos', 'mundo', 'bayas'] as const;
export type HubPivot = (typeof HUB_PIVOTS)[number];
/** `:pivot` de `/hub/:pivot`: inválido → null (404). */
export const parseHubPivot = (v: string | undefined): HubPivot | null =>
  (HUB_PIVOTS as readonly string[]).includes(v ?? '') ? (v as HubPivot) : null;
