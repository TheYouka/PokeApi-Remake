// Árbol evolutivo (§13.3, AC-16) con la cadena 67 completa tal como la da la API en vivo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { EvolutionChain, EvolutionDetail } from '../../src/api/types/index';
import {
  buildTree, describeEvolutionDetail, groupEvolutionDetails, hasBranch, isEmpty, partToString, visibleAlternatives,
  type EvoAlternative, type EvoNode,
} from '../../src/data/evolution';

const fixture = (name: string): EvolutionChain =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')) as EvolutionChain;

const eevee = fixture('evolution-chain-67.json');
const bulbasaur = fixture('evolution-chain-1.json');
const tree = buildTree(eevee.chain);
const child = (slug: string): EvoNode => tree.children.find((c) => c.slug === slug)!;
const alternatives = (slug: string): EvoAlternative[] => groupEvolutionDetails(child(slug).details, 'eevee', slug);
const text = (a: EvoAlternative) => a.parts.map((p) => partToString(p)).join(' · ');

test('Eevee tiene 8 hijos', () => {
  assert.equal(tree.slug, 'eevee');
  assert.equal(tree.speciesId, 133);
  assert.equal(tree.children.length, 8);
  assert.deepEqual(tree.children.map((c) => c.slug).sort(),
    ['espeon', 'flareon', 'glaceon', 'jolteon', 'leafeon', 'sylveon', 'umbreon', 'vaporeon']);
});

test('Espeon: 1 alternativa con "Amistad ≥ 160" y "de día"', () => {
  const alts = alternatives('espeon');
  assert.equal(alts.length, 1);
  const parts = alts[0]!.parts.map((p) => partToString(p));
  assert.ok(parts.includes('Amistad ≥ 160'));
  assert.ok(parts.includes('de día'));
  assert.equal(text(alts[0]!), 'Subir de nivel · Amistad ≥ 160 · de día');
  assert.equal(alts[0]!.contexts.length, 1);
  assert.equal(alts[0]!.contexts[0]!.versionGroup?.name, 'gold-silver');
});

test('Leafeon: exactamente 2 alternativas; primero leaf-stone y después 5 contextos', () => {
  const alts = alternatives('leafeon');
  assert.equal(alts.length, 2);
  assert.ok(alts.length <= 3);
  const first = alts[0]!;
  assert.ok(first.isDefault);
  assert.ok(first.parts.some((p) => 'ref' in p && p.ref.name === 'leaf-stone'));
  assert.equal(text(first), 'Usar Leaf Stone');                    // disparador use-item omitido (redundante)
  assert.deepEqual(first.contexts.map((c) => c.versionGroup?.name), ['sword-shield']);
  const second = alts[1]!;
  assert.equal(text(second), 'Subir de nivel · Cerca de una roca especial');
  assert.equal(second.contexts.length, 5);
  assert.deepEqual(second.contexts.map((c) => `${c.location?.name} (${c.versionGroup?.name})`), [
    'eterna-forest (diamond-pearl)',
    'pinwheel-forest (black-white)',
    'kalos-route-20 (x-y)',
    'petalburg-woods (omega-ruby-alpha-sapphire)',
    'lush-jungle (sun-moon)',
  ]);
});

test('Sylveon: 2 alternativas, primero la de is_default', () => {
  const alts = alternatives('sylveon');
  assert.equal(alts.length, 2);
  assert.equal(text(alts[0]!), 'Subir de nivel · Conoce un movimiento de tipo Fairy · Amistad ≥ 160');
  assert.equal(text(alts[1]!), 'Subir de nivel · Conoce un movimiento de tipo Fairy · Afecto ≥ 2');
});

test('ninguna parte de las 8 ramas contiene false, Time Of Day, Forma requerida ni Is Default', () => {
  for (const c of tree.children) {
    for (const d of c.details) {
      for (const p of describeEvolutionDetail(d, { fromSlug: 'eevee', toSlug: c.slug })) {
        const s = partToString(p);
        for (const bad of ['false', 'Time Of Day', 'Forma requerida', 'Is Default']) {
          assert.ok(!s.includes(bad), `${c.slug}: "${s}" contiene "${bad}"`);
        }
      }
    }
    assert.ok(groupEvolutionDetails(c.details, 'eevee', c.slug).length >= 1);
  }
});

test('campo desconocido no vacío → etiqueta genérica; desconocido con false → nada', () => {
  const base = child('espeon').details[0]!;
  const withUnknown = { ...base, needs_friend_code: 'si', other_flag: false } as unknown as EvolutionDetail;
  const parts = describeEvolutionDetail(withUnknown, { fromSlug: 'eevee', toSlug: 'espeon' }).map((p) => partToString(p));
  assert.ok(parts.includes('Needs Friend Code: si'));
  assert.ok(!parts.some((s) => s.includes('Other Flag')));
  // La forma requerida distinta de la especie de origen sí aparece.
  const withForm = { ...base, required_pokemon_form: { name: 'eevee-starter', url: 'https://pokeapi.co/api/v2/pokemon-form/10159/' } };
  assert.ok(describeEvolutionDetail(withForm, { fromSlug: 'eevee' }).map((p) => partToString(p)).includes('Forma requerida: Eevee Starter'));
});

test('isEmpty: null, undefined, false, "" y [] están vacíos; 0 no', () => {
  for (const v of [null, undefined, false, '', []]) assert.equal(isEmpty(v), true);
  for (const v of [0, true, 'day', [1]]) assert.equal(isEmpty(v), false);
});

test('5 alternativas sintéticas → se ven 3 y "+2 más"', () => {
  const base = child('espeon').details[0]!;
  const details = [150, 160, 170, 180, 190].map((n, i) => ({
    ...base, min_happiness: n, is_default: i === 0,
    version_group: { name: `vg-${i}`, url: `https://pokeapi.co/api/v2/version-group/${i + 1}/` },
  }));
  const alts = groupEvolutionDetails(details, 'eevee', 'espeon');
  assert.equal(alts.length, 5);
  const v = visibleAlternatives(alts);
  assert.equal(v.shown.length, 3);
  assert.equal(v.hidden, 2);
  assert.equal(v.moreLabel, '+2 más');
  assert.equal(visibleAlternatives(alts, true).shown.length, 5);
  assert.ok(alts[0]!.isDefault);
});

test('hasBranch: cadena 67 true, cadena 1 (lineal) false', () => {
  assert.equal(hasBranch(buildTree(eevee.chain)), true);
  const b = buildTree(bulbasaur.chain);
  assert.equal(b.children.length, 1);
  assert.equal(b.children[0]!.children.length, 1);
  assert.equal(hasBranch(b), false);
  const ivysaur = groupEvolutionDetails(b.children[0]!.details, 'bulbasaur', 'ivysaur');
  assert.equal(text(ivysaur[0]!), 'Nivel 16');                     // disparador level-up omitido
});
