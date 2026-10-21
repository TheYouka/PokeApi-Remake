// Componente sin UI: listeners de teclado y puntero, handlers de la capa 0 y foco al navegar (§11).
// Es el `FocusEngine.tsx` de §3, renombrado: con un sistema de archivos sin distinción de mayúsculas
// (Windows) 'nav/FocusEngine' y 'nav/focusEngine' son el mismo módulo para tsc y Vite.
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router';
import { play } from '../audio/sfx';
import { openGuide } from '../state/guide';
import { setInput } from '../state/input';
import { useAction } from './actions';
import {
  CANDIDATE_SELECTOR, focusInitial, getLastContentFocus, isCandidate, isTextField, move, noteFocus,
  rememberFocus, restoreFocus,
} from './focusEngine';
import { handleKeydown } from './keyboard';

const RESTORE_EVERY_MS = 50;
const RESTORE_FOR_MS = 1500;
const POINTER_SLOP_PX = 4;

export function FocusEngine(): null {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const keyRef = useRef(location.key);
  keyRef.current = location.key;

  // Teclado, puntero y memoria de foco.
  useEffect(() => {
    let last: { x: number; y: number } | null = null;
    const onPointerMove = (e: PointerEvent) => {
      if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) <= POINTER_SLOP_PX) return;
      const first = last === null;
      last = { x: e.clientX, y: e.clientY };
      if (!first) setInput(e.pointerType === 'touch' ? 'touch' : 'pointer');
    };
    const onPointerDown = (e: PointerEvent) => setInput(e.pointerType === 'touch' ? 'touch' : 'pointer');
    const onPointerOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;                  // con toque no se mueve el foco al pasar
      if (isTextField(document.activeElement)) return;        // nunca se saca el foco de un campo
      const target = e.target instanceof Element ? e.target.closest(CANDIDATE_SELECTOR) : null;
      if (!target || !target.matches('a, button, [data-nav]') || target === document.activeElement) return;
      if (isCandidate(target)) target.focus({ preventScroll: true });   // sin tic (§12)
    };
    const onFocusIn = (e: FocusEvent) => {
      noteFocus(e.target as Element | null);
      rememberFocus(keyRef.current, e.target as Element | null);
    };
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);

  // Capa 0: direcciones, accept, back y guide.
  useAction('up', () => move('up'), 0);
  useAction('down', () => move('down'), 0);
  useAction('left', () => move('left'), 0);
  useAction('right', () => move('right'), 0);
  useAction('accept', (src) => {
    if (src === 'hint') {
      const last = getLastContentFocus();
      if (last && last.isConnected) last.click();
      else focusInitial();
      return true;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) active.click();
    return true;
  }, 0);
  useAction('back', () => {
    // 1. Un overlay abierto lo atiende su propia capa (≥ 2) antes de llegar aquí.
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) {
      play('back');
      void navigate(-1);
      return true;
    }
    if (location.pathname !== '/') {
      play('back');
      void navigate('/');
      return true;
    }
    return false;                                          // en '/' no hace nada
  }, 0);
  useAction('guide', () => { openGuide(); return true; }, 0);

  // Foco al navegar: PUSH/REPLACE → [data-autofocus] o h1[data-focus-start]; POP → data-focus-id guardado.
  const prevPath = useRef<string | null>(null);
  useEffect(() => {
    const samePath = prevPath.current === location.pathname;
    prevPath.current = location.pathname;
    if (navType !== 'POP' && samePath) return;             // solo cambia la query: el foco se queda
    const startedAt = Date.now();
    const key = location.key;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const attempt = () => {
      const done = navType === 'POP' ? restoreFocus(key) : focusInitial();
      if (done) return;
      if (Date.now() - startedAt >= RESTORE_FOR_MS) {
        if (navType === 'POP') focusInitial();             // no apareció: regla de PUSH
        return;
      }
      timer = setTimeout(attempt, RESTORE_EVERY_MS);
    };
    attempt();
    return () => { if (timer !== null) clearTimeout(timer); };
  }, [location.key, location.pathname, navType]);

  return null;
}
