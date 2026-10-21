// Índice de la Pokédex y filtros cruzados (§5.4, §13.1, AC-13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { NamedAPIResource, Type } from '../../src/api/types/index';
import { parseResourceUrl } from '../../src/api/urls';
import { buildDexIndex, type DexEntry } from '../../src/data/dexIndex';
import { applyFilters, type CreatedFilterMeta, type FilterSets } from '../../src/data/filters';
import { buildTypesByPokemon } from '../../src/data/typeCatalog';

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')) as T;

const pokemonList = fixture<{ results: NamedAPIResource[] }>('pokemon-list.json').results;
const speciesList = fixture<{ results: NamedAPIResource[] }>('species-list.json').results;
const electric = fixture<Pick<Type, 'name' | 'pokemon'>>('type-electric.json');
const gen1 = fixture<{ pokemon_species: NamedAPIResource[] }>('generation-1.json');

const idOf = (r: { url: string }) => parseResourceUrl(r.url)!.id;
const entries = buildDexIndex(pokemonList, speciesList, []);
const ids = (list: DexEntry[]) => list.map((e) => e.id);
const typeSet = (t: Pick<Type, 'pokemon'>) => new Set(t.pokemon.map((p) => idOf(p.pokemon)));
const gen1Set = new Set(gen1.pokemon_species.map(idOf));
const NONE: FilterSets = { typePokemonIds: [], speciesSets: [] };
const base = { includeForms: false, q: '', createdMeta: null };

test('id ≤ 10000: speciesId = id y la especie existe en la lista', () => {
  const speciesIds = new Set(speciesList.map(idOf));
  for (const e of entries.filter((x) => x.id <= 10000)) {
    assert.equal(e.speciesId, e.id);
    assert.equal(e.isDefault, true);
    assert.ok(speciesIds.has(e.id), `especie ${e.id}`);
  }
});

test('formas alternativas: prefijo de especie más largo en límite de guion', () => {
  const byId = new Map(entries.map((e) => [e.id, e]));
  assert.equal(byId.get(10034)?.slug, 'charizard-mega-x');
  assert.equal(byId.get(10034)?.speciesId, 6);
  assert.equal(byId.get(10035)?.speciesId, 6);
  assert.equal(byId.get(10168)?.slug, 'mr-mime-galar');
  assert.equal(byId.get(10168)?.speciesId, 122);          // mr-mime, no "mr" ni mr-rime
  assert.equal(byId.get(10100)?.speciesId, 26);
  assert.equal(byId.get(10034)?.isDefault, false);
  const noSpecies = buildDexIndex([{ name: 'zzz-forma', url: 'https://pokeapi.co/api/v2/pokemon/10999/' }], speciesList, []);
  assert.equal(noSpecies[0]?.speciesId, null);
});

test('tipo eléctrico ∩ generación 1: Pikachu sí, Chikorita no (AC-13)', () => {
  const out = ids(applyFilters(entries, { typePokemonIds: [typeSet(electric)], speciesSets: [gen1Set] }, base));
  assert.ok(out.includes(25));
  assert.ok(out.includes(26));
  assert.ok(!out.includes(152));
  assert.ok(!out.includes(135));                          // no está en el fragmento de generation/1
  const onlyGen = ids(applyFilters(entries, { typePokemonIds: [], speciesSets: [gen1Set] }, base));
  assert.ok(!onlyGen.includes(152));
  assert.ok(onlyGen.includes(133));
});

test('dos tipos: la entrada tiene que estar en ambos conjuntos', () => {
  const psychic = { name: 'psychic', pokemon: [
    { slot: 2, pokemon: { name: 'raichu-alola', url: 'https://pokeapi.co/api/v2/pokemon/10100/' } },
    { slot: 1, pokemon: { name: 'mr-mime', url: 'https://pokeapi.co/api/v2/pokemon/122/' } },
    { slot: 1, pokemon: { name: 'espeon', url: 'https://pokeapi.co/api/v2/pokemon/196/' } },
  ] };
  const f: FilterSets = { typePokemonIds: [typeSet(electric), typeSet(psychic)], speciesSets: [] };
  assert.deepEqual(ids(applyFilters(entries, f, base)), []);                     // sin formas
  assert.deepEqual(ids(applyFilters(entries, f, { ...base, includeForms: true })), [10100]);
  const types = buildTypesByPokemon([electric, psychic]);
  assert.deepEqual(types.get(10100), ['electric', 'psychic']);                   // ordenado por slot
  assert.deepEqual(types.get(25), ['electric']);
});

