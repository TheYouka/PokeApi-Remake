// setAccent / setDataLang: único punto de disparo de sus logros (AC-25, AC-40).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { achievements } from '../../src/state/achievements';
import { clearToasts, toasts } from '../../src/state/toasts';
import {
  DEFAULT_SETTINGS, setAccent, setDataLang, setGamertag, setAvatar, settings,
} from '../../src/state/settings';

const unlocked = () => achievements.get().unlocked;
const achToasts = (id: string) => toasts.get().filter((t) => t.kind === 'achievement' && t.id === id).length;

beforeEach(() => {
  settings.reset();
  achievements.reset();
  clearToasts();
});

test('el acento por defecto es #107C10', () => {
  assert.equal(settings.get().accent, '#107C10');
  assert.deepEqual(settings.get(), DEFAULT_SETTINGS);
});

test('setAccent con el acento actual no cambia nada ni desbloquea "A mi estilo"', () => {
  const before = settings.get();
  setAccent('#107c10');
  assert.equal(settings.get(), before);
  assert.equal(unlocked()['a-mi-estilo'], undefined);
});

test('setAccent con otro color de la paleta lo cambia y desbloquea una sola vez', () => {
  setAccent('#0063b1');
  assert.equal(settings.get().accent, '#0063B1');
  assert.ok(unlocked()['a-mi-estilo']);
  setAccent('#744DA9');
  assert.equal(settings.get().accent, '#744DA9');
  assert.equal(achToasts('a-mi-estilo'), 1);
});

test('setAccent con un hex fuera de la paleta no hace nada', () => {
  const before = settings.get();
  setAccent('#123456');
  setAccent('rojo');
  assert.equal(settings.get(), before);
  assert.equal(unlocked()['a-mi-estilo'], undefined);
});

test("setDataLang('es') con es activo no desbloquea; 'en' sí; 'xx' no hace nada", () => {
  setDataLang('es');
  assert.equal(unlocked()['poliglota'], undefined);
  setDataLang('xx');
  assert.equal(settings.get().dataLang, 'es');
  assert.equal(unlocked()['poliglota'], undefined);
  setDataLang('en');
  assert.equal(settings.get().dataLang, 'en');
  assert.ok(unlocked()['poliglota']);
  setDataLang('fr');
  assert.equal(achToasts('poliglota'), 1);
});

test('setGamertag valida y, si es inválido, el store no cambia', () => {
  assert.deepEqual(setGamertag('   '), { error: 'Usa de 1 a 15 letras, números, espacios, _ o -' });
  assert.equal(settings.get().gamertag, 'Entrenador');
  assert.deepEqual(setGamertag('  Ash Ketchum  '), { ok: true });
  assert.equal(settings.get().gamertag, 'Ash Ketchum');
});

test('setAvatar acepta 1–1025 y la silueta', () => {
  assert.deepEqual(setAvatar({ pokemonId: 25 }), { ok: true });
  assert.deepEqual(settings.get().avatar, { pokemonId: 25 });
  assert.deepEqual(setAvatar({ pokemonId: 1026 }), { error: 'Elige un número entre 1 y 1025' });
  assert.deepEqual(settings.get().avatar, { pokemonId: 25 });
  setAvatar('default');
  assert.equal(settings.get().avatar, 'default');
});
