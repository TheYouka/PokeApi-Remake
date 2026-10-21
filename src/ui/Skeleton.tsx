// Skeleton (§10.11): bloques con brillo que reservan las dimensiones finales. La región que carga
// lleva aria-busy="true" y un texto oculto "Cargando…".
import type { CSSProperties, ReactNode } from 'react';
import { es } from '../i18n/es';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  className?: string;
}

export function Skeleton({ width = '100%', height = '1em', radius, className }: SkeletonProps) {
  return (
    <span
      className={`skeleton ${styles.block} ${className ?? ''}`}
      style={{ width, height, ...(radius !== undefined ? { borderRadius: radius } : {}) }}
      aria-hidden="true"
    />
  );
}

/** Región en carga: aria-busy + "Cargando…" oculto. */
export function SkeletonRegion({ children, label = es.app.loading, className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div aria-busy="true" className={`${styles.region} ${className ?? ''}`}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