test('formas excluidas por defecto; incluidas con el interruptor', () => {
  const def = ids(applyFilters(entries, NONE, base));
  assert.ok(def.every((id) => id <= 10000));
  const all = ids(applyFilters(entries, NONE, { ...base, includeForms: true }));
  assert.ok(all.includes(10034));
  assert.ok(all.includes(10168));
  // Una forma con especie entra en los filtros por especie; sin especie, no.
  const withGen = ids(applyFilters(entries, { typePokemonIds: [], speciesSets: [gen1Set] }, { ...base, includeForms: true }));
  assert.ok(withGen.includes(10034));
  const orphan = buildDexIndex([{ name: 'zzz-forma', url: 'https://pokeapi.co/api/v2/pokemon/10999/' }], speciesList, []);
  assert.deepEqual(ids(applyFilters(orphan, { typePokemonIds: [], speciesSets: [gen1Set] }, { ...base, includeForms: true })), []);
});

test('búsqueda q: subcadena del slug o número exacto', () => {
  assert.deepEqual(ids(applyFilters(entries, NONE, { ...base, q: 'pika' })), [25]);
  assert.deepEqual(ids(applyFilters(entries, NONE, { ...base, q: '25' })), [25]);
  assert.deepEqual(ids(applyFilters(entries, NONE, { ...base, q: 'Mr. Mime' })), [122]);
});

test('creados: se filtran con sus campos; con generación o forma corporal quedan fuera', () => {
  const withCreated = buildDexIndex(pokemonList, speciesList, [{ id: 1234, slug: 'chispita' }]);
  const c = withCreated.find((e) => e.id === 1234)!;
  assert.deepEqual(c, { id: 1234, slug: 'chispita', speciesId: null, isDefault: true, created: true });
  const meta = (active: Partial<CreatedFilterMeta['active']>): CreatedFilterMeta => ({
    byId: new Map([[1234, { types: ['electric'], color: 'yellow', habitat: 'forest', eggGroups: ['field'] }]]),
    active: { types: [], color: null, habitat: null, egg: null, gen: null, shape: null, ...active },
  });
  const run = (f: FilterSets, m: CreatedFilterMeta) => ids(applyFilters(withCreated, f, { ...base, createdMeta: m }));
  assert.ok(run(NONE, meta({})).includes(1234));
  assert.ok(run({ typePokemonIds: [typeSet(electric)], speciesSets: [] }, meta({ types: ['electric'] })).includes(1234));
  assert.ok(!run({ typePokemonIds: [new Set([1])], speciesSets: [] }, meta({ types: ['grass'] })).includes(1234));
  assert.ok(run({ typePokemonIds: [], speciesSets: [new Set([25])] }, meta({ color: 'yellow' })).includes(1234));
  assert.ok(!run({ typePokemonIds: [], speciesSets: [new Set([1])] }, meta({ color: 'green' })).includes(1234));
  assert.ok(run({ typePokemonIds: [], speciesSets: [new Set([1])] }, meta({ egg: 'field' })).includes(1234));
  assert.ok(run({ typePokemonIds: [], speciesSets: [new Set([1])] }, meta({ habitat: 'forest' })).includes(1234));
  assert.ok(!run({ typePokemonIds: [], speciesSets: [gen1Set] }, meta({ gen: 1 })).includes(1234));
  assert.ok(!run({ typePokemonIds: [], speciesSets: [new Set([25])] }, meta({ shape: 'quadruped' })).includes(1234));
});
