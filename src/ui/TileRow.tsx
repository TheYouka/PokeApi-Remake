// Fila de tiles (§10.3): <section aria-labelledby> con su título y una rejilla horizontal
// (data-focus-group). --rows vale 4 en la fila principal y 2 en el resto. PivotLayout pone
// data-enter en las filas al cambiar de pivote (cascada solo con movimiento completo).
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import styles from './TileRow.module.css';

/** Cambia (se incrementa) cada vez que PivotLayout quiere la cascada de entrada. */
export const TileEnterContext = createContext(0);
const ENTER_MS = 400 + 12 * 30 + 80;   // --dur-slow + retraso máximo + margen

export interface TileRowProps {
  id: string;
  title: string;
  rows?: 4 | 2;
  /** Oculta el título visualmente (la fila principal), pero lo mantiene para el lector. */
  hideTitle?: boolean;
  children: ReactNode;
}

export function TileRow({ id, title, rows = 2, hideTitle = false, children }: TileRowProps) {
  const headingId = useId();
  const enterToken = useContext(TileEnterContext);
  const [entering, setEntering] = useState(enterToken > 0);

  useEffect(() => {
    if (enterToken <= 0) return;
    setEntering(true);
    const t = setTimeout(() => setEntering(false), ENTER_MS);
    return () => clearTimeout(t);
  }, [enterToken]);

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={hideTitle ? 'sr-only' : styles.heading}>{title}</h2>
      <div
        className={`${styles.tileRow} tileRow`}
        data-rows={rows}
        data-focus-group={`row:${id}`}
        data-scroll-row=""
        data-enter={entering ? '' : undefined}
      >
        {children}
      </div>
    </section>
  );
}
