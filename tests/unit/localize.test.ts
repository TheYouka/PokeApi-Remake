import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanFlavor, formatSlug, languageChain, normalizeEffectText, pickDescription, pickEffect, pickFlavor, pickName,
  substituteEffectChance, toBcp47,
} from '../../src/api/localize';
import type { Name } from '../../src/api/types/common';

const lang = (name: string) => ({ name, url: `https://pokeapi.co/api/v2/language/${name}/` });
const names = (...pairs: [string, string][]): Name[] => pairs.map(([l, n]) => ({ name: n, language: lang(l) }));

test('languageChain: es-419 → es → en, sin duplicados', () => {
  assert.deepEqual(languageChain('es-419'), ['es-419', 'es', 'en']);
  assert.deepEqual(languageChain('es'), ['es', 'en']);
  assert.deepEqual(languageChain('en'), ['en']);
  assert.deepEqual(languageChain('fr'), ['fr', 'en']);
});

test('pickName: cadena de respaldo es-419 → es → en → slug', () => {
  const all = names(['en', 'Electric'], ['es', 'Eléctrico'], ['es-419', 'Eléctrico LA']);
  assert.deepEqual(pickName(all, 'es-419', 'electric'), { text: 'Eléctrico LA', lang: 'es-419' });
  assert.deepEqual(pickName(names(['en', 'Electric'], ['es', 'Eléctrico']), 'es-419', 'electric'), {
    text: 'Eléctrico', lang: 'es',
  });
  assert.deepEqual(pickName(names(['en', 'Electric'], ['fr', 'Électrik']), 'es-419', 'electric'), {
    text: 'Electric', lang: 'en',
  });
  assert.deepEqual(pickName(names(['fr', 'Électrik']), 'es-419', 'mr-mime'), { text: 'Mr Mime', lang: null });
  assert.deepEqual(pickName(undefined, 'es', 'mr-mime'), { text: 'Mr Mime', lang: null });
  assert.equal(formatSlug('mr-mime'), 'Mr Mime');
});

test('pickDescription cae a inglés', () => {
  const d = [{ description: 'Desc EN', language: lang('en') }];
  assert.deepEqual(pickDescription(d, 'es', ), { text: 'Desc EN', lang: 'en' });
  assert.equal(pickDescription([], 'es'), null);
});

test('cleanFlavor con \\f, \\n, \\u00ad y espacios múltiples', () => {
  assert.equal(cleanFlavor('Cuando varios\fde estos\nPOKéMON se\u00adjuntan,   su\n\nelectricidad '), 'Cuando varios de estos POKéMON se juntan, su electricidad');
});

test('pickFlavor por versión y con versionFallback', () => {
  const entries = [
    { flavor_text: 'red en', language: lang('en'), version: { name: 'red', url: '' } },
    { flavor_text: 'x es', language: lang('es'), version: { name: 'x', url: '' } },
    { flavor_text: 'y\fes', language: lang('es'), version: { name: 'y', url: '' } },
  ];
  assert.deepEqual(pickFlavor(entries, 'es', { version: 'x' }), { text: 'x es', lang: 'es', version: 'x', versionFallback: false });
  assert.deepEqual(pickFlavor(entries, 'es', { version: 'red' }), { text: 'red en', lang: 'en', version: 'red', versionFallback: false });
  assert.deepEqual(pickFlavor(entries, 'es', { version: 'gold' }), { text: 'y es', lang: 'es', version: 'y', versionFallback: true });
  assert.deepEqual(pickFlavor(entries, 'es'), { text: 'y es', lang: 'es', version: 'y', versionFallback: false });
});

test('$effect_chance con un valor y con null', () => {
  assert.equal(substituteEffectChance('Tiene un $effect_chance% de paralizar.', 30), 'Tiene un 30% de paralizar.');
  assert.equal(substituteEffectChance('Tiene un $effect_chance% de paralizar.', null), 'Tiene un —% de paralizar.');
  const e = [{ effect: 'Has a $effect_chance% chance.', short_effect: '$effect_chance% para.', language: lang('en') }];
  assert.deepEqual(pickEffect(e, 'es', 10), { text: 'Has a 10% chance.', lang: 'en', short: '10% para.' });
  assert.deepEqual(pickEffect(e, 'es', null), { text: 'Has a —% chance.', lang: 'en', short: '—% para.' });
});

test('normalizeEffectText: lista de definición del efecto de master-ball', () => {
  const masterBall = 'Used in battle\n:   Catches a wild Pokémon without fail.\n\n    If used in a trainer battle, nothing happens and the ball is lost.';
  assert.equal(
    normalizeEffectText(masterBall),
    'Used in battle: Catches a wild Pokémon without fail.\n\nIf used in a trainer battle, nothing happens and the ball is lost.',
  );
  assert.equal(normalizeEffectText('Sin cambios.\nOtra línea.'), 'Sin cambios.\nOtra línea.');
});

test('toBcp47', () => {
  assert.equal(toBcp47('ja-hrkt'), 'ja');
  assert.equal(toBcp47('ja-roma'), 'ja-Latn');
  assert.equal(toBcp47('zh-hant'), 'zh-Hant');
  assert.equal(toBcp47('zh-hans'), 'zh-Hans');
  assert.equal(toBcp47('pt-br'), 'pt-BR');
  assert.equal(toBcp47('es-419'), 'es-419');
  assert.equal(toBcp47('fr'), 'fr');
  assert.equal(toBcp47('constructor'), 'constructor');
});
