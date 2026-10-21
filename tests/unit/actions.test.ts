// Regla de modalidad del bus de acciones (§11.2, AC-28), sin React ni DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dispatch, isActionAvailable, openOverlayLayer, registerAction, subscribeActions, topOpenOverlayLayer,
  type Layer, type NavAction,
} from '../../src/nav/actions';

/** Registra un handler que anota sus llamadas; devuelve [llamadas, baja]. */
function spy(action: NavAction, layer: Layer, result = true): [string[], () => void] {
  const calls: string[] = [];
  const off = registerAction(action, (src) => { calls.push(src); return result; }, layer);
  return [calls, off];
}

test('sin overlays, rb llega al handler de la capa 1', () => {
  const [screen, off] = spy('rb', 1);
  assert.equal(dispatch('rb', 'keyboard'), true);
  assert.deepEqual(screen, ['keyboard']);
  off();
  assert.equal(dispatch('rb', 'keyboard'), false);
});

test('con la capa 2 abierta, rb no llega a la capa 1 (se traga) y right llega a la 0', () => {
  const [screen, offScreen] = spy('rb', 1);
  const [base, offBase] = spy('right', 0);
  const release = openOverlayLayer(2);
  assert.equal(topOpenOverlayLayer(), 2);
  assert.equal(dispatch('rb', 'gamepad'), true);       // se traga: keyboard.ts hace preventDefault
  assert.deepEqual(screen, []);
  assert.equal(isActionAvailable('rb'), false);
  assert.equal(dispatch('right', 'gamepad'), true);
  assert.deepEqual(base, ['gamepad']);
  assert.equal(isActionAvailable('right'), true);
  // Tras release(), rb vuelve a la capa 1
  release();
  assert.equal(topOpenOverlayLayer(), null);
  assert.equal(dispatch('rb', 'keyboard'), true);
  assert.deepEqual(screen, ['keyboard']);
  assert.equal(isActionAvailable('rb'), true);
  release();                                           // idempotente
  assert.equal(topOpenOverlayLayer(), null);
  offScreen();
  offBase();
});

test('con la Guía (3) abierta, guide llama a su handler de cierre', () => {
  const [baseGuide, offBase] = spy('guide', 0);
  const release = openOverlayLayer(3);
  const [close, offClose] = spy('guide', 3);
  assert.equal(dispatch('guide', 'keyboard'), true);
  assert.deepEqual(close, ['keyboard']);
  assert.deepEqual(baseGuide, []);
  offClose();
  release();
  offBase();
});

test('un Picker (2) abierto encima de la Guía (3) no deja pasar rb a la Guía', () => {
  const releaseGuide = openOverlayLayer(3);
  const [guideTabs, offGuide] = spy('rb', 3);
  const releasePicker = openOverlayLayer(2);
  assert.equal(topOpenOverlayLayer(), 2);              // manda el último abierto, no el número más alto
  assert.equal(dispatch('rb', 'keyboard'), true);
  assert.deepEqual(guideTabs, []);
  releasePicker();
  assert.equal(dispatch('rb', 'keyboard'), true);
  assert.deepEqual(guideTabs, ['keyboard']);
  offGuide();
  releaseGuide();
});

test('la capa 5 (arranque) consume con any, también las direcciones', () => {
  const [base, offBase] = spy('right', 0);
  const release = openOverlayLayer(5);
  const [boot, offBoot] = spy('any', 5);
  const releaseDialog = openOverlayLayer(4);           // el arranque siempre manda
  assert.equal(topOpenOverlayLayer(), 5);
  assert.equal(dispatch('right', 'keyboard'), true);
  assert.deepEqual(boot, ['keyboard']);
  assert.deepEqual(base, []);
  releaseDialog();
  offBoot();
  release();
  offBase();
});

test('dentro de una capa, del último registrado al primero', () => {
  const release = openOverlayLayer(4);
  const order: string[] = [];
  const off1 = registerAction('back', () => { order.push('primero'); return true; }, 4);
  const off2 = registerAction('back', () => { order.push('segundo'); return true; }, 4);
  assert.equal(dispatch('back', 'keyboard'), true);
  assert.deepEqual(order, ['segundo']);
  off2();
  dispatch('back', 'keyboard');
  assert.deepEqual(order, ['segundo', 'primero']);
  off1();
  release();
});

test('un handler que devuelve false deja pasar a la capa inferior', () => {
  const [screen, offScreen] = spy('back', 1, false);
  const [base, offBase] = spy('back', 0);
  assert.equal(dispatch('back', 'hint'), true);
  assert.deepEqual(screen, ['hint']);
  assert.deepEqual(base, ['hint']);
  offScreen();
  offBase();
});

test('subscribeActions avisa al registrar, quitar, abrir y cerrar', () => {
  let n = 0;
  const unsubscribe = subscribeActions(() => { n++; });
  const off = registerAction('x', () => true, 1);
  const release = openOverlayLayer(2);
  release();
  off();
  unsubscribe();
  assert.equal(n, 4);
});
