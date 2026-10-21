// Base común de la Guía, los diálogos y los pickers (§8.1). Modal para el foco y para las acciones:
// portal a #overlay-root, #app-root inerte (lo aplica ShellLayout con useOverlayOpen), capa propia
// en el bus de acciones, foco guardado y restaurado, Tab que cicla y apilado (el de abajo, inerte).
import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { play } from '../audio/sfx';
import { openOverlayLayer, registerAction } from '../nav/actions';
import { createStore, useStore } from '../state/store';
import styles from './Overlay.module.css';

export type OverlayLayer = 2 | 3 | 4;

// Pila de overlays abiertos (ids en orden de apertura): manda el último.
const stack = createStore<string[]>([]);
/** ¿Hay algún overlay abierto? (ShellLayout pone `inert` en #app-root). */
export const useOverlayOpen = (): boolean => useStore(stack, (s) => s.length > 0);

interface OverlayCtx { close: () => void }
const OverlayContext = createContext<OverlayCtx>({ close: () => {} });
/** `close()` = el mismo manejador de `back` del overlay (suena `back`). Lo usan ✕ y "Cancelar". */
export const useOverlay = (): OverlayCtx => useContext(OverlayContext);

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OverlayProps {
  layer: OverlayLayer;
  /** Cierra el overlay (lo llama el padre quitándolo del árbol). */
  onClose: () => void;
  /** 'center' (diálogos y pickers) o 'start' (panel de la Guía, a la izquierda). */
  placement?: 'center' | 'start';
  children: ReactNode;
}

export function Overlay({ layer, onClose, placement = 'center', children }: OverlayProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [host] = useState(() => (typeof document === 'undefined' ? null : document.getElementById('overlay-root')));
  // Antes de apilarse (primer render) ya es el de arriba: así nunca se monta inerte.
  const isTop = useStore(stack, (s) => !s.includes(id) || s.at(-1) === id);

  const close = useCallback(() => {
    play('back');
    onCloseRef.current();
  }, []);

  // Apilado + capa del bus + back → cerrar (en su capa).
  useLayoutEffect(() => {
    stack.set((s) => [...s, id]);
    const release = openOverlayLayer(layer);
    const unregister = registerAction('back', () => { close(); return true; }, layer);
    return () => {
      unregister();
      release();
      stack.set((s) => s.filter((x) => x !== id));
    };
  }, [id, layer, close]);

  // Foco: se guarda al abrir (en el primer render, antes de que #app-root pase a inert y el navegador
  // lo suelte) y se restaura al cerrar si sigue conectado y nadie lo ha movido. El reintento en el
  // siguiente fotograma cubre el caso en que #app-root aún estaba inerte al desmontar.
  const [previous] = useState<HTMLElement | null>(() =>
    (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null));
  const restoreFrame = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(restoreFrame.current);
    const root = rootRef.current;
    if (root) {
      const auto = root.querySelector<HTMLElement>('[data-autofocus]');
      const first = auto ?? root.querySelector<HTMLElement>(TABBABLE);
      (first ?? root).focus({ preventScroll: true });
    }
    return () => {
      const restore = () => {
        const active = document.activeElement;
        const lost = !active || active === document.body || (root?.contains(active) ?? false);
        if (previous && previous.isConnected && lost) previous.focus({ preventScroll: true });
      };
      restore();
      restoreFrame.current = requestAnimationFrame(restore);
    };
  }, [previous]);

  // Tab y Shift+Tab ciclan dentro del overlay (inert no impide salir a la interfaz del navegador).
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !rootRef.current) return;
    const list = [...rootRef.current.querySelectorAll<HTMLElement>(TABBABLE)]
      .filter((el) => el.getClientRects().length > 0 && !el.closest('[inert]'));
    if (list.length === 0) { e.preventDefault(); return; }
    const first = list[0]!;
    const last = list[list.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !rootRef.current.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !rootRef.current.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!host) return null;
  return createPortal(
    <OverlayContext.Provider value={{ close }}>
      <div
        ref={rootRef}
        className={styles.layer}
        data-layer={layer}
        data-placement={placement}
        inert={!isTop}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className={styles.scrim} aria-hidden="true" onClick={close} />
        {children}
      </div>
    </OverlayContext.Provider>,
    host,
  );
}
