// ChartFrame (§13.9): título, selectores, SVG accesible (role="img" con <title> y <desc>, lo pinta el
// gráfico hijo con los ids que recibe), leyenda dentro del propio SVG (así viaja en la exportación),
// tabla alternativa en <details> con TODOS los valores y los botones "Exportar SVG", "Exportar PNG",
// "CSV" y "JSON". Cualquier fallo al exportar → "No se pudo exportar" en línea (§18).
import { useId, useRef, useState, type ReactNode } from 'react';
import { toCsv, type CsvValue } from '../../data/csv';
import { downloadBlob, downloadCsv, downloadJson, downloadText } from '../../data/download';
import { es } from '../../i18n/es';
import { formatNumber } from '../../i18n/format';
import { MiniTable } from '../data/MiniTable';
import { Icon } from '../icons';
import { serializeSvg, svgSize, svgToPng } from './exportSvg';
import styles from './charts.module.css';

export interface ChartColumn { key: string; label: string; numeric?: boolean }
export type ChartRow = Record<string, string | number>;
export interface ChartTable { caption: string; columns: readonly ChartColumn[]; rows: readonly ChartRow[] }
export interface ChartA11y { titleId: string; descId: string; title: string; desc: string }

export interface ChartFrameProps {
  title: string;
  description: string;
  /** Nombre base de los archivos exportados (sin extensión). */
  fileName: string;
  table: ChartTable;
  /** Datos del JSON (por defecto, las filas de la tabla). */
  json?: unknown;
  controls?: ReactNode;
  /** Sustituye al gráfico (carga o error) y desactiva las exportaciones. */
  status?: ReactNode;
  headingLevel?: 2 | 3;
  children: (a11y: ChartA11y) => ReactNode;
}

const cell = (v: string | number | undefined) => (typeof v === 'number' ? formatNumber(v) : (v ?? ''));

export function ChartFrame({
  title, description, fileName, table, json, controls, status, headingLevel = 2, children,
}: ChartFrameProps) {
  const headingId = useId();
  const titleId = useId();
  const descId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const disabled = status !== undefined && status !== null;
  const fail = () => setError(es.errors.exportFailed);
  const svgEl = () => boxRef.current?.querySelector('svg') ?? null;

  const exportSvg = () => {
    const svg = svgEl();
    if (!svg) { fail(); return; }
    try {
      setError(downloadText(`${fileName}.svg`, serializeSvg(svg), 'image/svg+xml;charset=utf-8'));
    } catch { fail(); }
  };
  const exportPng = async () => {
    const svg = svgEl();
    if (!svg) { fail(); return; }
    try {
      const { width, height } = svgSize(svg);
      const blob = await svgToPng(serializeSvg(svg), width, height, 2);
      setError(downloadBlob(`${fileName}.png`, blob));
    } catch { fail(); }
  };
  const exportCsv = () => {
    try {
      const rows = table.rows as readonly Record<string, CsvValue>[];
      setError(downloadCsv(`${fileName}.csv`, toCsv(rows, table.columns.map((c) => ({ key: c.key, label: c.label })))));
    } catch { fail(); }
  };
  const exportJson = () => setError(downloadJson(`${fileName}.json`, json ?? table.rows));

  return (
    <section className={styles.frame} aria-labelledby={headingId} data-chart={fileName}>
      <header className={styles.header}>
        <Heading id={headingId} className={headingLevel === 2 ? styles.title : styles.titleSmall}>{title}</Heading>
        {controls ? <div className={styles.controls}>{controls}</div> : null}
      </header>
      {disabled ? <div className={styles.placeholder}>{status}</div> : (
        <div ref={boxRef} className={styles.canvas}>{children({ titleId, descId, title, desc: description })}</div>
      )}
      <details className={styles.table}>
        <summary>{es.charts.table}</summary>
        <MiniTable
          caption={table.caption}
          columns={table.columns}
          rows={table.rows.map((r, i) => ({ key: i, cells: table.columns.map((c) => cell(r[c.key])) }))}
        />
      </details>
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={disabled} onClick={exportSvg}>
          <Icon name="descargar" size={18} />{es.charts.exportSvg}
        </button>
        <button type="button" className={styles.button} disabled={disabled} onClick={() => void exportPng()}>
          <Icon name="descargar" size={18} />{es.charts.exportPng}
        </button>
        <button type="button" className={styles.button} onClick={exportCsv}>
          <Icon name="descargar" size={18} />{es.charts.csv}
        </button>
        <button type="button" className={styles.button} onClick={exportJson}>
          <Icon name="descargar" size={18} />{es.charts.json}
        </button>
      </div>
      {error ? <p role="status" className={styles.status}>{error}</p> : null}
    </section>
  );
}

/** Cabecera accesible común de los SVG: role="img" + <title> + <desc>. */
export function SvgA11y({ a11y }: { a11y: ChartA11y }) {
  return (
    <>
      <title id={a11y.titleId}>{a11y.title}</title>
      <desc id={a11y.descId}>{a11y.desc}</desc>
    </>
  );
}
