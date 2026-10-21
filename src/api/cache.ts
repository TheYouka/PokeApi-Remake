import { onPageHide, scheduleIdle } from './env';
import type { KeyValueStorage } from './storage';

// Claves (§4.5): datos en `pbx1:c1:d:<ruta>` = "<savedAtMs>\n<texto JSON tal cual>", índice en `pbx1:c1:i`.
export const CACHE_PREFIX = 'pbx1:c1:';
const DATA_PREFIX = `${CACHE_PREFIX}d:`;
const INDEX_KEY = `${CACHE_PREFIX}i`;
const SCHEMA_RE = /^pbx1:c(\d+):/;

export const CACHE_BUDGET_CHARS = 2_500_000;
export const CACHE_MAX_ENTRY_CHARS = 400_000;
export const CACHE_LOW_MAX_CHARS = 20_000;
const INDEX_INTERVAL_MS = 2_000;

export interface CacheEntry { savedAt: number; text: string }

export interface PersistentCacheOptions {
  budgetChars?: number;
  maxEntryChars?: number;
  now?: () => number;
  /** Planificador de las escrituras diferidas (por defecto `scheduleIdle`). */
  schedule?: (fn: () => void) => void;
  onDisabled?: (reason: 'quota' | 'unavailable') => void;
}

export interface PersistentCache {
  /** Lectura tolerante: una entrada con formato inesperado se borra y devuelve null. */
  get(path: string): CacheEntry | null;
  /** Escritura diferida. Solo persiste si `priority === 'high' || chars <= 20_000` y cabe en el tope por entrada. */
  put(path: string, text: string, o: { priority: 'high' | 'low' }): void;
  remove(path: string): void;
  getAlias(namePath: string): string | null;
  setAlias(namePath: string, idPath: string): void;
  /** Ejecuta ya las escrituras pendientes y el índice (también en `pagehide`). */
  flush(): void;
  /** Borra todas las claves `pbx1:c1:*`. */
  clear(): void;
  stats(): { entries: number; chars: number; enabled: boolean };
}

interface IndexJson { v: 1; e: Record<string, [number, number]>; a: Record<string, string> }

const isQuotaError = (e: unknown): boolean => {
  if (typeof e !== 'object' || e === null) return false;
  const x = e as { name?: unknown; code?: unknown };
  return x.name === 'QuotaExceededError' || x.name === 'NS_ERROR_DOM_QUOTA_REACHED' || x.code === 22;
};

const isPair = (x: unknown): x is [number, number] =>
  Array.isArray(x) && x.length === 2 && Number.isFinite(x[0]) && Number.isFinite(x[1]);

function parseIndex(raw: string | null): IndexJson | null {
  if (raw === null) return null;
  try {
    const j: unknown = JSON.parse(raw);
    if (typeof j !== 'object' || j === null) return null;
    const o = j as { v?: unknown; e?: unknown; a?: unknown };
    if (o.v !== 1 || typeof o.e !== 'object' || o.e === null || typeof o.a !== 'object' || o.a === null) return null;
    for (const val of Object.values(o.e)) if (!isPair(val)) return null;
    for (const val of Object.values(o.a)) if (typeof val !== 'string') return null;
    return o as IndexJson;
  } catch {
    return null;
  }
}

function parseValue(value: string): CacheEntry | null {
  const nl = value.indexOf('\n');
  if (nl < 1) return null;
  const head = value.slice(0, nl);
  if (!/^\d+$/.test(head)) return null;
  const savedAt = Number(head);
  const text = value.slice(nl + 1);
  if (!Number.isFinite(savedAt) || text.length === 0) return null;
  return { savedAt, text };
}

function listKeys(storage: KeyValueStorage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k !== null) keys.push(k);
  }
  return keys;
}

