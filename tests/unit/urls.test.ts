import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEncountersUrl, parseListUrl, parseResourceUrl } from '../../src/api/urls';
import { createPokeApiClient } from '../../src/api/client';
import { PokeApiError } from '../../src/api/errors';

const B = 'https://pokeapi.co/api/v2/';

test('parseResourceUrl: prefijo, clave de recurso y enteros', () => {
  assert.deepEqual(parseResourceUrl(`${B}pokemon/25/`), { resource: 'pokemon', id: 25 });
  assert.deepEqual(parseResourceUrl(`${B}pokemon/25`), { resource: 'pokemon', id: 25 });
  assert.deepEqual(parseResourceUrl(`${B}move-ailment/-1/`), { resource: 'move-ailment', id: -1 });
  assert.deepEqual(parseResourceUrl(`${B}move-category/0/`), { resource: 'move-category', id: 0 });
  assert.equal(parseResourceUrl(`${B}pokemon/-2/`), null);
  assert.equal(parseResourceUrl(`${B}pokemon/1.5/`), null);
  assert.equal(parseResourceUrl(`${B}constructor/1/`), null);
  assert.equal(parseResourceUrl(`${B}no-existe/1/`), null);
  assert.equal(parseResourceUrl('http://pokeapi.co/api/v2/pokemon/25/'), null);
  assert.equal(parseResourceUrl('https://evil.example/api/v2/pokemon/25/'), null);
  assert.equal(parseResourceUrl(`${B}pokemon/pikachu/`), null);
});

test('parseListUrl: prefijo, clave, enteros y rango de limit', () => {
  assert.deepEqual(parseListUrl(`${B}pokemon?limit=20&offset=40`), { resource: 'pokemon', limit: 20, offset: 40 });
  // La API en vivo devuelve offset antes que limit y con barra final.
  assert.deepEqual(parseListUrl(`${B}evolution-variable/?offset=3&limit=1`), {
    resource: 'evolution-variable', limit: 1, offset: 3,
  });
  assert.equal(parseListUrl(`${B}pokemon?limit=0&offset=0`), null);
  assert.equal(parseListUrl(`${B}pokemon?limit=100001&offset=0`), null);
  assert.equal(parseListUrl(`${B}pokemon?limit=100000&offset=0`)?.limit, 100000);
  assert.equal(parseListUrl(`${B}pokemon?limit=-1&offset=0`), null);
  assert.equal(parseListUrl(`${B}pokemon?limit=1.5&offset=0`), null);
  assert.equal(parseListUrl(`${B}pokemon?limit=20&offset=-1`), null);
  assert.equal(parseListUrl(`${B}pokemon?limit=20`), null);
  assert.equal(parseListUrl(`${B}pokemon?limit=20&offset=0&x=1`), null);
  assert.equal(parseListUrl(`${B}constructor?limit=20&offset=0`), null);
  assert.equal(parseListUrl(`${B}pokemon/25?limit=20&offset=0`), null);
  assert.equal(parseListUrl('https://evil.example/api/v2/pokemon?limit=20&offset=0'), null);
});

test('parseEncountersUrl', () => {
  assert.equal(parseEncountersUrl(`${B}pokemon/25/encounters`), 25);
  assert.equal(parseEncountersUrl(`${B}pokemon/25/encounters/`), 25);
  assert.equal(parseEncountersUrl(`${B}pokemon/25/encounters/x`), null);
  assert.equal(parseEncountersUrl(`${B}item/25/encounters`), null);
  assert.equal(parseEncountersUrl(`${B}pokemon/-1/encounters`), null);
});

test('getPokemonEncounters con una URL ajena lanza INVALID_PARAM sin llamar a fetchImpl', async () => {
  let calls = 0;
  const client = createPokeApiClient({
    fetchImpl: async () => { calls++; return new Response('[]'); },
    isOffline: () => false,
  });
  await assert.rejects(client.getPokemonEncounters(`${B}item/1/`), (e: unknown) => {
    assert.ok(e instanceof PokeApiError);
    assert.equal(e.code, 'INVALID_PARAM');
    return true;
  });
  assert.equal(calls, 0);
});
