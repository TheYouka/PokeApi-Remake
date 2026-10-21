import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPokeApiClient, type ClientEvent } from '../../src/api/client';
import { PokeApiError } from '../../src/api/errors';
import { memoryStorage } from '../../src/api/storage';

const B = 'https://pokeapi.co/api/v2/';

interface Call { url: string; signal: AbortSignal | null }
type Reply = { status: number; body: unknown } | Promise<{ status: number; body: unknown }>;

/** fetchImpl falso: registra cada llamada y responde con `reply(url, n)`. */
function fakeFetch(reply: (url: string, n: number) => Reply) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, signal: init?.signal ?? null });
    const r = await reply(url, calls.length);
    const text = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
    return new Response(text, { status: r.status, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, fetchImpl };
}

const client = (fetchImpl: typeof fetch, extra: Parameters<typeof createPokeApiClient>[0] = {}) =>
  createPokeApiClient({ fetchImpl, isOffline: () => false, ...extra });

const code = (expected: string) => (e: unknown) => {
  assert.ok(e instanceof PokeApiError, `se esperaba PokeApiError y llegó ${String(e)}`);
  assert.equal(e.code, expected);
  return true;
};
const tick = () => new Promise<void>((r) => setImmediate(r));

test('deduplicación de dos get iguales', async () => {
  const f = fakeFetch(() => ({ status: 200, body: { id: 25, name: 'pikachu' } }));
  const c = client(f.fetchImpl);
  const [a, b] = await Promise.all([c.get('pokemon', 25), c.get('pokemon', '025')]);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0]!.url, `${B}pokemon/25`);
  assert.equal(a, b);
});

test('un 404 no se reintenta', async () => {
  const f = fakeFetch(() => ({ status: 404, body: 'Not Found' }));
  const c = client(f.fetchImpl);
  await assert.rejects(c.get('pokemon', 'no-existe-xyz'), code('NOT_FOUND'));
  assert.equal(f.calls.length, 1);
});

test('500 → 500 → 200 hace 3 intentos', async () => {
  const f = fakeFetch((_, n) => (n < 3 ? { status: 500, body: 'error' } : { status: 200, body: { id: 1, name: 'bulbasaur' } }));
  const c = client(f.fetchImpl);
  const p = await c.get('pokemon', 1);
  assert.equal(p.name, 'bulbasaur');
  assert.equal(f.calls.length, 3);
});

test('stale-if-error: con 503 sirve la copia persistente caducada', async () => {
  const storage = memoryStorage();
  const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
  storage.setItem('pbx1:c1:d:pokemon/25', `${old}\n${JSON.stringify({ id: 25, name: 'pikachu' })}`);
  const events: ClientEvent[] = [];
  const f = fakeFetch(() => ({ status: 503, body: 'down' }));
  const c = client(f.fetchImpl, { persistent: storage, maxRetries: 0, onEvent: (e) => events.push(e) });
  const p = await c.get('pokemon', 25);
  assert.equal(p.name, 'pikachu');
  assert.equal(f.calls.length, 1);
  assert.ok(events.some((e) => e.type === 'stale-served' && e.path === 'pokemon/25'));
  // Con NOT_FOUND nunca se sirve la copia caducada.
  storage.setItem('pbx1:c1:d:pokemon/26', `${old}\n${JSON.stringify({ id: 26, name: 'raichu' })}`);
  const f404 = fakeFetch(() => ({ status: 404, body: 'Not Found' }));
  const c404 = client(f404.fetchImpl, { persistent: storage, maxRetries: 0 });
  await assert.rejects(c404.get('pokemon', 26), code('NOT_FOUND'));
});

test('alias nombre↔ID: get por nombre, después por ID y resolve salen de caché', async () => {
  const f = fakeFetch(() => ({ status: 200, body: { id: 13, name: 'electric' } }));
  const c = client(f.fetchImpl);
  const byName = await c.get('type', 'electric');
  const byId = await c.get('type', 13);
  const byRef = await c.resolve({ name: 'electric', url: `${B}type/13/` });
  const byNameAgain = await c.get('type', 'Electric');
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0]!.url, `${B}type/electric`);
  assert.equal(byName, byId);
  assert.equal(byRef, byId);
  assert.equal(byNameAgain, byId);
});

