// Formato de números, fechas y unidades en locale 'es' (§14). formatSlug vive en la capa API.
import { es } from './es';

export { formatSlug } from '../api/localize';

const LOCALE = 'es';

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE, opts).format(n);
}

const oneDecimal = (n: number) => formatNumber(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Fecha larga: "20 de octubre de 2026". Acepta Date, ISO o milisegundos. */
export function formatDate(d: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return es.app.dash;
  return new Intl.DateTimeFormat(LOCALE, opts ?? { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.345], ['month', 12], ['year', Number.POSITIVE_INFINITY],
];
/** "hace 5 minutos", "ayer"… con Intl.RelativeTimeFormat('es'). */
export function formatRelative(d: Date | string | number, now: number = Date.now()): string {
  const t = (d instanceof Date ? d : new Date(d)).getTime();
  if (Number.isNaN(t)) return es.app.dash;
  let value = (t - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);
    value /= size;
  }
  return rtf.format(Math.round(value), 'year');
}

/** Decímetros → metros: 4 → "0,4 m". */
export const dmToM = (dm: number): string => es.format.meters(oneDecimal(dm / 10));
/** Hectogramos → kilogramos: 60 → "6,0 kg". */
export const hgToKg = (hg: number): string => es.format.kilograms(oneDecimal(hg / 10));

/** gender_rate de la especie (−1 o 0–8 octavos de hembra) → "Sin género" o "♀ 12,5 % · ♂ 87,5 %". */
export function formatGenderRate(rate: number): string {
  if (rate < 0) return es.format.genderless;
  const female = (rate / 8) * 100;
  const pct = (n: number) => formatNumber(n, { maximumFractionDigits: 1 });
  return es.format.genderRate(pct(female), pct(100 - female));
}

/** Número de Pokédex: 25 → "#0025". */
export const padDex = (n: number): string => `#${String(n).padStart(4, '0')}`;
