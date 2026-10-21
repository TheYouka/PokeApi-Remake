// StatBars (§8.2, §13.2, RF-POK-4): PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad + Total.
// Escala 0–255 con el degradado "smogonType" del original (#ff0000 → #c5fc00 a .29 → #00ff00 de .78 a 1).
// La anchura se anima 600 ms con transform (sin animación con movimiento reducido). Variante espejo
// para Comparar: 'left' crece hacia la izquierda y 'right' hacia la derecha.
import { useEffect, useState } from 'react';
import type { PokemonStat } from '../api/types/pokemon';
import { es } from '../i18n/es';
import { useReducedMotion } from '../state/motion';
import styles from './StatBars.module.css';

export const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export const MAX_STAT = 255;

type RGB = [number, number, number];
const STOPS: [number, RGB][] = [[0, [0xff, 0, 0]], [0.29, [0xc5, 0xfc, 0]], [0.78, [0, 0xff, 0]], [1, [0, 0xff, 0]]];
const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** Color del degradado del original en t = valor/255. */
export function statColor(value: number): string {
  const t = Math.min(1, Math.max(0, value / MAX_STAT));
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i]!;
    const [t0, c0] = STOPS[i - 1]!;
    if (t <= t1) {
      const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return `#${hex(c0[0] + (c1[0] - c0[0]) * k)}${hex(c0[1] + (c1[1] - c0[1]) * k)}${hex(c0[2] + (c1[2] - c0[2]) * k)}`;
    }
  }
  return '#00ff00';
}

/** Valores en el orden de STAT_KEYS (0 si falta). */
export function statValues(stats: readonly PokemonStat[]): number[] {
  return STAT_KEYS.map((k) => stats.find((s) => s.stat.name === k)?.base_stat ?? 0);
}

export interface StatBarsProps {
  /** 6 valores en el orden de STAT_KEYS. */
  values: readonly number[];
  /** ▲ / ▼ por estadística (naturaleza). */
  modifiers?: Partial<Record<StatKey, 'up' | 'down'>>;
  variant?: 'normal' | 'left' | 'right';
  /** Oculta las etiquetas (la columna central de Comparar ya las muestra). */
  hideLabels?: boolean;
  showTotal?: boolean;
  /** data-compare-side del contenedor. */
  compareSide?: 'a' | 'b';
}

export function StatBars({ values, modifiers = {}, variant = 'normal', hideLabels = false, showTotal = true, compareSide }: StatBarsProps) {
  const reduced = useReducedMotion();
  const [grown, setGrown] = useState(reduced);
  useEffect(() => {
    if (reduced) { setGrown(true); return; }
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);
  const total = values.reduce((s, v) => s + v, 0);

  return (
    <div
      className={styles.bars}
      data-variant={variant}
      data-labels={hideLabels ? 'hidden' : undefined}
      data-compare-side={compareSide}
      role="list"
      aria-label={es.stats.listLabel}
    >
      {STAT_KEYS.map((key, i) => {
        const value = values[i] ?? 0;
        const label = es.stats.labels[key]!;
        const mod = modifiers[key];
        const note = mod === 'up' ? es.stats.upNote : mod === 'down' ? es.stats.downNote : undefined;
        return (
          <div key={key} role="listitem" className={styles.row} data-stat={key} data-value={value} aria-label={es.stats.barAria(label, value, note)}>
            {hideLabels ? null : <span className={styles.label} aria-hidden="true">{label}</span>}
            <span className={`${styles.value} tabular`} aria-hidden="true">
              {value}
              {mod ? <span className={styles.mod} data-mod={mod}>{mod === 'up' ? es.stats.up : es.stats.down}</span> : null}
            </span>
            <span className={styles.track} aria-hidden="true">
              <span
                className={styles.fill}
                data-animate={reduced ? undefined : ''}
                style={{ background: statColor(value), transform: `scaleX(${grown ? Math.min(1, value / MAX_STAT) : 0})` }}
              />
            </span>
          </div>
        );
      })}
      {showTotal ? (
        <div className={`${styles.row} ${styles.totalRow}`} role="listitem" data-stat="total" data-value={total} aria-label={es.stats.barAria(es.stats.total, total)}>
          {hideLabels ? null : <span className={styles.label} aria-hidden="true">{es.stats.total}</span>}
          <span className={`${styles.value} tabular`} aria-hidden="true">{total}</span>
          <span className={styles.track} aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}
