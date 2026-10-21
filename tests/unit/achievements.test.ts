// Catálogo y reductor de logros (§10.10, AC-32, AC-33).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RESOURCE_KEYS } from '../../src/api/resources';
import { ACHIEVEMENTS, TOTAL_POINTS } from '../../src/state/achievementCatalog';
import {
  achievements, emptyAchState, gamerscoreOf, reduceAchievements, track, trackVisit, validateAchState, visitEvent,
  type AchEvent, type AchState,
} from '../../src/state/achievements';
import { clearNotifications, notifications } from '../../src/state/notifications';
import { clearToasts, toasts } from '../../src/state/toasts';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
/** Aplica una serie de eventos y acumula los desbloqueos. */
function run(events: AchEvent[], start: AchState = emptyAchState()) {
  let state = start;
  const unlocked: string[] = [];
  for (const ev of events) {
    const r = reduceAchievements(state, ev, NOW);
    state = r.state;
    unlocked.push(...r.unlocked);
  }
  return { state, unlocked };
}

beforeEach(() => {
  achievements.reset();
  clearToasts();
  clearNotifications();
});

test('catálogo: 22 logros con ids únicos que suman 1000 G', () => {
  assert.equal(ACHIEVEMENTS.length, 22);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 22);
  assert.equal(TOTAL_POINTS, 1000);
  assert.equal(ACHIEVEMENTS.reduce((s, a) => s + a.points, 0), 1000);
});

test('idempotencia: un logro desbloqueado no vuelve a aparecer y el estado no cambia', () => {
  const first = reduceAchievements(emptyAchState(), { type: 'boot-complete' }, NOW);
  assert.deepEqual(first.unlocked, ['primer-encendido']);
  assert.equal(first.state.unlocked['primer-encendido'], new Date(NOW).toISOString());
  const second = reduceAchievements(first.state, { type: 'boot-complete' }, NOW + 1000);
  assert.deepEqual(second.unlocked, []);
  assert.equal(second.state, first.state);
});

test('Investigador a los 10 Pokémon distintos (los repetidos no cuentan)', () => {
  const nine = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((id): AchEvent => ({ type: 'pokemon-viewed', id }));
  const a = run([...nine, { type: 'pokemon-viewed', id: 9 }, { type: 'pokemon-viewed', id: 1 }]);
  assert.deepEqual(a.unlocked, ['entrenador-novato']);
  assert.equal(a.state.counters.pokemonSeen.length, 9);
  const b = run([{ type: 'pokemon-viewed', id: 10 }], a.state);
  assert.deepEqual(b.unlocked, ['investigador']);
});

test("dos berry-viewed{name:'cheri'} cuentan 1", () => {
  const r = run([{ type: 'berry-viewed', name: 'cheri' }, { type: 'berry-viewed', name: 'cheri' }]);
  assert.deepEqual(r.state.counters.berriesSeen, ['cheri']);
});

test('Botánico a las 10 bayas distintas', () => {
  const names = ['cheri', 'chesto', 'pecha', 'rawst', 'aspear', 'leppa', 'oran', 'persim', 'lum', 'sitrus'];
  const r = run(names.map((name): AchEvent => ({ type: 'berry-viewed', name })));
  assert.deepEqual(r.unlocked, ['botanico']);
});

test('Trotamundos: con total 3 no con 2 distintos (ni repitiendo), sí con el tercero; con total 0 nunca', () => {
  const two = run([
    { type: 'region-viewed', name: 'kanto', total: 3 },
    { type: 'region-viewed', name: 'johto', total: 3 },
    { type: 'region-viewed', name: 'johto', total: 3 },
  ]);
  assert.deepEqual(two.unlocked, []);
  const three = run([{ type: 'region-viewed', name: 'hoenn', total: 3 }], two.state);
  assert.deepEqual(three.unlocked, ['trotamundos']);
  const zero = run([
    { type: 'region-viewed', name: 'kanto', total: 0 },
    { type: 'region-viewed', name: 'johto', total: 0 },
  ]);
  assert.deepEqual(zero.unlocked, []);
});

test("trackVisit('berry', {name:'cheri'}) emite berry-viewed y trackVisit('type', …) nada", () => {
  assert.deepEqual(visitEvent('berry', { name: 'cheri' }), { type: 'berry-viewed', name: 'cheri' });
  assert.deepEqual(visitEvent('item', { name: 'potion' }), { type: 'item-viewed', name: 'potion' });
  assert.deepEqual(visitEvent('move', { name: 'pound' }), { type: 'move-viewed', name: 'pound' });
  assert.equal(visitEvent('type', { name: 'electric' }), null);
  trackVisit('berry', { name: 'cheri' });
  assert.deepEqual(achievements.get().counters.berriesSeen, ['cheri']);
  const before = achievements.get();
  trackVisit('type', { name: 'electric' });
  assert.equal(achievements.get(), before);
});

test('gamerscore derivado y track encola toast y notificación por desbloqueo', () => {
  assert.equal(gamerscoreOf(achievements.get()), 0);
  assert.deepEqual(track({ type: 'boot-complete' }), ['primer-encendido']);
  assert.deepEqual(track({ type: 'boot-complete' }), []);
  track({ type: 'type-chart-opened' });
  assert.equal(gamerscoreOf(achievements.get()), 10 + 40);
  assert.deepEqual(toasts.get(), [{ kind: 'achievement', id: 'primer-encendido' }, { kind: 'achievement', id: 'maestro-tipos' }]);
  const notes = notifications.get().filter((n) => n.kind === 'achievement');
  assert.equal(notes.length, 2);
  assert.equal(notes[1]!.title, 'Logro desbloqueado — 10G');
});

test('Explorador total con las 50 claves de RESOURCE_KEYS (incluida pokemon) y no con 49', () => {
  assert.equal(RESOURCE_KEYS.length, 50);
  assert.ok(RESOURCE_KEYS.includes('pokemon'));
  const visits = RESOURCE_KEYS.map((resource): AchEvent => ({ type: 'resource-list-visited', resource }));
  const fortyNine = run([...visits.slice(0, 49), visits[0]!]);
  assert.equal(fortyNine.state.counters.listsVisited.length, 49);
  assert.ok(!fortyNine.unlocked.includes('explorador-total'));
  const fifty = run([visits[49]!], fortyNine.state);
  assert.deepEqual(fifty.unlocked, ['explorador-total']);
});

test('lectura tolerante: claves desconocidas fuera y contadores acotados', () => {
  const s = validateAchState({
    unlocked: { 'primer-encendido': '2026-10-20T12:00:00.000Z', 'inventado': '2026-10-20T12:00:00.000Z', 'rivales': 3 },
    counters: { pokemonSeen: [1, 1, 2, -3, 'x', ...Array.from({ length: 100 }, (_, i) => i + 10)], listsVisited: ['berry', 'nope'] },
    extra: true,
  });
  assert.ok(s);
  assert.deepEqual(Object.keys(s.unlocked), ['primer-encendido']);
  assert.equal(s.counters.pokemonSeen.length, 60);
  assert.deepEqual(s.counters.pokemonSeen.slice(0, 3), [1, 2, 10]);
  assert.deepEqual(s.counters.listsVisited, ['berry']);
  assert.equal(s.counters.quickPlays, 0);
  assert.equal(validateAchState('basura'), null);
});
