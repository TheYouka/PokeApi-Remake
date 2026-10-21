import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryStorage, type KeyValueStorage } from '../../src/api/storage';
import { persistedStore } from '../../src/state/persist';
import { clearNotifications, notifications } from '../../src/state/notifications';

interface Prefs { n: number; s: string }
const defaults: Prefs = { n: 1, s: 'a' };
const validate = (raw: unknown): Prefs | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  return typeof r.n === 'number' && typeof r.s === 'string' ? { n: r.n, s: r.s } : null;
};
const make = (storage: KeyValueStorage | null) => persistedStore<Prefs>({ key: 'pbx1:test', version: 1, defaults, validate, storage });

test('escribe el sobre {"v":1,"d":…} y lo vuelve a leer', () => {
  const s = memoryStorage();
  const store = make(s);
  assert.deepEqual(store.get(), defaults);
  assert.equal(s.getItem('pbx1:test'), null);          // leer no escribe
  store.set({ n: 2, s: 'b' });
  assert.equal(s.getItem('pbx1:test'), '{"v":1,"d":{"n":2,"s":"b"}}');
  assert.deepEqual(make(s).get(), { n: 2, s: 'b' });
});

test("'1' en crudo, JSON sin v, v: 2 o datos inválidos → defaults sin escribir", () => {
  for (const raw of ['1', '{"d":{"n":5,"s":"x"}}', '{"v":2,"d":{"n":5,"s":"x"}}', '{"v":1,"d":{"n":"5"}}', 'no-json{', 'null']) {
    const s = memoryStorage();
    s.setItem('pbx1:test', raw);
    const store = make(s);
    assert.deepEqual(store.get(), defaults, raw);
    assert.equal(s.getItem('pbx1:test'), raw, `no se reescribe: ${raw}`);
    store.set((p) => ({ ...p, n: 9 }));                // un set posterior escribe el sobre
    assert.equal(s.getItem('pbx1:test'), '{"v":1,"d":{"n":9,"s":"a"}}');
  }
});

test('con storage: null funciona solo en memoria', () => {
  const store = make(null);
  let calls = 0;
  const off = store.subscribe(() => { calls++; });
  store.set({ n: 3, s: 'c' });
  assert.deepEqual(store.get(), { n: 3, s: 'c' });
  store.set(store.get());                              // mismo valor: no notifica
  assert.equal(calls, 1);
  store.reset();
  assert.deepEqual(store.get(), defaults);
  off();
});

test('reset() vuelve a defaults y borra la clave', () => {
  const s = memoryStorage();
  const store = make(s);
  store.set({ n: 4, s: 'd' });
  store.reset();
  assert.deepEqual(store.get(), defaults);
  assert.equal(s.getItem('pbx1:test'), null);
});

test('si la escritura falla, el valor sigue en memoria y hay UNA notificación por sesión', () => {
  clearNotifications();
  const store = make(memoryStorage(10));                // cuota diminuta: toda escritura lanza
  store.set({ n: 5, s: 'e' });
  store.set({ n: 6, s: 'f' });
  assert.deepEqual(store.get(), { n: 6, s: 'f' });
  const storageNotes = notifications.get().filter((n) => n.kind === 'storage');
  assert.equal(storageNotes.length, 1);
  assert.equal(storageNotes[0]!.title, 'No se pudieron guardar los cambios en este navegador');
});
