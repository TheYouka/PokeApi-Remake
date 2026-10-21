// Registro de recursos (§7.1, §7.3, §22.1): parte 1 (claves, pivotes, miniaturas) y parte 2 (`detail`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESOURCES, type ResourceKey } from '../../src/api/resources';
import { GROUP_ORDER, PIVOTS } from '../../src/registry/groups';
import { REGISTRY, RESOURCE_UI, resourcesOfPivot } from '../../src/registry/resources';

test('REGISTRY tiene exactamente las 50 claves de RESOURCES', () => {
  const keys = Object.keys(REGISTRY).sort();
  assert.equal(keys.length, 50);
  assert.deepEqual(keys, Object.keys(RESOURCES).sort());
  for (const k of keys as ResourceKey[]) {
    assert.equal(REGISTRY[k].key, k);
    assert.ok(GROUP_ORDER.includes(REGISTRY[k].group), `${k}: grupo`);
    assert.ok(REGISTRY[k].label.length > 0 && REGISTRY[k].singular.length > 0, `${k}: etiquetas`);
  }
});

test('cada pivote tiene los recursos esperados (18/8/6/8/7/3)', () => {
  const counts = { pokedex: 18, juegos: 8, objetos: 6, movimientos: 8, mundo: 7, bayas: 3 } as const;
  for (const [pivot, n] of Object.entries(counts) as [keyof typeof counts, number][]) {
    assert.equal(resourcesOfPivot(pivot).length, n, pivot);
  }
  assert.deepEqual(PIVOTS.map((p) => p.id), ['inicio', 'pokedex', 'juegos', 'objetos', 'movimientos', 'mundo', 'bayas', 'ajustes']);
});

test('los 5 recursos sin nombre usan summary y tienen función summary', () => {
  for (const k of ['contest-effect', 'super-contest-effect', 'evolution-chain', 'machine', 'characteristic'] as const) {
    assert.equal(REGISTRY[k].labelMode, 'summary', k);
    assert.equal(typeof REGISTRY[k].summary, 'function', k);
  }
  assert.equal(REGISTRY['version-group'].labelMode, 'versions');
  for (const k of ['pokemon', 'pokemon-species', 'pokemon-form', 'location-area'] as const) {
    assert.equal(REGISTRY[k].labelMode, 'slug', k);
  }
});

test('miniaturas construidas', () => {
  assert.equal(REGISTRY['pokemon-form'].thumb!(10001, 'unown-b'), null);
  assert.ok(REGISTRY['pokemon-form'].thumb!(25, 'pikachu')!.endsWith('/pokemon/25.png'));
  assert.ok(REGISTRY.type.thumb!(13, 'electric')!.endsWith('/scarlet-violet/13.png'));
  assert.equal(REGISTRY.type.thumb!(10001, 'unknown'), null);
  assert.ok(REGISTRY.berry.thumb!(1, 'cheri')!.endsWith('/items/cheri-berry.png'));
});

test('detail existe en las 49 claves distintas de pokemon y no en pokemon (sin invocar los import())', () => {
  const keys = Object.keys(REGISTRY) as ResourceKey[];
  const withDetail = keys.filter((k) => k !== 'pokemon');
  assert.equal(withDetail.length, 49);
  for (const k of withDetail) {
    assert.equal(typeof RESOURCE_UI[k].detail, 'function', k);
  }
  assert.equal(RESOURCE_UI.pokemon.detail, undefined);
});

test('summary de machine: tm→MT con las etiquetas del contexto', () => {
  const ctx = { lang: 'es', label: (r: { name: string }) => (r.name === 'mega-punch' ? 'Megapuño' : 'Sword Shield') };
  const text = REGISTRY.machine.summary!({
    id: 1,
    item: { name: 'tm00', url: 'https://pokeapi.co/api/v2/item/1/' },
    move: { name: 'mega-punch', url: 'https://pokeapi.co/api/v2/move/5/' },
    version_group: { name: 'sword-shield', url: 'https://pokeapi.co/api/v2/version-group/20/' },
  }, ctx);
  assert.equal(text, 'MT00 · Megapuño · Sword Shield');
});
