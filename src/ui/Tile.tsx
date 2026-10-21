// Tile (§8.2, §10.3): <Link> o <button> con tamaño, variante, icono, título, subtítulo, contador y
// caras rotativas opcionales (live tiles, §10.9). aria-label obligatorio; las caras van aria-hidden.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import { usePreloadOnDwell } from '../app/preload';
import { useReducedMotion } from '../state/motion';
import { Icon, type IconName } from './icons';
import styles from './Tile.module.css';

export type TileSize = 'small' | 'medium' | 'wide' | 'large';
export type TileVariant = 'accent' | 'surface' | 'image';

const ICON_SIZE: Record<TileSize, number> = { small: 32, medium: 48, wide: 64, large: 64 };
export const LIVE_ROTATE_MS = 6000;

export interface TileProps {
  id: string;
  size: TileSize;
  variant?: TileVariant;
  title: string;
  subtitle?: string;
  counter?: string;
  icon?: IconName;
  /** Siempre presente: es lo que se anuncia (las caras no). */
  ariaLabel: string;
  to?: string;
  onClick?: () => void;
  autofocus?: boolean;
  /** Fondo de la variante image (SpriteImage, collage…). Decorativo. */
  media?: ReactNode;
  /** Caras rotativas del live tile; con una sola cara no rota. */
  live?: ReactNode[];
  /** Cara fija con movimiento reducido (por defecto la 2.ª si existe). */
  reducedFace?: number;
  /** Subtítulo en --font-mono (slugs del Explorador). */
  monoSubtitle?: boolean;
  /** Ref del elemento (p. ej. para pedir datos solo cuando el tile es visible). */
  elRef?: RefObject<HTMLElement | null>;
  /** Atributos data-* extra (p. ej. data-resource-tile). */
  dataAttrs?: Record<`data-${string}`, string>;
}

export function Tile({
  id, size, variant = 'surface', title, subtitle, counter, icon, ariaLabel, to, onClick, autofocus = false,
  media, live, reducedFace, monoSubtitle = false, elRef, dataAttrs,
}: TileProps) {
  const preload = usePreloadOnDwell(to);
  const common = {
    ...dataAttrs,
    className: styles.tile,
    'data-size': size,
    'data-variant': variant,
    'data-focus-id': `tile:${id}`,
    'data-autofocus': autofocus ? '' : undefined,
    'data-live': live && live.length > 0 ? '' : undefined,
    'aria-label': ariaLabel,
  };
  const body = (
    <>
      {media ? <span className={styles.media} aria-hidden="true">{media}</span> : null}
      {live && live.length > 0 ? (
        <LiveFaces faces={live} reducedFace={reducedFace} />
      ) : (
        <span className={styles.content} aria-hidden="true">
          {icon ? <span className={styles.icon}><Icon name={icon} size={ICON_SIZE[size]} /></span> : null}
          {counter ? <span className={`${styles.counter} tabular`}>{counter}</span> : null}
          <span className={styles.text}>
            <span className={styles.title}>{title}</span>
            {subtitle ? <span className={`${styles.subtitle} ${monoSubtitle ? styles.mono : ''}`}>{subtitle}</span> : null}
          </span>
        </span>
      )}
    </>
  );
  if (to !== undefined) {
    return <Link ref={elRef as RefObject<HTMLAnchorElement> | undefined} to={to} viewTransition {...common} {...preload} onClick={onClick}>{body}</Link>;
  }
  return <button ref={elRef as RefObject<HTMLButtonElement> | undefined} type="button" {...common} onClick={onClick}>{body}</button>;
}

/**
 * Caras de un live tile: cambian cada 6 s (translateY(-100%), 600 ms --ease-emph). Se pausan con
 * :hover, :focus-within y document.hidden. Con movimiento reducido no rotan: cara fija.
 */
function LiveFaces({ faces, reducedFace }: { faces: ReactNode[]; reducedFace: number | undefined }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState({ cur: 0, prev: -1, tick: 0 });
  const count = faces.length;

  useEffect(() => {
    if (reduced || count < 2) return;
    const host = ref.current?.parentElement;
    let paused = false;
    const isPaused = () => paused || document.hidden;
    const pause = () => { paused = true; };
    const resume = () => { paused = host ? host.matches(':hover, :focus-within') : false; };
    host?.addEventListener('pointerenter', pause);
    host?.addEventListener('pointerleave', resume);
    host?.addEventListener('focusin', pause);
    host?.addEventListener('focusout', resume);
    const timer = setInterval(() => {
      if (isPaused()) return;
      setState((s) => ({ cur: (s.cur + 1) % count, prev: s.cur, tick: s.tick + 1 }));
    }, LIVE_ROTATE_MS);
    return () => {
      clearInterval(timer);
      host?.removeEventListener('pointerenter', pause);
      host?.removeEventListener('pointerleave', resume);
      host?.removeEventListener('focusin', pause);
      host?.removeEventListener('focusout', resume);
    };
  }, [reduced, count]);

  if (reduced || count < 2) {
    const fixed = Math.min(Math.max(reducedFace ?? (count > 1 ? 1 : 0), 0), count - 1);
    return (
      <span ref={ref} className={styles.faces} aria-hidden="true">
        <span className={styles.face}>{faces[fixed]}</span>
      </span>
    );
  }
  const cur = Math.min(state.cur, count - 1);
  return (
    <span ref={ref} className={styles.faces} aria-hidden="true">
      {state.prev >= 0 && state.prev < count && state.tick > 0 ? (
        <span key={`p${state.tick}`} className={`${styles.face} ${styles.faceOut}`}>{faces[state.prev]}</span>
      ) : null}
      <span key={`c${state.tick}`} className={`${styles.face} ${state.tick > 0 ? styles.faceIn : ''}`}>{faces[cur]}</span>
    </span>
  );
}
