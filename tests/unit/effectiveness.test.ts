// Efectividad defensiva y matriz de tipos (RF-POK-10, AC-19) con relaciones reales.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { TypeRelations } from '../../src/api/types/index';
import { BATTLE_TYPES, defensiveGroups, defensiveMultipliers, formatMultiplier, matrixValue } from '../../src/data/effectiveness';
import { buildMatrix } from '../../src/data/typeCatalog';

type T = { id: number; name: string; damage_relations: TypeRelations };
const types = JSON.parse(readFileSync(new URL('../fixtures/types-defense.json', import.meta.url), 'utf8')) as T[];
const byName = (n: string) => types.find((t) => t.name === n)!;
const of = (...names: string[]) => defensiveMultipliers(names.map(byName));
const get = (m: Map<string, number>, atk: string) => m.get(atk) ?? 1;

test('eléctrico: tierra ×2; volador, acero y eléctrico ×½; agua ×1', () => {
  const m = of('electric');
  assert.equal(get(m, 'ground'), 2);
  assert.equal(get(m, 'flying'), 0.5);
  assert.equal(get(m, 'steel'), 0.5);
  assert.equal(get(m, 'electric'), 0.5);
  assert.equal(get(m, 'water'), 1);
  const groups = defensiveGroups([byName('electric')]);
  const neutral = BATTLE_TYPES.filter((n) => !['ground', 'electric', 'flying', 'steel'].includes(n));
  assert.deepEqual(groups.map((g) => [g.multiplier, g.types.map((t) => t.name).sort()]), [
    [2, ['ground']], [1, [...neutral].sort()], [0.5, ['electric', 'flying', 'steel']],
  ]);
});

test('grupo ×1 (Pikachu): Normal ×1 con ref type/1 y los 18 tipos en algún grupo', () => {
  const groups = defensiveGroups([byName('electric')]);
  const one = groups.find((g) => g.multiplier === 1)!;
  const normal = one.types.find((t) => t.name === 'normal');
  assert.equal(normal?.url, 'https://pokeapi.co/api/v2/type/1/');
  assert.equal(one.types.length, 14);
  assert.deepEqual(groups.flatMap((g) => g.types.map((t) => t.name)).sort(), [...BATTLE_TYPES].sort());
});

test('grupo ×1 con factores que se anulan: tierra en planta/veneno (×½·×2)', () => {
  const groups = defensiveGroups([byName('grass'), byName('poison')]);
  const one = groups.find((g) => g.multiplier === 1)!;
  assert.ok(one.types.some((t) => t.name === 'ground'));
  assert.deepEqual(groups.map((g) => g.multiplier), [2, 1, 0.5, 0.25]);
});

test('planta/veneno: fuego, hielo, volador y psíquico ×2; planta ×¼; agua ×½', () => {
  const m = of('grass', 'poison');
  assert.equal(get(m, 'fire'), 2);
  assert.equal(get(m, 'flying'), 2);
  assert.equal(get(m, 'psychic'), 2);
  assert.equal(get(m, 'ice'), 2);
  assert.equal(get(m, 'grass'), 0.25);
  assert.equal(get(m, 'water'), 0.5);
  assert.equal(get(m, 'fighting'), 0.5);
  assert.equal(get(m, 'ground'), 1);                     // planta ×½ y veneno ×2
});

test('tierra: eléctrico ×0; agua y planta ×2', () => {
  const m = of('ground');
  assert.equal(get(m, 'electric'), 0);
  assert.equal(get(m, 'water'), 2);
  assert.equal(get(m, 'grass'), 2);
  assert.deepEqual(defensiveGroups([byName('ground')]).map((g) => g.multiplier), [2, 1, 0.5, 0]);
});

test('matriz: Fuego→Planta ×2, Normal→Fantasma ×0, Agua→Fuego ×2 (AC-19)', () => {
  const matrix = buildMatrix(types);
  assert.equal(matrixValue(matrix, 'fire', 'grass'), 2);
  assert.equal(matrixValue(matrix, 'normal', 'ghost'), 0);
  assert.equal(matrixValue(matrix, 'water', 'fire'), 2);
  assert.equal(matrixValue(matrix, 'fire', 'water'), 0.5);
  assert.equal(matrixValue(matrix, 'normal', 'normal'), 1);
  assert.equal(matrixValue(matrix, 'electric', 'ground'), 0);
});

test('formatMultiplier', () => {
  assert.equal(formatMultiplier(2), '×2');
  assert.equal(formatMultiplier(0.5), '×½');
  assert.equal(formatMultiplier(0.25), '×¼');
  assert.equal(formatMultiplier(0), '×0');
  assert.equal(formatMultiplier(4), '×4');
  assert.equal(formatMultiplier(1), '×1');
});
