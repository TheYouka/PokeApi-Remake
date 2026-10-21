// Marca original de PokéBox One: una Pokébola geométrica en SVG (sin logos de terceros).
// 'outline' es solo contorno; 'filled' rellena la mitad superior de acento. Cada trazo lleva
// pathLength=1 y data-part para poder dibujarlo con stroke-dasharray (arranque, §10.5).
import type { CSSProperties } from 'react';

export interface PokeballMarkProps {
  variant?: 'outline' | 'filled';
  size?: number | string;
  /** Con título se anuncia como imagen; sin él es decorativa. */
  title?: string;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

const TOP_HALF = 'M6 50 A44 44 0 0 1 94 50 H64 A14 14 0 0 0 36 50 Z';

export function PokeballMark({ variant = 'outline', size = 96, title, className, strokeWidth = 4, style }: PokeballMarkProps) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} focusable="false" {...a11y}>
      {variant === 'filled' ? (
        <>
          <path data-part="fill-top" d={TOP_HALF} style={{ fill: 'var(--accent)' }} />
          <path data-part="fill-bottom" d="M6 50 A44 44 0 0 0 94 50 H64 A14 14 0 0 1 36 50 Z" fill="currentColor" style={{ opacity: 0.08 }} />
        </>
      ) : null}
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
        <circle data-part="ring" cx="50" cy="50" r="44" pathLength={1} />
        <path data-part="band" d="M6 50 H36 M64 50 H94" pathLength={1} />
        <circle data-part="button" cx="50" cy="50" r="14" pathLength={1} />
        <circle data-part="core" cx="50" cy="50" r="6" pathLength={1} />
      </g>
    </svg>
  );
}
