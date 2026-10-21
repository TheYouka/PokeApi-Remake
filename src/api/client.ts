import { createPersistentCache, type CacheEntry, type PersistentCache } from './cache';
import { isOffline as envIsOffline } from './env';
import { PokeApiError } from './errors';
import { defaultFetch, httpAttempt } from './http';
import { createLimiter, type LimitedTask, type Priority } from './limiter';
import { RESOURCES, type ResourceKey } from './resources';
import type { KeyValueStorage } from './storage';
import type { APIResource, ApiMeta, NamedAPIResource } from './types/common';
import type { ApiIndex, ListMap, LocationAreaEncounter, ResourceMap } from './types/index';
import { BASE_URL, canonicalIdOrName, parseEncountersUrl, parseListUrl, parseResourceUrl, validateIdOrName } from './urls';

export interface RequestOpts { signal?: AbortSignal; priority?: Priority }
export interface PokeApiClientOptions {        // la base es la constante BASE_URL = 'https://pokeapi.co/api/v2/' (no configurable)
  maxConcurrency?: number;          // 6 en navegador (RF-API-5), 4 en smoke (NFR-PERF-5)
  timeoutMs?: number;               // 15000
  maxRetries?: number;              // 2
  persistent?: KeyValueStorage | null; // null por defecto (Node); el navegador inyecta browserLocalStorage()
  freshMs?: number;                 // 7 días: frescura de la caché persistente
  fetchImpl?: typeof fetch;         // globalThis.fetch por defecto (tests inyectan un fake)
  isOffline?: () => boolean;        // por defecto env.isOffline() (onLine === false, protegido con typeof)
  onEvent?: (e: ClientEvent) => void;
}
export type ClientEvent =
  | { type: 'request'; path: string }                    // cada petición real a red (métricas/tests)
  | { type: 'stale-served'; path: string }               // se sirvió caché caducada por fallo de red
  | { type: 'network-failure'; code: 'NETWORK' | 'OFFLINE' | 'TIMEOUT' }
  | { type: 'persist-disabled'; reason: 'quota' | 'unavailable' };

export interface PokeApiClient {
  get<K extends ResourceKey>(resource: K, idOrName: string | number, o?: RequestOpts): Promise<ResourceMap[K]>;
  list<K extends ResourceKey>(resource: K, page?: { limit?: number; offset?: number }, o?: RequestOpts): Promise<ListMap<K>>;
  listAll<K extends ResourceKey>(resource: K, o?: RequestOpts): Promise<ListMap<K>>;
  resolve<K extends ResourceKey>(ref: NamedAPIResource<K> | APIResource<K>, o?: RequestOpts): Promise<ResourceMap[K]>;
  getPokemonEncounters(idOrName: string | number, o?: RequestOpts): Promise<LocationAreaEncounter[]>;
  getMeta(o?: RequestOpts): Promise<ApiMeta>;
  getIndex(o?: RequestOpts): Promise<ApiIndex>;
  clearPersistent(): void;
  persistentStats(): { entries: number; chars: number; enabled: boolean };
}

const LRU_SIZE = 64;
const MAX_NEXT_LINKS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const RESOURCE_PATH_RE = /^([a-z-]+)\/([a-z0-9-]+)$/;

interface ListShape { count: number; next: string | null; previous: string | null; results: unknown[] }
const isListShape = (x: unknown): x is ListShape =>
  typeof x === 'object' && x !== null && Array.isArray((x as { results?: unknown }).results);

