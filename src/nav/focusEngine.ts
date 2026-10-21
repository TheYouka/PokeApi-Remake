// Motor de foco espacial: API imperativa única (§11.1, §11.3, §11.6). Solo toca el DOM al llamarse.
import { play } from '../audio/sfx';
import { pickNext, type Dir, type R } from './spatial';

export type { Dir } from './spatial';

export const CANDIDATE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [data-nav]';

/** Raíz de foco activa: el overlay superior de #overlay-root si hay alguno; si no, #app-root. */
export function getFocusRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const overlays = document.getElementById('overlay-root');
  const top = overlays?.lastElementChild;
  if (top instanceof HTMLElement) return top;
  return document.getElementById('app-root') ?? document.body;
}

/** ¿Es `el` candidato dentro de `root`? (sin inert/aria-hidden, área > 0, visible). */
export function isCandidate(el: Element, root: Element | null = getFocusRoot()): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !root || !root.contains(el)) return false;
  if (!el.matches(CANDIDATE_SELECTOR)) return false;
  if (el.closest('[inert], [aria-hidden="true"]')) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  return getComputedStyle(el).visibility !== 'hidden';
}

export function candidates(root: HTMLElement | null = getFocusRoot()): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll(CANDIDATE_SELECTOR)].filter((el): el is HTMLElement => isCandidate(el, root));
}

const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color']);
/** textarea, [contenteditable] e input cuyo type no sea checkbox/radio/button/submit/reset/range/color. */
export function isTextField(el: Element | null | undefined): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type);
  return false;
}

// ------------------------------------------------------------------ memoria

const groupMemory = new WeakMap<Element, HTMLElement>();
let lastContent: HTMLElement | null = null;
const focusByLocation = new Map<string, string>();

/** Lo llama FocusEngine en cada `focusin`: memoria por grupo y último foco de contenido. */
export function noteFocus(el: Element | null): void {
  if (!(el instanceof HTMLElement)) return;
  if (el.closest('[data-hintbar]')) return;
  lastContent = el;
  const group = el.closest('[data-focus-group]');
  if (group) groupMemory.set(group, el);
}

/** Último elemento enfocado fuera de [data-hintbar] (lo usa `accept` con src 'hint'). */
export const getLastContentFocus = (): HTMLElement | null => lastContent;

const rectOf = (el: Element): R => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
};

const reducedMotion = () => document.documentElement.dataset.motion === 'reduced';

/** Enfoca y desplaza a la vista. `tick` solo si el foco cambia (§12). */
export function focusElement(el: HTMLElement, opts: { sound?: boolean } = {}): void {
  const before = document.activeElement;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  if (opts.sound && document.activeElement === el && before !== el) play('tick');
}

/** [data-autofocus] de la raíz, o el primer candidato de main (o de la raíz). */
function initialTarget(root: HTMLElement): HTMLElement | null {
  const auto = root.querySelector('[data-autofocus]');
  if (auto instanceof HTMLElement) return auto;
  const main = root.querySelector('main') ?? root;
  return candidates(root).find((c) => main.contains(c)) ?? null;
}

/**
 * Mueve el foco en una dirección. Si el foco está en body (o fuera de la raíz) enfoca
 * [data-autofocus] o el primer candidato de main. Devuelve true si el foco cambió.
 */
export function move(dir: Dir): boolean {
  const root = getFocusRoot();
  if (!root) return false;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body || !root.contains(active)) {
    const target = initialTarget(root);
    if (!target) return false;
    focusElement(target, { sound: true });
    return document.activeElement === target;
  }
  const list = candidates(root).filter((c) => c !== active);
  const id = pickNext(rectOf(active), list.map((el, i) => ({ id: String(i), rect: rectOf(el) })), dir);
  if (id === null) return false;
  let winner = list[Number(id)]!;
  if (dir === 'up' || dir === 'down') {
    const fromGroup = active.closest('[data-focus-group]');
    const toGroup = winner.closest('[data-focus-group]');
    if (toGroup && toGroup !== fromGroup) {
      const remembered = groupMemory.get(toGroup);
      if (remembered && remembered.isConnected && remembered !== active && isCandidate(remembered, root)) winner = remembered;
    }
  }
  focusElement(winner, { sound: true });
  if (document.activeElement === winner) noteFocus(winner);
  return document.activeElement === winner;
}

/** Única forma de salir de un campo de texto: siguiente candidato abajo, si no arriba. */
export function leaveField(): boolean {
  if (!isTextField(document.activeElement)) return false;
  return move('down') || move('up');
}

/** Foco al navegar con PUSH/REPLACE: [data-autofocus] o h1[data-focus-start]. Sin sonido. */
export function focusInitial(): boolean {
  const root = getFocusRoot();
  if (!root) return false;
  const el = root.querySelector('[data-autofocus]') ?? root.querySelector('h1[data-focus-start]');
  if (!(el instanceof HTMLElement)) return false;
  el.focus({ preventScroll: true });
  return document.activeElement === el;
}

/** Guarda el data-focus-id del último foco de contenido para esa entrada del historial. */
export function rememberFocus(locationKey: string, el: Element | null = lastContent): void {
  const holder = el instanceof HTMLElement ? el.closest('[data-focus-id]') : null;
  const id = holder?.getAttribute('data-focus-id');
  if (id) focusByLocation.set(locationKey, id);
}

/** Enfoca el data-focus-id guardado si ya está en el DOM. Devuelve true si lo encontró. */
export function restoreFocus(locationKey: string): boolean {
  const id = focusByLocation.get(locationKey);
  const root = getFocusRoot();
  if (!id || !root) return false;
  const el = root.querySelector(`[data-focus-id="${CSS.escape(id)}"]`);
  if (!(el instanceof HTMLElement)) return false;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  return document.activeElement === el;
}

export const hasRememberedFocus = (locationKey: string): boolean => focusByLocation.has(locationKey);
