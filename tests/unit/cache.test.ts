import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPersistentCache, type PersistentCacheOptions } from '../../src/api/cache';
import { memoryStorage, type KeyValueStorage } from '../../src/api/storage';

/** Reloj controlado (de 1 a 9: el prefijo "<savedAt>\n" ocupa 2 caracteres) y escritura síncrona. */
function setup(storage: KeyValueStorage, extra: PersistentCacheOptions = {}) {
  let t = 0;
  const disabled: string[] = [];
  const cache = createPersistentCache(storage, {
    now: () => ++t,
    schedule: (fn) => fn(),
    onDisabled: (r) => disabled.push(r),
    ...extra,
  });
  return { cache, disabled };
}
const text = (n: number, ch = 'x') => `"${ch.repeat(n - 2)}"`;   // JSON válido de n caracteres
const has = (s: KeyValueStorage, path: string) => s.getItem(`pbx1:c1:d:${path}`) !== null;

test('desalojo LRU por presupuesto', () => {
  const s = memoryStorage();
  // Cada entrada: clave (11) + "<t>\n" (2) + 80 = 93 caracteres → caben 3 en 300.
  const { cache } = setup(s, { budgetChars: 300 });
  cache.put('a', text(80), { priority: 'high' });
  cache.put('b', text(80), { priority: 'high' });
  cache.put('c', text(80), { priority: 'high' });
  assert.ok(cache.get('a'));                      // 'a' pasa a ser la más reciente
  cache.put('d', text(80), { priority: 'high' });
  assert.deepEqual(['a', 'b', 'c', 'd'].map((p) => has(s, p)), [true, false, true, true]);
  assert.equal(cache.stats().entries, 3);
});

test('QuotaExceededError → desalojo del 25 % y reintento → desactivación', () => {
  const s = memoryStorage(400);
  const { cache, disabled } = setup(s);
  for (const p of ['a', 'b', 'c', 'd']) cache.put(p, text(80), { priority: 'high' });  // 372 de 400
  cache.put('e', text(80), { priority: 'high' });   // no cabe: sale 'a' (la más antigua) y se reintenta
  assert.deepEqual(['a', 'b', 'c', 'd', 'e'].map((p) => has(s, p)), [false, true, true, true, true]);
  assert.equal(cache.stats().enabled, true);
  cache.put('big', text(500), { priority: 'high' });   // no cabe ni tras desalojar → se desactiva
  assert.equal(has(s, 'big'), false);
  assert.equal(cache.stats().enabled, false);
  assert.deepEqual(disabled, ['quota']);
  cache.put('f', text(10), { priority: 'high' });
  assert.equal(has(s, 'f'), false, 'desactivada, ya no escribe');
});

test('entradas corruptas borradas e índice ilegible reconstruido', () => {
  const s = memoryStorage();
  s.setItem('pbx1:c1:d:roto', 'sin-salto-de-linea');
  s.setItem('pbx1:c1:d:bueno', `5\n${text(10)}`);
  s.setItem('pbx1:c1:i', '{no es json');
  s.setItem('pbx1:c0:d:viejo', '1\n{}');               // otro esquema: se borra al arrancar
  const { cache } = setup(s);
  assert.equal(s.getItem('pbx1:c1:d:roto'), null);
  assert.equal(s.getItem('pbx1:c0:d:viejo'), null);
  assert.equal(cache.stats().entries, 1);
  assert.equal(cache.get('bueno')?.text, text(10));
  s.setItem('pbx1:c1:d:tarde', 'abc\n{}');             // corrupta después de arrancar
  assert.equal(cache.get('tarde'), null);
  assert.equal(s.getItem('pbx1:c1:d:tarde'), null);
  cache.flush();
  const idx = JSON.parse(s.getItem('pbx1:c1:i') ?? 'null') as { v: number; e: Record<string, unknown> };
  assert.equal(idx.v, 1);
  assert.deepEqual(Object.keys(idx.e), ['bueno']);
});

test('límite por entrada (400 000 caracteres)', () => {
  const s = memoryStorage();
  const { cache } = setup(s);
  cache.put('grande', text(400_001), { priority: 'high' });
  cache.put('justo', text(400_000), { priority: 'high' });
  assert.equal(has(s, 'grande'), false);
  assert.equal(has(s, 'justo'), true);
});

test('low de 20 001 no se persiste, high del mismo tamaño sí y low de 20 000 sí', () => {
  const s = memoryStorage();
  const { cache } = setup(s);
  cache.put('low-20001', text(20_001), { priority: 'low' });
  cache.put('high-20001', text(20_001), { priority: 'high' });
  cache.put('low-20000', text(20_000), { priority: 'low' });
  assert.equal(has(s, 'low-20001'), false);
  assert.equal(has(s, 'high-20001'), true);
  assert.equal(has(s, 'low-20000'), true);
});

test('alias en el índice y clear()', () => {
  const s = memoryStorage();
  const { cache } = setup(s);
  cache.put('type/13', text(10), { priority: 'high' });
  cache.setAlias('type/electric', 'type/13');
  cache.flush();
  const again = setup(s).cache;
  assert.equal(again.getAlias('type/electric'), 'type/13');
  assert.equal(again.get('type/13')?.text, text(10));
  s.setItem('otra-app', 'x');
  again.clear();
  assert.equal(s.length, 1, 'solo quedan claves ajenas a pbx1:c1:');
  assert.equal(again.stats().entries, 0);
});
