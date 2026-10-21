// MiniTable (§7.2): <table> semántica con <caption> y scope. Virtualizada opcional (> 60 filas):
// el tbody pinta solo las filas visibles entre dos espaciadores, sin perder la semántica de tabla.
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useLayoutEffect, useRef, useState, type Key, type ReactNode } from 'react';
import styles from './blocks.module.css';

export interface MiniTableColumn { key: string; label: string; numeric?: boolean }
export interface MiniTableRow { key: Key; cells: readonly ReactNode[] }

export interface MiniTableProps {
  caption: string;
  columns: readonly MiniTableColumn[];
  rows: readonly MiniTableRow[];
  /** Virtualiza con más de 60 filas. */
  virtualize?: boolean;
  rowHeight?: number;
  /** La primera celda de cada fila es <th scope="row">. */
  rowHeader?: boolean;
  captionHidden?: boolean;
  busy?: boolean;
}

const VIRTUAL_THRESHOLD = 60;

function Cells({ row, columns, rowHeader }: { row: MiniTableRow; columns: readonly MiniTableColumn[]; rowHeader: boolean }) {
  return (
    <>
      {row.cells.map((c, i) => {
        const numeric = columns[i]?.numeric ? styles.numeric : undefined;
        return rowHeader && i === 0
          ? <th key={i} scope="row" className={numeric}>{c}</th>
          : <td key={i} className={numeric}>{c}</td>;
      })}
    </>
  );
}

function VirtualBody({ rows, columns, rowHeight, rowHeader }: { rows: readonly MiniTableRow[]; columns: readonly MiniTableColumn[]; rowHeight: number; rowHeader: boolean }) {
  const ref = useRef<HTMLTableSectionElement>(null);
  const [margin, setMargin] = useState(0);
  useLayoutEffect(() => {
    const measure = () => { if (ref.current) setMargin(Math.round(ref.current.getBoundingClientRect().top + window.scrollY)); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const v = useWindowVirtualizer({ count: rows.length, estimateSize: () => rowHeight, overscan: 6, scrollMargin: margin });
  const items = v.getVirtualItems();
  const before = items[0] ? items[0].start - margin : 0;
  const after = items.length > 0 ? v.getTotalSize() - (items[items.length - 1]!.end - margin) : 0;
  return (
    <tbody ref={ref}>
      {before > 0 ? <tr aria-hidden="true" style={{ height: before }} /> : null}
      {items.map((it) => {
        const row = rows[it.index]!;
        return <tr key={row.key} style={{ height: rowHeight }} aria-rowindex={it.index + 2}><Cells row={row} columns={columns} rowHeader={rowHeader} /></tr>;
      })}
      {after > 0 ? <tr aria-hidden="true" style={{ height: after }} /> : null}
    </tbody>
  );
}

export function MiniTable({
  caption, columns, rows, virtualize = false, rowHeight = 48, rowHeader = true, captionHidden = false, busy = false,
}: MiniTableProps) {
  const virtual = virtualize && rows.length > VIRTUAL_THRESHOLD;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} aria-busy={busy || undefined} aria-rowcount={virtual ? rows.length + 1 : undefined}>
        <caption className={captionHidden ? 'sr-only' : styles.tableCaption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key} scope="col" className={c.numeric ? styles.numeric : undefined}>{c.label}</th>)}
          </tr>
        </thead>
        {virtual
          ? <VirtualBody rows={rows} columns={columns} rowHeight={rowHeight} rowHeader={rowHeader} />
          : (
            <tbody>
              {rows.map((r) => <tr key={r.key}><Cells row={r} columns={columns} rowHeader={rowHeader} /></tr>)}
            </tbody>
          )}
      </table>
    </div>
  );
}
