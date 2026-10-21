// Logros (§10.10): store 'pbx1:ach' v1, reductor puro e idempotente, track y trackVisit.
import { RESOURCE_KEYS, RESOURCES, type ResourceKey } from '../api/resources';
import { es } from '../i18n/es';
import { ACH_TARGETS, achievementInfo, isAchId, pointsOf, type AchId } from './achievementCatalog';
import { addNotification } from './notifications';
import { persistedStore } from './persist';
import { enqueueToast } from './toasts';

export type AchEvent =
  | { type: 'boot-complete' }
  | { type: 'pokemon-viewed'; id: number }
  | { type: 'type-chart-opened' }
  | { type: 'region-viewed'; name: string; total: number }
  | { type: 'compare-used' }
  | { type: 'quick-play' }
  | { type: 'shiny-toggled' }
  | { type: 'cry-played' }
  | { type: 'branched-chain-opened' }
  | { type: 'berry-viewed'; name: string }
  | { type: 'item-viewed'; name: string }
  | { type: 'move-viewed'; name: string }
  | { type: 'data-language-changed' }
  | { type: 'accent-changed' }
  | { type: 'gamepad-used' }
  | { type: 'retro-opened' }
  | { type: 'resource-list-visited'; resource: ResourceKey }
  | { type: 'pokemon-created' }
  | { type: 'stats-opened' }
  | { type: 'guide-opened' };

export interface AchCounters {
  pokemonSeen: number[];      // ≤ 60
  regionsSeen: string[];      // ≤ 64
  berriesSeen: string[];      // ≤ 20
  itemsSeen: string[];        // ≤ 20
  movesSeen: string[];        // ≤ 20
  quickPlays: number;         // ≤ 1000
  listsVisited: ResourceKey[]; // ≤ 50 (claves de RESOURCES)
}
export interface AchState {
  /** id → fecha ISO de desbloqueo. */
  unlocked: Partial<Record<AchId, string>>;
  counters: AchCounters;
}

export const LIMITS = { pokemonSeen: 60, regionsSeen: 64, namesSeen: 20, quickPlays: 1000 } as const;

export const emptyAchState = (): AchState => ({
  unlocked: {},
  counters: { pokemonSeen: [], regionsSeen: [], berriesSeen: [], itemsSeen: [], movesSeen: [], quickPlays: 0, listsVisited: [] },
});

/** Añade a un conjunto acotado; devuelve el mismo array si no cambia. */
function addToSet<T>(list: T[], v: T, max: number): T[] {
  if (list.includes(v) || list.length >= max) return list;
  return [...list, v];
}

const SIMPLE_UNLOCKS: Partial<Record<AchEvent['type'], AchId>> = {
  'boot-complete': 'primer-encendido',
  'type-chart-opened': 'maestro-tipos',
  'compare-used': 'rivales',
  'shiny-toggled': 'brillante',
  'cry-played': 'melomano',
  'branched-chain-opened': 'eeveelucion',
  'data-language-changed': 'poliglota',
  'accent-changed': 'a-mi-estilo',
  'gamepad-used': 'mando-en-mano',
  'retro-opened': 'nostalgia',
  'pokemon-created': 'creador',
  'stats-opened': 'analista',
  'guide-opened': 'guia-bolsillo',
};

/**
 * Reductor PURO e idempotente: un logro ya desbloqueado nunca vuelve a aparecer en `unlocked`.
 * Si nada cambia devuelve el mismo objeto `state` (así no se escribe en disco).
 */
