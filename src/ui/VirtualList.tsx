// VirtualList (§8.2, NFR-PERF-3): el virtualizador mide el mismo elemento que hace scroll.
// 'window' (pantallas) → useWindowVirtualizer con scrollMargin = posición de la lista en la página;
// 'element' (listados dentro de overlays) → useVirtualizer sobre su propio <div data-virtual-scroll>.
// Cada modo es un componente interno distinto para no llamar a los hooks de forma condicional.
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { useLayoutEffect, useRef, useState, type CSSProperties, type Key, type ReactNode, type RefObject } from 'react';
import styles from './VirtualList.module.css';

export type VirtualScroll = { mode: 'window' } | { mode: 'element'; maxHeight: string };

export interface VirtualRowsProps {
  count: number;
  /** Alto fijo de cada fila (estimateSize). */
  rowHeight: number;
  overscan: number;
  scroll: VirtualScroll;
  renderRow: (index: number, style: CSSProperties) => ReactNode;
  rowKey?: (index: number) => Key;
  /** Props del contenedor de las filas (role="list", aria-label…). */
  listProps?: Record<string, unknown>;
  className?: string;
  /** Ref del contenedor de filas (VirtualGrid mide su ancho). */
  innerRef?: RefObject<HTMLDivElement | null>;
}

/** Posición absoluta en la página (offsetTop respecto al documento). */
function useDocumentTop(ref: RefObject<HTMLElement | null>): number {
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (el) setTop(Math.round(el.getBoundingClientRect().top + window.scrollY));
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(document.body);
    return () => { window.removeEventListener('resize', measure); ro?.disconnect(); };
  }, [ref]);
  return top;
}

function rowStyle(start: number, height: number): CSSProperties {
  return { position: 'absolute', top: 0, left: 0, width: '100%', height, transform: `translateY(${start}px)` };
}

function WindowRows({ count, rowHeight, overscan, renderRow, rowKey, listProps, className, innerRef }: VirtualRowsProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = innerRef ?? localRef;
  const scrollMargin = useDocumentTop(ref);
  const v = useWindowVirtualizer({ count, estimateSize: () => rowHeight, overscan, scrollMargin });
  return (
    <div ref={ref} className={`${styles.rows} ${className ?? ''}`} style={{ height: v.getTotalSize() }} {...listProps}>
      {v.getVirtualItems().map((item) => (
        <RowSlot key={rowKey ? rowKey(item.index) : item.key}>
          {renderRow(item.index, rowStyle(item.start - scrollMargin, rowHeight))}
        </RowSlot>
      ))}
    </div>
  );
}

function ElementRows({ count, rowHeight, overscan, renderRow, rowKey, listProps, className, innerRef, maxHeight }: VirtualRowsProps & { maxHeight: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count, estimateSize: () => rowHeight, overscan, getScrollElement: () => scrollRef.current });
  return (
    <div ref={scrollRef} data-virtual-scroll="" className={styles.scroller} style={{ maxHeight, overflowY: 'auto', overscrollBehavior: 'contain' }}>
      <div ref={innerRef} className={`${styles.rows} ${className ?? ''}`} style={{ height: v.getTotalSize() }} {...listProps}>
        {v.getVirtualItems().map((item) => (
          <RowSlot key={rowKey ? rowKey(item.index) : item.key}>
            {renderRow(item.index, rowStyle(item.start, rowHeight))}
          </RowSlot>
        ))}
      </div>
    </div>
  );
}

const RowSlot = ({ children }: { children: ReactNode }) => <>{children}</>;

/** Filas virtualizadas genéricas (las usan VirtualList y VirtualGrid). El modo no cambia mientras está montada. */
export function VirtualRows(props: VirtualRowsProps) {
  return props.scroll.mode === 'element'
    ? <ElementRows {...props} maxHeight={props.scroll.maxHeight} />
    : <WindowRows {...props} />;
}

export interface VirtualListProps<T> {
  items: readonly T[];
  /** Alto fijo de fila: 64 px en las listas, 48 px en "Ver todos (N)". */
  rowHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => Key;
  overscan?: number;
  scroll?: VirtualScroll;
  ariaLabel?: string;
  className?: string;
}

export function VirtualList<T>({
  items, rowHeight, renderItem, getKey, overscan = 6, scroll = { mode: 'window' }, ariaLabel, className,
}: VirtualListProps<T>) {
  return (
    <VirtualRows
      count={items.length}
      rowHeight={rowHeight}
      overscan={overscan}
      scroll={scroll}
      className={className}
      listProps={{ role: 'list', 'aria-label': ariaLabel }}
      rowKey={getKey ? (i) => getKey(items[i]!, i) : undefined}
      renderRow={(i, style) => (
        <div role="listitem" aria-setsize={items.length} aria-posinset={i + 1} style={style} className={styles.item}>
          {renderItem(items[i]!, i)}
        </div>
      )}
    />
  );
}
