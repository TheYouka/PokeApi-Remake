// Línea (§7.3 fila 39): experiencia por nivel 1–100 del ritmo de crecimiento. Ejes con marcas y la
// curva en el color de acento (se resuelve a un literal al exportar).
import { formatNumber } from '../../i18n/format';
import { SvgA11y, type ChartA11y } from './ChartFrame';

export interface LinePoint { x: number; y: number }

const W = 760;
const H = 380;
const LEFT = 92;
const RIGHT = 20;
const TOP = 20;
const BOTTOM = 52;

export function LineChart({ a11y, points, xLabel, yLabel, color = 'var(--accent)' }: {
  a11y: ChartA11y; points: readonly LinePoint[]; xLabel: string; yLabel: string; color?: string;
}) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs, 1);
  const xMax = Math.max(...xs, xMin + 1);
  const yMax = Math.max(...ys, 1);
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const px = (x: number) => LEFT + ((x - xMin) / (xMax - xMin)) * plotW;
  const py = (y: number) => TOP + plotH - (y / yMax) * plotH;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(yMax * t));
  const xTicks = [1, 25, 50, 75, 100].filter((t) => t >= xMin && t <= xMax);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${a11y.titleId} ${a11y.descId}`}>
      <SvgA11y a11y={a11y} />
      <g>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={LEFT} x2={W - RIGHT} y1={py(t)} y2={py(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={LEFT - 8} y={py(t) + 4} textAnchor="end" fill="var(--text-2)" fontSize={12}>{formatNumber(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={px(t)} y={TOP + plotH + 20} textAnchor="middle" fill="var(--text-2)" fontSize={12}>{t}</text>
        ))}
        <text x={LEFT + plotW / 2} y={H - 8} textAnchor="middle" fill="var(--text)" fontSize={14}>{xLabel}</text>
        <text x={16} y={TOP + plotH / 2} textAnchor="middle" fill="var(--text)" fontSize={14}
          transform={`rotate(-90 16 ${TOP + plotH / 2})`}>{yLabel}</text>
      </g>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