export function reduceAchievements(state: AchState, ev: AchEvent, now: Date | number | string): { state: AchState; unlocked: AchId[] } {
  const c = state.counters;
  let counters = c;
  const candidates: AchId[] = [];
  const setCounters = (patch: Partial<AchCounters>) => { counters = { ...counters, ...patch }; };

  switch (ev.type) {
    case 'pokemon-viewed': {
      if (Number.isInteger(ev.id) && ev.id > 0) {
        const next = addToSet(c.pokemonSeen, ev.id, LIMITS.pokemonSeen);
        if (next !== c.pokemonSeen) setCounters({ pokemonSeen: next });
      }
      const n = counters.pokemonSeen.length;
      if (n >= 1) candidates.push('entrenador-novato');
      if (n >= ACH_TARGETS['investigador']!) candidates.push('investigador');
      if (n >= ACH_TARGETS['profesor']!) candidates.push('profesor');
      break;
    }
    case 'region-viewed': {
      if (typeof ev.name === 'string' && ev.name !== '') {
        const next = addToSet(c.regionsSeen, ev.name, LIMITS.regionsSeen);
        if (next !== c.regionsSeen) setCounters({ regionsSeen: next });
      }
      if (ev.total > 0 && counters.regionsSeen.length >= ev.total) candidates.push('trotamundos');
      break;
    }
    case 'quick-play': {
      if (c.quickPlays < LIMITS.quickPlays) setCounters({ quickPlays: c.quickPlays + 1 });
      if (counters.quickPlays >= ACH_TARGETS['golpe-suerte']!) candidates.push('golpe-suerte');
      break;
    }
    case 'berry-viewed':
    case 'item-viewed':
    case 'move-viewed': {
      const field = ev.type === 'berry-viewed' ? 'berriesSeen' : ev.type === 'item-viewed' ? 'itemsSeen' : 'movesSeen';
      const id: AchId = ev.type === 'berry-viewed' ? 'botanico' : ev.type === 'item-viewed' ? 'coleccionista' : 'enciclopedia';
      if (typeof ev.name === 'string' && ev.name !== '') {
        const next = addToSet(c[field], ev.name, LIMITS.namesSeen);
        if (next !== c[field]) setCounters({ [field]: next });
      }
      if (counters[field].length >= ACH_TARGETS[id]!) candidates.push(id);
      break;
    }
    case 'resource-list-visited': {
      if (Object.hasOwn(RESOURCES, ev.resource)) {
        const next = addToSet(c.listsVisited, ev.resource, RESOURCE_KEYS.length);
        if (next !== c.listsVisited) setCounters({ listsVisited: next });
      }
      if (RESOURCE_KEYS.every((k) => counters.listsVisited.includes(k))) candidates.push('explorador-total');
      break;
    }
    default: {
      const id = SIMPLE_UNLOCKS[ev.type];
      if (id) candidates.push(id);
    }
  }

  const newly = candidates.filter((id) => state.unlocked[id] === undefined);
  if (newly.length === 0 && counters === c) return { state, unlocked: [] };
  let unlocked = state.unlocked;
  if (newly.length > 0) {
    const at = new Date(now).toISOString();
    unlocked = { ...unlocked };
    for (const id of newly) unlocked[id] = at;
  }
  return { state: { unlocked, counters }, unlocked: newly };
}

// ------------------------------------------------------------------ lectura tolerante del store

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
function uniqueOf<T>(v: unknown, ok: (x: unknown) => x is T, max: number): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const x of v) if (ok(x) && !out.includes(x) && out.length < max) out.push(x);
  return out;
}
const isPositiveInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0;
const isName = (x: unknown): x is string => typeof x === 'string' && x !== '' && x.length <= 100;
const isResourceKey = (x: unknown): x is ResourceKey => typeof x === 'string' && Object.hasOwn(RESOURCES, x);

