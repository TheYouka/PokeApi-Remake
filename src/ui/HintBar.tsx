// Barra de pistas (§10.7, decisión P-6). Fuera de #app-root (se puede pulsar con un overlay abierto);
// cada pista es un <button data-sfx="none" tabIndex={-1}> que despacha su acción con src 'hint'.
// Las base (data-core) siempre; las de la pantalla (useHints) solo si su acción está disponible.
import { useEffect, useReducer, useRef } from 'react';
import { es } from '../i18n/es';
import { dispatch, isActionAvailable, subscribeActions, type NavAction } from '../nav/actions';
import { input } from '../state/input';
import { createStore, useStore } from '../state/store';
import { Glyph, type GlyphKind } from './Glyph';
import styles from './HintBar.module.css';

export type HintKey = keyof typeof es.hints.keys;
export interface Hint {
  /** Acción que despacha al pulsarla (y cuya disponibilidad decide si se pinta). */
  action: NavAction;
  label: string;
  /** Tecla/glifo que se muestra (por defecto, el de la acción). */
  key?: HintKey;
}

const KEY_OF: Partial<Record<NavAction, HintKey>> = {
  accept: 'accept', back: 'back', guide: 'guide', lb: 'lbrb', rb: 'lbrb', lt: 'ltrt', rt: 'ltrt', x: 'x', y: 'y',
};
const GLYPH_OF: Record<HintKey, GlyphKind> = {
  accept: 'a', back: 'b', guide: 'menu', lbrb: 'lbrb', ltrt: 'ltrt', x: 'x', y: 'y',
};

const CORE: readonly Hint[] = [
  { action: 'accept', label: es.hints.select, key: 'accept' },
  { action: 'back', label: es.hints.back, key: 'back' },
  { action: 'guide', label: es.hints.menu, key: 'guide' },
];

// Pistas publicadas por las pantallas montadas (la última publicada manda).
const published = createStore<{ token: object; hints: readonly Hint[] }[]>([]);

/** Publica las pistas de la pantalla mientras está montada. */
export function useHints(hints: readonly Hint[]): void {
  const sig = hints.map((h) => `${h.action}|${h.label}|${h.key ?? ''}`).join(';');
  const ref = useRef(hints);
  ref.current = hints;
  useEffect(() => {
    const token = {};
    published.set((list) => [...list, { token, hints: ref.current }]);
    return () => published.set((list) => list.filter((e) => e.token !== token));
  }, [sig]);
}

export function HintBar({ inert = false }: { inert?: boolean }) {
  const device = useStore(input, (d) => d);
  const screenHints = useStore(published, (list) => list.at(-1)?.hints ?? []);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeActions(rerender), []);

  const extra = screenHints.filter((h) => isActionAvailable(h.action));
  return (
    <footer className={`${styles.bar} hintbar acrylic`} data-hintbar="" inert={inert} aria-label={es.hints.bar}>
      {CORE.map((h) => <HintButton key={`core-${h.action}`} hint={h} core device={device} />)}
      {extra.map((h) => <HintButton key={`${h.action}-${h.label}`} hint={h} core={false} device={device} />)}
    </footer>
  );
}

function HintButton({ hint, core, device }: { hint: Hint; core: boolean; device: string }) {
  const key = hint.key ?? KEY_OF[hint.action] ?? 'accept';
  const aria = es.hints.aria(hint.label, es.hints.ariaKeys[key]);
  return (
    <button
      type="button"
      className={`${styles.hint} hint`}
      data-core={core ? '' : undefined}
      data-sfx="none"
      tabIndex={-1}
      aria-label={aria}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => { dispatch(hint.action, 'hint'); }}
    >
      {device === 'gamepad' ? <Glyph kind={GLYPH_OF[key]} /> : null}
      {device === 'keyboard' || device === 'pointer' ? <kbd className={styles.kbd} aria-hidden="true">{es.hints.keys[key]}</kbd> : null}
      <span className={styles.text} aria-hidden="true">{hint.label}</span>
    </button>
  );
}
