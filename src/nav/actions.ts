// Bus de acciones con capas y regla de modalidad (§11.2). Sin DOM: se prueba en Node.
import { useEffect, useRef } from 'react';

export type NavAction = 'up'|'down'|'left'|'right'|'accept'|'back'|'lb'|'rb'|'lt'|'rt'|'guide'|'x'|'y'|'any';
export type Layer = 0 /*base*/ | 1 /*pantalla*/ | 2 /*picker*/ | 3 /*guía*/ | 4 /*diálogo*/ | 5 /*arranque*/;
export type Src = 'keyboard'|'gamepad'|'hint';
export type ActionHandler = (src: Src) => boolean;

interface Entry { action: NavAction; handler: ActionHandler }
const registry = new Map<Layer, Entry[]>();
const listeners = new Set<() => void>();
const notify = () => { for (const fn of [...listeners]) fn(); };

/** Handlers de `a` (del último registrado al primero) y después los de 'any'. */
function handlersFor(layer: Layer, a: NavAction): ActionHandler[] {
  const list = registry.get(layer) ?? [];
  const exact: ActionHandler[] = [];
  const any: ActionHandler[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i]!;
    if (e.action === a) exact.push(e.handler);
    else if (e.action === 'any') any.push(e.handler);
  }
  return [...exact, ...any];
}

/** API sin React (la usan los tests). Devuelve la baja. */
export function registerAction(action: NavAction, handler: ActionHandler, layer: Layer): () => void {
  const entry: Entry = { action, handler };
  const list = registry.get(layer) ?? [];
  list.push(entry);
  registry.set(layer, list);
  notify();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const cur = registry.get(layer) ?? [];
    const i = cur.indexOf(entry);
    if (i >= 0) cur.splice(i, 1);
    notify();
  };
}

const MODAL_PASS: ReadonlySet<NavAction> = new Set(['up', 'down', 'left', 'right', 'accept']);
const overlayStack: Layer[] = [];                      // capas 2..5 abiertas, en orden de apertura
const overlayTokens: object[] = [];                    // identidad de cada apertura (paralelo a overlayStack)
export function topOpenOverlayLayer(): Layer | null {
  if (overlayStack.includes(5)) return 5;               // el arranque siempre manda
  return overlayStack.at(-1) ?? null;                   // si no, el último overlay abierto
}
export function dispatch(a: NavAction, src: Src): boolean {
  const top = topOpenOverlayLayer();
  for (const layer of [5, 4, 3, 2, 1, 0] as const) {
    if (top !== null && layer !== top && !(layer === 0 && MODAL_PASS.has(a))) continue;
    for (const h of handlersFor(layer, a)) if (h(src)) return true;   // los de `a` (del último registrado
  }                                                                    // al primero) y después los de 'any'
  return top !== null;                                  // con overlay abierto, lo no atendido se traga
}

/** La llaman Overlay y BootSequence; devuelve el cierre (idempotente). */
export function openOverlayLayer(layer: 2 | 3 | 4 | 5): () => void {
  const token = {};
  overlayStack.push(layer);
  overlayTokens.push(token);
  notify();
  return () => {
    const i = overlayTokens.indexOf(token);
    if (i < 0) return;
    overlayTokens.splice(i, 1);
    overlayStack.splice(i, 1);
    notify();
  };
}

/**
 * ¿Hay alguien que atienda `a` ahora mismo? Misma regla de modalidad que `dispatch`
 * (decisión P-6): con un overlay abierto solo cuentan su capa y, para direcciones y `accept`, la base.
 * Los handlers 'any' no cuentan (no generan pistas).
 */
export function isActionAvailable(a: NavAction): boolean {
  const top = topOpenOverlayLayer();
  for (const layer of [5, 4, 3, 2, 1, 0] as const) {
    if (top !== null && layer !== top && !(layer === 0 && MODAL_PASS.has(a))) continue;
    if ((registry.get(layer) ?? []).some((e) => e.action === a)) return true;
  }
  return false;
}

/** Aviso al registrar o quitar handlers y al abrir o cerrar capas (para la barra de pistas). */
export function subscribeActions(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** registerAction en un efecto; el handler más reciente se usa sin volver a registrar. */
export function useAction(action: NavAction, handler: ActionHandler, layer: Layer): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => registerAction(action, (src) => ref.current(src), layer), [action, layer]);
}