export function createPokeApiClient(opts: PokeApiClientOptions = {}): PokeApiClient {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const maxRetries = opts.maxRetries ?? 2;
  const freshMs = opts.freshMs ?? 7 * DAY_MS;
  const fetchImpl = opts.fetchImpl ?? defaultFetch;
  const isOffline = opts.isOffline ?? envIsOffline;
  const emit = (e: ClientEvent) => opts.onEvent?.(e);

  const limiter = createLimiter(opts.maxConcurrency ?? 6);
  const inflight = new Map<string, LimitedTask<unknown>>();
  const lru = new Map<string, unknown>();
  const aliases = new Map<string, string>();

  const persistent = opts.persistent ?? null;
  let cache: PersistentCache | null = null;
  if (persistent === null) {
    emit({ type: 'persist-disabled', reason: 'unavailable' });
  } else {
    cache = createPersistentCache(persistent, { onDisabled: (reason) => emit({ type: 'persist-disabled', reason }) });
  }

  const lruGet = (path: string): { hit: true; value: unknown } | { hit: false } => {
    if (!lru.has(path)) return { hit: false };
    const value = lru.get(path);
    lru.delete(path);
    lru.set(path, value);
    return { hit: true, value };
  };
  const lruSet = (path: string, value: unknown) => {
    lru.delete(path);
    lru.set(path, value);
    while (lru.size > LRU_SIZE) {
      const oldest = lru.keys().next();
      if (oldest.done) break;
      lru.delete(oldest.value);
    }
  };

  const resolveAlias = (path: string) => aliases.get(path) ?? cache?.getAlias(path) ?? path;

  /**
   * Registra los alias nombre↔ID de un recurso con nombre y devuelve la ruta numérica
   * bajo la que se guardan los datos.
   */
  const registerAliases = (path: string, data: unknown): string => {
    const m = RESOURCE_PATH_RE.exec(path);
    if (!m || !Object.hasOwn(RESOURCES, m[1]!)) return path;
    const d = data as { id?: unknown; name?: unknown };
    if (typeof d.id !== 'number' || !Number.isInteger(d.id)) return path;
    const idPath = `${m[1]}/${d.id}`;
    const namePaths = new Set<string>();
    if (path !== idPath) namePaths.add(path);
    if (typeof d.name === 'string' && d.name !== '') namePaths.add(`${m[1]}/${d.name}`);
    namePaths.delete(idPath);
    for (const np of namePaths) {
      aliases.set(np, idPath);
      cache?.setAlias(np, idPath);
    }
    return idPath;
  };

  const parseCached = (path: string, entry: CacheEntry): { ok: true; value: unknown } | { ok: false } => {
    try {
      const value: unknown = JSON.parse(entry.text);
      if (typeof value === 'object' && value !== null) return { ok: true, value };
    } catch { /* entrada corrupta */ }
    cache?.remove(path);
    return { ok: false };
  };

  const isStaleEligible = (e: PokeApiError) =>
    e.code === 'NETWORK' || e.code === 'TIMEOUT' || (e.code === 'HTTP' && (e.status === 429 || (e.status ?? 0) >= 500));

  /** Único punto de acceso a datos: orden de resolución 1–7 de §4.3. */
  function fetchPath<T>(requested: string, o: RequestOpts = {}): Promise<T> {
    const priority: Priority = o.priority ?? 'high';
    // 1. alias nombre → ruta numérica
    const path = resolveAlias(requested);
    // 2. deduplicación en vuelo
    const running = inflight.get(path);
    if (running) return running.join({ priority, signal: o.signal }) as Promise<T>;
    // 3. LRU en memoria (misma referencia)
    const mem = lruGet(path);
    if (mem.hit) return Promise.resolve(mem.value as T);
    // 4. caché persistente fresca
    let stale: CacheEntry | null = null;
    const entry = cache?.get(path) ?? null;
    if (entry) {
      if (Date.now() - entry.savedAt < freshMs) {
        const parsed = parseCached(path, entry);
        if (parsed.ok) {
          lruSet(path, parsed.value);
          return Promise.resolve(parsed.value as T);
        }
      } else {
        stale = entry;
      }
    }
    // 5. sin conexión: caducada o OFFLINE sin tocar la red
    if (isOffline()) {
      if (stale) {
        const parsed = parseCached(path, stale);
        if (parsed.ok) {
          emit({ type: 'stale-served', path });
          lruSet(path, parsed.value);
          return Promise.resolve(parsed.value as T);
        }
      }
      emit({ type: 'network-failure', code: 'OFFLINE' });
      return Promise.reject(new PokeApiError('OFFLINE', path));
    }
    // 6. red a través del limitador
    const url = BASE_URL + path;
    let task: LimitedTask<unknown> | null = null;
    const created = limiter.enqueue<unknown>(async (n) => {
      emit({ type: 'request', path });
      const r = await httpAttempt(url, path, n, { fetchImpl, timeoutMs, maxRetries, isOffline });
      if ('ok' in r) {
        const idPath = registerAliases(path, r.ok.data);
        lruSet(idPath, r.ok.data);
        cache?.put(idPath, r.ok.text, { priority: task?.priority ?? priority });
        return { ok: r.ok.data };
      }
      if ('fail' in r) {
        const e = r.fail;
        if (e.code === 'NETWORK' || e.code === 'OFFLINE' || e.code === 'TIMEOUT') {
          emit({ type: 'network-failure', code: e.code });
        }
        // 7. stale-if-error
        if (stale && isStaleEligible(e)) {
          const parsed = parseCached(path, stale);
          if (parsed.ok) {
            emit({ type: 'stale-served', path });
            lruSet(path, parsed.value);
            return { ok: parsed.value };
          }
        }
      }
      return r;
    }, priority);
    task = created;
    inflight.set(path, created);
    void created.settled.then(() => {
      if (inflight.get(path) === created) inflight.delete(path);
    });
    return created.join({ priority, signal: o.signal }) as Promise<T>;
  }

  const invalid = (path: string) => Promise.reject(new PokeApiError('INVALID_PARAM', path));
  const isResource = (r: string): r is ResourceKey => Object.hasOwn(RESOURCES, r);
  const isIntIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

  const client: PokeApiClient = {
    get<K extends ResourceKey>(resource: K, idOrName: string | number, o?: RequestOpts) {
      if (!isResource(resource)) return invalid(`${String(resource)}/${String(idOrName)}`);
      const v = validateIdOrName(idOrName);
      if (!v) return invalid(`${resource}/${String(idOrName)}`);
      return fetchPath<ResourceMap[K]>(`${resource}/${canonicalIdOrName(v)}`, o);
    },

    list<K extends ResourceKey>(resource: K, page: { limit?: number; offset?: number } = {}, o?: RequestOpts) {
      const limit = page.limit ?? 20;
      const offset = page.offset ?? 0;
      const path = `${resource}?limit=${limit}&offset=${offset}`;
      if (!isResource(resource) || !isIntIn(limit, 1, 100_000) || !isIntIn(offset, 0, Number.MAX_SAFE_INTEGER)) {
        return invalid(path);
      }
      return fetchPath<ListMap<K>>(path, o);
    },

    async listAll<K extends ResourceKey>(resource: K, o?: RequestOpts) {
      if (!isResource(resource)) throw new PokeApiError('INVALID_PARAM', String(resource));
      const firstPath = `${resource}?limit=100000&offset=0`;
      const first = await fetchPath<unknown>(firstPath, o);
      if (!isListShape(first)) throw new PokeApiError('PARSE', firstPath);
      if (first.next === null) return first as unknown as ListMap<K>;
      const results = [...first.results];
      let next: string | null = first.next;
      for (let i = 0; next !== null; i++) {
        if (i >= MAX_NEXT_LINKS) throw new PokeApiError('PARSE', firstPath);
        const p = parseListUrl(next);
        if (!p || p.resource !== resource) throw new PokeApiError('PARSE', firstPath);
        const pagePath = `${resource}?limit=${p.limit}&offset=${p.offset}`;
        const page = await fetchPath<unknown>(pagePath, o);
        if (!isListShape(page)) throw new PokeApiError('PARSE', pagePath);
        results.push(...page.results);
        next = page.next;
      }
      return { ...first, results, next: null, previous: null } as unknown as ListMap<K>;
    },

    resolve<K extends ResourceKey>(ref: NamedAPIResource<K> | APIResource<K>, o?: RequestOpts) {
      const parsed = parseResourceUrl(ref.url);
      if (!parsed) return invalid(String(ref.url));
      return client.get(parsed.resource as K, parsed.id, o);
    },

    getPokemonEncounters(idOrName: string | number, o?: RequestOpts) {
      if (typeof idOrName === 'string' && idOrName.trim().startsWith('https://')) {
        const id = parseEncountersUrl(idOrName.trim());
        if (id === null) return invalid(idOrName);
        return fetchPath<LocationAreaEncounter[]>(`pokemon/${id}/encounters`, o);
      }
      const v = validateIdOrName(idOrName);
      if (!v) return invalid(`pokemon/${String(idOrName)}/encounters`);
      return fetchPath<LocationAreaEncounter[]>(`pokemon/${canonicalIdOrName(v)}/encounters`, o);
    },

    getMeta: (o?: RequestOpts) => fetchPath<ApiMeta>('meta', o),
    getIndex: (o?: RequestOpts) => fetchPath<ApiIndex>('', o),

    clearPersistent() {
      cache?.clear();
      lru.clear();
    },
    persistentStats: () => cache?.stats() ?? { entries: 0, chars: 0, enabled: false },
  };
  return client;
}
