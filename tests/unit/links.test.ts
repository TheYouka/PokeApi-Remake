// Destinos de las referencias (§7.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refHref } from '../../src/data/links';

test('especie en cuadrícula → /pokemon/{idDeLaURL} (deoxys → /pokemon/386)', () => {
  const deoxys = { name: 'deoxys', url: 'https://pokeapi.co/api/v2/pokemon-species/386/' };
  assert.equal(refHref(deoxys, 'grid'), '/pokemon/386');
  assert.equal(refHref(deoxys, 'chip'), '/pokemon-species/deoxys');
});

test('pokemon → /pokemon/{name}', () => {
  assert.equal(refHref({ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }, 'chip'), '/pokemon/pikachu');
  assert.equal(refHref({ name: 'deoxys-normal', url: 'https://pokeapi.co/api/v2/pokemon/386/' }, 'grid'), '/pokemon/deoxys-normal');
});

test('recursos sin nombre por ID; con nombre por nombre (también IDs −1 y 0)', () => {
  assert.equal(refHref({ url: 'https://pokeapi.co/api/v2/machine/1/' }, 'chip'), '/machine/1');
  assert.equal(refHref({ url: 'https://pokeapi.co/api/v2/evolution-chain/67/' }, 'chip'), '/evolution-chain/67');
  assert.equal(refHref({ name: 'electric', url: 'https://pokeapi.co/api/v2/type/13/' }, 'chip'), '/type/electric');
  assert.equal(refHref({ name: 'none', url: 'https://pokeapi.co/api/v2/move-ailment/0/' }, 'chip'), '/move-ailment/none');
  assert.equal(refHref({ name: 'damage', url: 'https://pokeapi.co/api/v2/move-category/0/' }, 'chip'), '/move-category/damage');
});

test('URL ajena o inválida → null', () => {
  assert.equal(refHref({ name: 'x', url: 'https://example.com/api/v2/pokemon/25/' }, 'chip'), null);
  assert.equal(refHref({ name: 'x', url: 'https://pokeapi.co/api/v2/constructor/1/' }, 'chip'), null);
  assert.equal(refHref({ name: 'x', url: 'https://pokeapi.co/api/v2/pokemon/-2/' }, 'grid'), null);
});
