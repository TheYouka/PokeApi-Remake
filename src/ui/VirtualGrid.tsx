// VirtualGrid (§8.2, §13.1): filas virtualizadas de tarjetas de ancho mínimo fijo. Columnas
// floor((ancho + gap) / (mín + gap)) recalculadas con ResizeObserver; overscan de 3 filas.
import { useLayoutEffect, useRef, useState, type Key, type ReactNode } from 'react';
import { VirtualRows, type VirtualScroll } from './VirtualList';
import styles from './VirtualGrid.module.css';

export interface VirtualGridProps<T> {
  items: readonly T[];
  /** Ancho mínimo de la tarjeta (168 px en la Pokédex). */
  minItemWidth: number;
  /** Alto de la tarjeta (220 px en la Pokédex); la fila suma el gap. */
  itemHeight: number;
  gap?: number;
  renderItem: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => Key;
  overscan?: number;
  scroll?: VirtualScroll;
  ariaLabel?: string;
}

export const gridColumns = (width: number, min: number, gap: number): number =>
  Math.max(1, Math.floor((width + gap) / (min + gap)));

export function VirtualGrid<T>({
  items, minItemWidth, itemHeight, gap = 12, renderItem, getKey, overscan = 3, scroll = { mode: 'window' }, ariaLabel,
}: VirtualGridProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setCols(gridColumns(el.clientWidth, minItemWidth, gap));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minItemWidth, gap]);

  const rows = Math.ceil(items.length / cols);
  return (
    <VirtualRows
      innerRef={ref}
      count={rows}
      rowHeight={itemHeight + gap}
      overscan={overscan}
      scroll={scroll}
      listProps={{ role: 'list', 'aria-label': ariaLabel }}
      renderRow={(row, style) => {
        const start = row * cols;
        const slice = items.slice(start, start + cols);
        return (
          <div
            key={`row-${row}`}
            role="none"
            className={styles.row}
            style={{ ...style, height: itemHeight, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: gap }}
          >
            {slice.map((item, i) => (
              <div
                key={getKey ? getKey(item, start + i) : start + i}
                role="listitem"
                aria-setsize={items.length}
                aria-posinset={start + i + 1}
                className={styles.cell}
              >
                {renderItem(item, start + i)}
              </div>
            ))}
          </div>
        );
      }}
    />
  );
}
