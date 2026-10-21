import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickNext, type R } from '../../src/nav/spatial';

const rect = (left: number, top: number, w = 100, h = 100): R => ({ left, top, right: left + w, bottom: top + h });
/** Rejilla 3×3 de 100×100 con huecos de 10 px; ids "fila-columna". */
const grid = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => ({ id: `${r}-${c}`, rect: rect(c * 110, r * 110) })));
const from = (id: string) => grid.find((g) => g.id === id)!.rect;
const others = (id: string) => grid.filter((g) => g.id !== id);

test('rejilla 3×3: cada dirección elige el vecino', () => {
  assert.equal(pickNext(from('1-1'), others('1-1'), 'right'), '1-2');
  assert.equal(pickNext(from('1-1'), others('1-1'), 'left'), '1-0');
  assert.equal(pickNext(from('1-1'), others('1-1'), 'up'), '0-1');
  assert.equal(pickNext(from('1-1'), others('1-1'), 'down'), '2-1');
});

test('el solapamiento ortogonal tiene preferencia sobre un candidato más cercano pero desalineado', () => {
  const origin = rect(0, 0);
  const aligned = { id: 'alineado', rect: rect(150, 0) };     // primary 50, ortho 0 → 50
  const offset = { id: 'desalineado', rect: rect(110, 130) }; // primary 10, ortho 30 → 70
  assert.equal(pickNext(origin, [offset, aligned], 'right'), 'alineado');
});

test('sin candidato en el borde devuelve null', () => {
  assert.equal(pickNext(from('0-2'), others('0-2'), 'right'), null);
  assert.equal(pickNext(from('0-0'), others('0-0'), 'up'), null);
  assert.equal(pickNext(from('2-0'), others('2-0'), 'left'), null);
  assert.equal(pickNext(from('2-2'), others('2-2'), 'down'), null);
});

test('un candidato a menos de 1 px de centro no es válido', () => {
  assert.equal(pickNext(rect(0, 0), [{ id: 'casi', rect: rect(0.5, 300) }], 'right'), null);
});

test('desempate estable: distancia euclídea y después orden del DOM', () => {
  const origin = rect(0, 0);
  // Mismo score (primary 10, ortho 0); el segundo está más cerca en centro → gana.
  const far = { id: 'lejos', rect: rect(110, -40) };
  const near = { id: 'cerca', rect: rect(110, 0) };
  assert.equal(pickNext(origin, [far, near], 'right'), 'cerca');
  // Idénticos: gana el primero del array (orden del DOM), sea cual sea.
  const a = { id: 'a', rect: rect(110, 0) };
  const b = { id: 'b', rect: rect(110, 0) };
  assert.equal(pickNext(origin, [a, b], 'right'), 'a');
  assert.equal(pickNext(origin, [b, a], 'right'), 'b');
});
