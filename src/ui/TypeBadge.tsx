// TypeBadge (§8.2): color del tipo, texto localizado (useLocalizedLabel 'fetch') y color de texto
// calculado por contraste. data-type="{slug}" (lo usa el escenario 21). Con `lazy`, la etiqueta solo se
// pide tras 150 ms visible (hasta entonces, la de la caché o el slug): lo usa el grupo ×1 de la efectividad.
import { useRef, type RefObject } from 'react';
import type { NamedAPIResource } from '../api/types/common';
import { useInViewDwell, useLocalizedLabel, type LocalizedLabel } from '../data/hooks';
import { textOn, typeColor } from './colors';
import styles from './TypeBadge.module.css';

export interface TypeBadgeProps {
  type: NamedAPIResource<'type'>;
  size?: 'small' | 'normal';
  lazy?: boolean;
}

function Badge({ type, size, label, elRef }: Required<Omit<TypeBadgeProps, 'lazy'>> & { label: LocalizedLabel; elRef?: RefObject<HTMLSpanElement | null> }) {
  const bg = typeColor(type.name);
  return (
    <span
      ref={elRef}
      className={styles.badge}
      data-type={type.name}
      data-size={size}
      style={{ background: bg, color: textOn(bg) }}
      lang={label.lang ?? undefined}
    >
      {label.text}
    </span>
  );
}

function EagerBadge({ type, size }: Required<Omit<TypeBadgeProps, 'lazy'>>) {
  const label = useLocalizedLabel(type, 'fetch');
  return <Badge type={type} size={size} label={label} />;
}

function LazyBadge({ type, size }: Required<Omit<TypeBadgeProps, 'lazy'>>) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInViewDwell(ref);
  const label = useLocalizedLabel(type, 'fetch', { enabled: visible });
  return <Badge type={type} size={size} label={label} elRef={ref} />;
}

export function TypeBadge({ type, size = 'normal', lazy = false }: TypeBadgeProps) {
  return lazy ? <LazyBadge type={type} size={size} /> : <EagerBadge type={type} size={size} />;
}