test('resolve rechaza URLs ajenas sin petición', async () => {
  const f = fakeFetch(() => ({ status: 200, body: {} }));
  const c = client(f.fetchImpl);
  await assert.rejects(c.resolve({ url: 'https://evil.example/api/v2/type/13/' }), code('INVALID_PARAM'));
  await assert.rejects(c.resolve({ url: `${B}constructor/1/` }), code('INVALID_PARAM'));
  await assert.rejects(c.resolve({ url: `${B}type/13/../../x/` }), code('INVALID_PARAM'));
  assert.equal(f.calls.length, 0);
});

test('INVALID_PARAM sin fetch', async () => {
  const f = fakeFetch(() => ({ status: 200, body: {} }));
  const c = client(f.fetchImpl);
  await assert.rejects(c.get('pokemon', 'a b'), code('INVALID_PARAM'));
  await assert.rejects(c.get('pokemon', -2), code('INVALID_PARAM'));
  await assert.rejects(c.get('pokemon', '1234567'), code('INVALID_PARAM'));
  await assert.rejects(c.get('pokemon', '1.5'), code('INVALID_PARAM'));
  await assert.rejects(c.get('pokemon', ''), code('INVALID_PARAM'));
  await assert.rejects(c.list('pokemon', { limit: 0 }), code('INVALID_PARAM'));
  await assert.rejects(c.list('pokemon', { limit: 100001 }), code('INVALID_PARAM'));
  assert.equal(f.calls.length, 0);
});

test("get('move-ailment', -1) pide move-ailment/-1 y resolve(…/move-category/0/) pide move-category/0", async () => {
  const f = fakeFetch((url) =>
    url.endsWith('move-ailment/-1')
      ? { status: 200, body: { id: -1, name: 'unknown' } }
      : { status: 200, body: { id: 0, name: 'damage' } });
  const c = client(f.fetchImpl);
  const ailment = await c.get('move-ailment', -1);
  const category = await c.resolve<'move-category'>({ name: 'damage', url: `${B}move-category/0/` });
  assert.equal(ailment.name, 'unknown');
  assert.equal(category.name, 'damage');
  assert.deepEqual(f.calls.map((x) => x.url), [`${B}move-ailment/-1`, `${B}move-category/0`]);
});

test('cancelación en vuelo con dos interesados', async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  const f = fakeFetch(async () => { await gate; return { status: 200, body: { id: 25, name: 'pikachu' } }; });
  const events: ClientEvent[] = [];
  const c = client(f.fetchImpl, { onEvent: (e) => events.push(e) });
  const ctrl = new AbortController();
  const first = c.get('pokemon', 25, { signal: ctrl.signal });
  const second = c.get('pokemon', 25);
  await tick(); await tick();
  assert.equal(f.calls.length, 1, 'la petición ya está en vuelo');
  ctrl.abort();
  await assert.rejects(first, (e: unknown) => (e as { name?: unknown }).name === 'AbortError');
  assert.equal(f.calls[0]!.signal?.aborted, false, 'el signal del fetchImpl no se aborta');
  release();
  const data = await second;
  assert.equal(data.name, 'pikachu');
  const third = await c.get('pokemon', 25);
  assert.equal(third, data, 'la tercera llamada sale del LRU');
  assert.equal(f.calls.length, 1);
  assert.equal(events.filter((e) => e.type === 'request').length, 1);
});

test('listAll sigue los next validados y rechaza los ajenos', async () => {
  const f = fakeFetch((url) => {
    if (url === `${B}berry?limit=100000&offset=0`) {
      return { status: 200, body: { count: 2, next: `${B}berry/?offset=1&limit=1`, previous: null, results: [{ name: 'cheri', url: `${B}berry/1/` }] } };
    }
    return { status: 200, body: { count: 2, next: null, previous: null, results: [{ name: 'chesto', url: `${B}berry/2/` }] } };
  });
  const c = client(f.fetchImpl);
  const all = await c.listAll('berry');
  assert.deepEqual(all.results.map((r) => r.name), ['cheri', 'chesto']);
  assert.equal(all.next, null);
  assert.equal(f.calls[1]!.url, `${B}berry?limit=1&offset=1`);

  const bad = fakeFetch(() => ({ status: 200, body: { count: 2, next: 'https://evil.example/x', previous: null, results: [] } }));
  await assert.rejects(client(bad.fetchImpl).listAll('item'), code('PARSE'));
});
