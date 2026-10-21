// Pokémon creados (§9, §13.10, §19): store 'pbx1:created' v1, ≤ 200, IDs únicos en [1026, 9999].
import { es } from '../i18n/es';
import { track } from './achievements';
import { addNotification } from './notifications';
import { persistedStore } from './persist';
import { isSlug, isValidCreatedNameFormat, slugifyName } from './validation';

export interface CreatedPokemon {
  id: number;
  name: string;
  slug: string;
  color: string;
  types: [string] | [string, string];
  eggGroups: [string] | [string, string];
  habitat: string;
  /** Fecha ISO. */
  createdAt: string;
}
/** Datos del formulario ya validados (§19); el ID y el slug los pone `addCreated`. */
export interface CreatedInput {
  name: string;
  color: string;
  types: [string] | [string, string];
  eggGroups: [string] | [string, string];
  habitat: string;
}

export const MAX_CREATED = 200;
export const CREATED_MIN_ID = 1026;
export const CREATED_MAX_ID = 9999;
const MAX_ID_ATTEMPTS = 100;

function pairOf(v: unknown): [string] | [string, string] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > 2 || !v.every(isSlug)) return null;
  if (v.length === 2 && v[0] === v[1]) return null;
  return v.length === 1 ? [v[0] as string] : [v[0] as string, v[1] as string];
}

/** Valida un elemento guardado (los inválidos se descartan uno a uno). */
export function validateCreatedItem(raw: unknown): CreatedPokemon | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = r.id;
  if (typeof id !== 'number' || !Number.isInteger(id) || id < CREATED_MIN_ID || id > CREATED_MAX_ID) return null;
  if (!isValidCreatedNameFormat(r.name)) return null;
  const slug = slugifyName(r.name);
  if (r.slug !== slug) return null;
  const types = pairOf(r.types);
  const eggGroups = pairOf(r.eggGroups);
  if (!types || !eggGroups || !isSlug(r.color) || !isSlug(r.habitat)) return null;
  if (typeof r.createdAt !== 'string' || Number.isNaN(Date.parse(r.createdAt))) return null;
  return { id, name: r.name, slug, color: r.color, types, eggGroups, habitat: r.habitat, createdAt: r.createdAt };
}

export function validateCreatedList(raw: unknown): CreatedPokemon[] | null {
  if (!Array.isArray(raw)) return null;
  const out: CreatedPokemon[] = [];
  const ids = new Set<number>();
  const slugs = new Set<string>();
  for (const item of raw) {
    const p = validateCreatedItem(item);
    if (!p || ids.has(p.id) || slugs.has(p.slug) || out.length >= MAX_CREATED) continue;
    ids.add(p.id);
    slugs.add(p.slug);
    out.push(p);
  }
  return out;
}

export const created = persistedStore<CreatedPokemon[]>({
  key: 'pbx1:created',
  version: 1,
  defaults: [],
  validate: validateCreatedList,
});

/** ID libre al azar en [1026, 9999] (≤ 100 intentos); null si no lo encuentra. */
export function pickCreatedId(used: ReadonlySet<number>, rng: () => number = Math.random): number | null {
  const span = CREATED_MAX_ID - CREATED_MIN_ID + 1;
  for (let i = 0; i < MAX_ID_ATTEMPTS; i++) {
    const id = CREATED_MIN_ID + Math.min(span - 1, Math.floor(rng() * span));
    if (!used.has(id)) return id;
  }
  return null;
}

export type AddCreatedResult = { ok: true; pokemon: CreatedPokemon } | { ok: false; error: string };

/**
 * Guarda un Pokémon creado. Único punto de disparo de `pokemon-created` y de la notificación
 * "Pokémon creado: X (#1234)" (§13.10).
 */
export function addCreated(input: CreatedInput, rng: () => number = Math.random, now: number = Date.now()): AddCreatedResult {
  const list = created.get();
  if (list.length >= MAX_CREATED) return { ok: false, error: es.validation.createdFull };
  const id = pickCreatedId(new Set(list.map((p) => p.id)), rng);
  if (id === null) return { ok: false, error: es.validation.createdFull };
  const pokemon = validateCreatedItem({
    ...input,
    id,
    slug: slugifyName(input.name),
    createdAt: new Date(now).toISOString(),
  });
  if (!pokemon || list.some((p) => p.slug === pokemon.slug)) return { ok: false, error: es.validation.spelling };
  created.set([...list, pokemon]);
  track({ type: 'pokemon-created' });
  addNotification({ kind: 'info', title: es.notif.created(pokemon.name, pokemon.id) });
  return { ok: true, pokemon };
}

export function removeCreated(id: number): void {
  created.set((list) => (list.some((p) => p.id === id) ? list.filter((p) => p.id !== id) : list));
}

export function clearCreated(): void {
  created.set([]);
}

export const findCreated = (id: number): CreatedPokemon | undefined => created.get().find((p) => p.id === id);