/** Valida el contenido guardado; descarta claves desconocidas y acota los contadores. */
export function validateAchState(raw: unknown): AchState | null {
  if (!isObj(raw)) return null;
  const state = emptyAchState();
  if (isObj(raw.unlocked)) {
    for (const [k, v] of Object.entries(raw.unlocked)) {
      if (isAchId(k) && typeof v === 'string' && !Number.isNaN(Date.parse(v))) state.unlocked[k] = v;
    }
  }
  const c = isObj(raw.counters) ? raw.counters : {};
  state.counters = {
    pokemonSeen: uniqueOf(c.pokemonSeen, isPositiveInt, LIMITS.pokemonSeen),
    regionsSeen: uniqueOf(c.regionsSeen, isName, LIMITS.regionsSeen),
    berriesSeen: uniqueOf(c.berriesSeen, isName, LIMITS.namesSeen),
    itemsSeen: uniqueOf(c.itemsSeen, isName, LIMITS.namesSeen),
    movesSeen: uniqueOf(c.movesSeen, isName, LIMITS.namesSeen),
    quickPlays: typeof c.quickPlays === 'number' && Number.isInteger(c.quickPlays) && c.quickPlays >= 0
      ? Math.min(c.quickPlays, LIMITS.quickPlays) : 0,
    listsVisited: uniqueOf(c.listsVisited, isResourceKey, RESOURCE_KEYS.length),
  };
  return state;
}

export const achievements = persistedStore<AchState>({
  key: 'pbx1:ach',
  version: 1,
  defaults: emptyAchState(),
  validate: validateAchState,
});

/** Único punto de entrada de eventos de logro: reduce, persiste y avisa por cada desbloqueo. */
export function track(ev: AchEvent, now: number = Date.now()): AchId[] {
  const prev = achievements.get();
  const r = reduceAchievements(prev, ev, now);
  if (r.state !== prev) achievements.set(r.state);
  for (const id of r.unlocked) {
    const info = achievementInfo(id);
    enqueueToast({ kind: 'achievement', id });
    addNotification({ kind: 'achievement', title: es.ach.toast(info.points), body: info.name }, now);
  }
  return r.unlocked;
}

/** Evento de visita de un detalle genérico: berry/item/move → su evento; el resto, null. */
export function visitEvent(resource: ResourceKey, data: { name?: unknown }): AchEvent | null {
  const name = typeof data.name === 'string' ? data.name : null;
  if (name === null || name === '') return null;
  if (resource === 'berry') return { type: 'berry-viewed', name };
  if (resource === 'item') return { type: 'item-viewed', name };
  if (resource === 'move') return { type: 'move-viewed', name };
  return null;
}

/** Lo llama ResourceDetailScreen tras una carga correcta (§7.2), con la identidad de los datos. */
export function trackVisit(resource: ResourceKey, data: { name?: unknown }): void {
  const ev = visitEvent(resource, data);
  if (ev) track(ev);
}

/** Gamerscore derivado (no se guarda): suma de los G desbloqueados. */
export function gamerscoreOf(state: AchState): number {
  let g = 0;
  for (const id of Object.keys(state.unlocked)) if (isAchId(id)) g += pointsOf(id);
  return g;
}

export const unlockedCountOf = (state: AchState): number => Object.keys(state.unlocked).length;

/** Progreso del contador de un logro (null si no tiene contador). */
export function progressOf(state: AchState, id: AchId): { current: number; target: number } | null {
  const target = ACH_TARGETS[id];
  if (target === undefined) return null;
  const c = state.counters;
  const current =
    id === 'investigador' || id === 'profesor' ? c.pokemonSeen.length
      : id === 'golpe-suerte' ? c.quickPlays
        : id === 'botanico' ? c.berriesSeen.length
          : id === 'coleccionista' ? c.itemsSeen.length
            : id === 'enciclopedia' ? c.movesSeen.length
              : c.listsVisited.length;
  return { current: Math.min(current, target), target };
}

/** Últimos desbloqueados, del más reciente al más antiguo. */
export function recentUnlocks(state: AchState, n: number): { id: AchId; at: string }[] {
  return Object.entries(state.unlocked)
    .filter((e): e is [AchId, string] => isAchId(e[0]) && typeof e[1] === 'string')
    .map(([id, at]) => ({ id, at }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, n);
}

/** "Borrar logros". */
export function resetAchievements(): void {
  achievements.reset();
}
