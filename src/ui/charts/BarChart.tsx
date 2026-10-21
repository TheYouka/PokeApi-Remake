// Barras verticales (§13.9, gráfico 4): stats base con el degradado del original (el color de cada
// barra lo da statColor del valor). Valor encima de cada barra y etiqueta debajo.
import { formatNumber } from '../../i18n/format';
import { SvgA11y, type ChartA11y } from './ChartFrame';

export interface Bar { key: string; label: string; value: number; color: string }

const W = 720;
const H = 380;
const LEFT = 56;
const RIGHT = 16;
const TOP = 36;
const BOTTOM = 56;

export function BarChart({ a11y, bars, max }: { a11y: ChartA11y; bars: readonly Bar[]; max?: number }) {
  const top = Math.max(1, max ?? Math.max(...bars.map((b) => b.value), 1));
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const slot = plotW / Math.max(1, bars.length);
  const barW = Math.min(72, slot * 0.6);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(top * t));
  const y = (v: number) => TOP + plotH - (v / top) * plotH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${a11y.titleId} ${a11y.descId}`}>
      <SvgA11y a11y={a11y} />
      <g>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" fill="var(--text-2)" fontSize={12}>{formatNumber(t)}</text>
          </g>
        ))}
      </g>
      <g>
        {bars.map((b, i) => {
          const cx = LEFT + slot * i + slot / 2;
          const h = (Math.min(b.value, top) / top) * plotH;
          return (
            <g key={b.key}>
              <rect x={cx - barW / 2} y={TOP + plotH - h} width={barW} height={h} fill={b.color} rx={2} />
              <text x={cx} y={TOP + plotH - h - 8} textAnchor="middle" fill="var(--text)" fontSize={15} fontWeight={700}>
                {formatNumber(b.value)}
              </text>
              <text x={cx} y={H - BOTTOM + 22} textAnchor="middle" fill="var(--text)" fontSize={14}>{b.label}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
