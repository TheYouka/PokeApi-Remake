// Teclado (§11.4): tecla → acción del bus, reglas de campos de texto y regla única de preventDefault.
import { setInput } from '../state/input';
import { dispatch, type NavAction } from './actions';
import { isTextField, leaveField } from './focusEngine';

const ARROWS: Record<string, NavAction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const WASD: Record<string, NavAction> = { w: 'up', s: 'down', a: 'left', d: 'right' };
const KEYS: Record<string, NavAction> = {
  Escape: 'back', Backspace: 'back',
  q: 'lb', e: 'rb', '[': 'lt', ']': 'rt',
  g: 'guide', Home: 'guide',
  x: 'x', '/': 'y',
};

type DigitHandler = (d: number) => boolean;
let digitHandler: DigitHandler | null = null;
/** Teclas 1–6 fuera de campos (solo las usa RetroScreen). Devuelve la baja. */
export function registerDigitHandler(fn: DigitHandler): () => void {
  digitHandler = fn;
  return () => { if (digitHandler === fn) digitHandler = null; };
}

const hasNativeActivation = (el: Element) => el.matches('a[href], button, input, select, textarea, summary');

/** Listener de `keydown` en window (fase bubble). */
export function handleKeydown(e: KeyboardEvent): void {
  if (e.isComposing || e.ctrlKey || e.altKey || e.metaKey) return;
  setInput('keyboard');
  const active = document.activeElement;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

  // Dentro de un campo de texto solo salen ↑↓ (dirección) y Escape (leaveField, no es Atrás).
  if (isTextField(active)) {
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      e.preventDefault();
      dispatch(ARROWS[key]!, 'keyboard');
    } else if (key === 'Escape') {
      e.preventDefault();
      leaveField();
    }
    return;
  }

  const arrow = ARROWS[key];
  if (arrow) {
    e.preventDefault();                                  // siempre, aunque no haya candidato
    dispatch(arrow, 'keyboard');
    return;
  }

  const direction = WASD[key];
  if (direction) {
    if (dispatch(direction, 'keyboard')) e.preventDefault();
    return;
  }

  if (key === 'Enter') {
    // Nativo en a y button; en [data-nav] sin activación nativa → click().
    if (active instanceof HTMLElement && active.matches('[data-nav]') && !hasNativeActivation(active)) {
      if (e.repeat) { e.preventDefault(); return; }
      e.preventDefault();
      active.click();
    }
    return;
  }

  if (key === ' ') {
    // Nativo en button; en a y [data-nav] → click().
    if (active instanceof HTMLElement && !active.matches('button') && active.matches('a[href], [data-nav]')) {
      e.preventDefault();
      if (!e.repeat) active.click();
    }
    return;
  }

  if (/^[1-6]$/.test(key)) {
    if (digitHandler && !e.repeat && digitHandler(Number(key))) e.preventDefault();
    return;
  }

  const action = KEYS[key];
  if (!action) return;
  if (e.repeat) {                                        // no se repiten Atrás, pestañas ni Guía
    e.preventDefault();
    return;
  }
  if (dispatch(action, 'keyboard')) e.preventDefault();
}
