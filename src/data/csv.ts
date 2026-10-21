// CSV seguro (§17, RF-ORIG-3). Puro.
// - todas las celdas van entre comillas dobles y las comillas internas se duplican;
// - las celdas de TEXTO que empiezan por = + - @ tabulador o retorno de carro se prefijan con ';
// - los números finitos se escriben como números (sin prefijo, aunque sean negativos);
// - separador ',', fin de línea \r\n y BOM \uFEFF al principio.

export type CsvValue = string | number | boolean | null | undefined;
export interface CsvColumn<R> { key: keyof R & string; label: string }

const FORMULA_START = /^[=+\-@\t\r]/;
const BOM = '\uFEFF';
const EOL = '\r\n';

const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** Una celda ya escapada. */
export function csvCell(v: CsvValue): string {
  if (typeof v === 'number') return quote(Number.isFinite(v) ? String(v) : '');
  if (v === null || v === undefined) return quote('');
  const s = typeof v === 'boolean' ? (v ? 'true' : 'false') : v;
  return quote(FORMULA_START.test(s) ? `'${s}` : s);
}

export function toCsv<R extends Record<string, CsvValue>>(rows: readonly R[], columns: readonly CsvColumn<R>[]): string {
  const lines = [columns.map((c) => csvCell(c.label)).join(',')];
  for (const r of rows) lines.push(columns.map((c) => csvCell(r[c.key])).join(','));
  return BOM + lines.join(EOL) + EOL;
}