/** Caché persistente con LRU, presupuesto, tope por entrada y gestión de cuota (§4.5). */
export function createPersistentCache(storage: KeyValueStorage, opts: PersistentCacheOptions = {}): PersistentCache {
  const budget = opts.budgetChars ?? CACHE_BUDGET_CHARS;
  const maxEntry = opts.maxEntryChars ?? CACHE_MAX_ENTRY_CHARS;
  const now = opts.now ?? Date.now;
  const schedule = opts.schedule ?? scheduleIdle;

  /** ruta → [lastAccessMs, chars (clave + valor)] */
  const entries = new Map<string, [number, number]>();
  const aliases = new Map<string, string>();
  const pending = new Map<string, string>();
  let enabled = true;
  let flushScheduled = false;
  let indexDirty = false;
  let indexTimer: ReturnType<typeof setTimeout> | null = null;
  let lastIndexWrite = Number.NEGATIVE_INFINITY;

  const disable = (reason: 'quota' | 'unavailable') => {
    if (!enabled) return;
    enabled = false;
    pending.clear();
    opts.onDisabled?.(reason);
  };

  const totalChars = () => {
    let t = 0;
    for (const [, c] of entries.values()) t += c;
    return t;
  };

  const evict = (path: string) => {
    entries.delete(path);
    try { storage.removeItem(DATA_PREFIX + path); } catch { /* tolerante */ }
    indexDirty = true;
  };

  /** Rutas de la más antigua a la más reciente (por lastAccess). */
  const byAge = (exclude: string | null) =>
    [...entries.entries()].filter(([p]) => p !== exclude).sort((a, b) => a[1][0] - b[1][0]).map(([p]) => p);

  const evictOldestQuarter = (exclude: string | null) => {
    const order = byAge(exclude);
    const n = Math.ceil(order.length * 0.25);
    for (const p of order.slice(0, n)) evict(p);
  };

  /** setItem con la regla de cuota: desalojo del 25 % y un reintento; si vuelve a fallar, se desactiva. */
  const setWithRetry = (key: string, value: string, exclude: string | null): boolean => {
    try {
      storage.setItem(key, value);
      return true;
    } catch (e) {
      if (!isQuotaError(e)) return false;
    }
    evictOldestQuarter(exclude);
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      disable('quota');
      return false;
    }
  };

  const writeIndex = () => {
    if (indexTimer !== null) { clearTimeout(indexTimer); indexTimer = null; }
    if (!enabled || !indexDirty) return;
    indexDirty = false;
    lastIndexWrite = now();
    const json: IndexJson = { v: 1, e: Object.fromEntries(entries), a: Object.fromEntries(aliases) };
    setWithRetry(INDEX_KEY, JSON.stringify(json), null);
  };

  const markIndexDirty = () => {
    indexDirty = true;
    if (indexTimer !== null || !enabled) return;
    const wait = Math.max(0, lastIndexWrite + INDEX_INTERVAL_MS - now());
    indexTimer = setTimeout(() => { indexTimer = null; writeIndex(); }, wait);
    // En Node, que el temporizador del índice no retenga el proceso.
    (indexTimer as unknown as { unref?: () => void }).unref?.();
  };

  const writeData = (path: string, value: string) => {
    if (!enabled) return;
    const key = DATA_PREFIX + path;
    const chars = key.length + value.length;
    if (chars > budget) return;
    let total = totalChars() - (entries.get(path)?.[1] ?? 0);
    for (const victim of byAge(path)) {
      if (total + chars <= budget) break;
      total -= entries.get(victim)?.[1] ?? 0;
      evict(victim);
    }
    if (!setWithRetry(key, value, path)) return;
    entries.set(path, [now(), chars]);
    markIndexDirty();
  };

  const flushData = () => {
    flushScheduled = false;
    const batch = [...pending.entries()];
    pending.clear();
    for (const [path, value] of batch) writeData(path, value);
  };

  // ---- arranque: limpiar otros esquemas, cargar o reconstruir el índice, reconciliar con los datos
  try {
    const keys = listKeys(storage);
    for (const k of keys) {
      const m = SCHEMA_RE.exec(k);
      if (m && m[1] !== '1') storage.removeItem(k);
    }
    const idx = parseIndex(storage.getItem(INDEX_KEY));
    if (idx === null && storage.getItem(INDEX_KEY) !== null) indexDirty = true;
    const dataKeys = new Set(keys.filter((k) => k.startsWith(DATA_PREFIX)));
    if (idx) {
      for (const [p, pair] of Object.entries(idx.e)) {
        if (dataKeys.has(DATA_PREFIX + p)) entries.set(p, [pair[0], pair[1]]);
        else indexDirty = true;
      }
      for (const [n, p] of Object.entries(idx.a)) aliases.set(n, p);
    }
    for (const k of dataKeys) {
      const p = k.slice(DATA_PREFIX.length);
      if (entries.has(p)) continue;
      const value = storage.getItem(k);
      const parsed = value === null ? null : parseValue(value);
      if (value === null || parsed === null) { storage.removeItem(k); continue; }
      entries.set(p, [parsed.savedAt, k.length + value.length]);
      indexDirty = true;
    }
  } catch {
    disable('unavailable');
  }
  if (indexDirty) markIndexDirty();
  onPageHide(() => cache.flush());

  const cache: PersistentCache = {
    get(path) {
      const queued = pending.get(path);
      if (queued !== undefined) return parseValue(queued);
      let value: string | null;
      try { value = storage.getItem(DATA_PREFIX + path); } catch { return null; }
      if (value === null) {
        if (entries.has(path)) { entries.delete(path); markIndexDirty(); }
        return null;
      }
      const parsed = parseValue(value);
      if (parsed === null) {
        cache.remove(path);
        return null;
      }
      const meta = entries.get(path);
      if (meta) meta[0] = now();
      else entries.set(path, [now(), DATA_PREFIX.length + path.length + value.length]);
      markIndexDirty();
      return parsed;
    },
    put(path, text, { priority }) {
      if (!enabled) return;
      if (text.length > maxEntry) return;
      if (!(priority === 'high' || text.length <= CACHE_LOW_MAX_CHARS)) return;
      pending.set(path, `${now()}\n${text}`);
      if (!flushScheduled) {
        flushScheduled = true;
        schedule(flushData);
      }
    },
    remove(path) {
      pending.delete(path);
      try { storage.removeItem(DATA_PREFIX + path); } catch { /* tolerante */ }
      if (entries.delete(path)) markIndexDirty();
    },
    getAlias: (namePath) => aliases.get(namePath) ?? null,
    setAlias(namePath, idPath) {
      if (aliases.get(namePath) === idPath) return;
      aliases.set(namePath, idPath);
      if (enabled) markIndexDirty();
    },
    flush() {
      if (pending.size > 0) flushData();
      writeIndex();
    },
    clear() {
      pending.clear();
      entries.clear();
      aliases.clear();
      indexDirty = false;
      if (indexTimer !== null) { clearTimeout(indexTimer); indexTimer = null; }
      try {
        for (const k of listKeys(storage)) if (k.startsWith(CACHE_PREFIX)) storage.removeItem(k);
      } catch { /* tolerante */ }
    },
    stats: () => ({ entries: entries.size, chars: totalChars(), enabled }),
  };
  return cache;
}
