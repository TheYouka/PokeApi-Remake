// Validación de entradas (§19, AC-24).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryStorage } from '../../src/api/storage';
import { validateIdOrName } from '../../src/api/urls';
import { normalizeQuery, rankSuggestions } from '../../src/data/search';
import { KNOWN_LANGS, SETTINGS_KEY, createSettingsStore, isKnownLang } from '../../src/state/settings';
import {
  parseGenParam, parseTypeParam, validateAvatarId, validateCreatedName, validateGamertag,
} from '../../src/state/validation';

const GAMERTAG_ERROR = 'Usa de 1 a 15 letras, números, espacios, _ o -';

test('gamertag: vacío, solo espacios, 16 caracteres y emoji se rechazan; 15 con tildes se acepta', () => {
  assert.deepEqual(validateGamertag(''), { ok: false, error: GAMERTAG_ERROR });
  assert.deepEqual(validateGamertag('     '), { ok: false, error: GAMERTAG_ERROR });
  assert.deepEqual(validateGamertag('abcdefghijklmnop'), { ok: false, error: GAMERTAG_ERROR });   // 16
  assert.deepEqual(validateGamertag('Ash😀'), { ok: false, error: GAMERTAG_ERROR });
  assert.deepEqual(validateGamertag('a.b'), { ok: false, error: GAMERTAG_ERROR });
  const fifteen = 'Ñandú_José-Ríos';                                                             // 15 con tildes
  assert.equal([...fifteen].length, 15);
  assert.deepEqual(validateGamertag(fifteen), { ok: true, value: fifteen });
  assert.deepEqual(validateGamertag('  Entrenador  '), { ok: true, value: 'Entrenador' });
  assert.deepEqual(validateGamertag('abcdefghijklmno'), { ok: true, value: 'abcdefghijklmno' }); // 15
});

test('validateIdOrName completo', () => {
  assert.deepEqual(validateIdOrName('25'), { kind: 'id', value: 25 });
  assert.deepEqual(validateIdOrName('007'), { kind: 'id', value: 7 });
  assert.deepEqual(validateIdOrName('0'), { kind: 'id', value: 0 });
  assert.deepEqual(validateIdOrName('-1'), { kind: 'id', value: -1 });
  assert.deepEqual(validateIdOrName('-0'), { kind: 'id', value: 0 });
  assert.equal(validateIdOrName('-2'), null);
  assert.equal(validateIdOrName('1234567'), null);
  assert.equal(validateIdOrName('1.5'), null);
  assert.deepEqual(validateIdOrName('Pikachu'), { kind: 'slug', value: 'pikachu' });
  assert.deepEqual(validateIdOrName('10-000-000-volt-thunderbolt'), { kind: 'slug', value: '10-000-000-volt-thunderbolt' });
  assert.equal(validateIdOrName('a b'), null);
  assert.equal(validateIdOrName(''), null);
});

test('nombre de Pokémon creado: colisión, slug vacío y formato', () => {
  const real = new Set(['pikachu', 'mr-mime']);
  assert.deepEqual(validateCreatedName('Pikachu', real), { ok: false, error: 'Ya existe un Pokémon con ese nombre' });
  assert.deepEqual(validateCreatedName('Mr. Mime', ['mr-mime']), { ok: false, error: 'Ya existe un Pokémon con ese nombre' });
  assert.deepEqual(validateCreatedName('...', real), { ok: false, error: 'Revise su ortografía' });
  assert.deepEqual(validateCreatedName("'-'", real), { ok: false, error: 'Revise su ortografía' });
  assert.deepEqual(validateCreatedName('Pika<script>', real), { ok: false, error: 'Revise su ortografía' });
  assert.deepEqual(validateCreatedName('Un nombre demasiado largo', real), { ok: false, error: 'Revise su ortografía' });
  assert.deepEqual(validateCreatedName('  Chispa   Ñú  ', real), { ok: true, value: { name: 'Chispa Ñú', slug: 'chispa-nu' } });
});

test('normalizeQuery y ranking de sugerencias (§13.1)', () => {
  assert.equal(normalizeQuery('  Mr. Mimé  '), 'mr-mime');
  assert.equal(normalizeQuery('Tapu_Koko'), 'tapu-koko');
  assert.equal(normalizeQuery('a'.repeat(80)).length, 50);
  const entries = [
    { id: 26, slug: 'raichu' }, { id: 172, slug: 'pichu' }, { id: 25, slug: 'pikachu' },
    { id: 10094, slug: 'pikachu-original-cap' }, { id: 1, slug: 'bulbasaur' },
  ];
  assert.deepEqual(rankSuggestions(entries, 'pika').map((e) => e.id), [25, 10094]);
  assert.deepEqual(rankSuggestions(entries, 'chu').map((e) => e.id), [26, 172, 25, 10094]);
  assert.deepEqual(rankSuggestions(entries, '25').map((e) => e.id), [25]);
  assert.deepEqual(rankSuggestions(entries, 'Pikachu').map((e) => e.id), [25, 10094]);
  assert.deepEqual(rankSuggestions(entries, ''), []);
  const names = new Map([[1, 'Bulbasaur'], [26, 'Raichu']]);
  assert.deepEqual(rankSuggestions(entries, 'bulb', { localizedName: (e) => names.get(e.id) ?? null }).map((e) => e.id), [1]);
});

test('avatar 1–1025 y parámetros de query', () => {
  assert.equal(validateAvatarId(1), 1);
  assert.equal(validateAvatarId('1025'), 1025);
  assert.equal(validateAvatarId(0), null);
  assert.equal(validateAvatarId(1026), null);
  assert.equal(validateAvatarId(2.5), null);
  assert.equal(parseGenParam('9'), 9);
  assert.equal(parseGenParam('10'), null);
  assert.deepEqual(parseTypeParam('electric,electric,flying,fire', new Set(['electric', 'flying', 'fire'])), ['electric', 'flying']);
  assert.deepEqual(parseTypeParam('nope,water', new Set(['water'])), ['water']);
});

test("KNOWN_LANGS tiene 14 códigos; un dataLang 'fr' guardado se lee como fr y 'xx' como es", () => {
  assert.equal(KNOWN_LANGS.length, 14);
  assert.equal(new Set(KNOWN_LANGS).size, 14);
  assert.ok(isKnownLang('es-419'));
  assert.ok(!isKnownLang('xx'));
  const fr = memoryStorage();
  fr.setItem(SETTINGS_KEY, JSON.stringify({ v: 1, d: { dataLang: 'fr', accent: '#0063b1', theme: 'light' } }));
  const a = createSettingsStore(fr).get();
  assert.equal(a.dataLang, 'fr');
  assert.equal(a.accent, '#0063B1');
  assert.equal(a.theme, 'light');
  assert.equal(a.gamertag, 'Entrenador');                     // campo ausente → por defecto
  const xx = memoryStorage();
  xx.setItem(SETTINGS_KEY, JSON.stringify({ v: 1, d: { dataLang: 'xx', theme: 'light', gamertag: '' } }));
  const b = createSettingsStore(xx).get();
  assert.equal(b.dataLang, 'es');
  assert.equal(b.theme, 'light');                              // el resto de campos se conserva
  assert.equal(b.gamertag, 'Entrenador');
});
