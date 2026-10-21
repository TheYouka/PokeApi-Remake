// Barras agrupadas (§13.9, gráfico 3): una categoría por tipo y una barra por serie (generación A
// #3B7AD4 y B #D4C739, los colores del original) con el valor encima. Leyenda dentro del SVG.
import { formatNumber } from '../../i18n/format';
import { SvgA11y, type ChartA11y } from './ChartFrame';

export interface BarSeries { label: string; color: string; values: readonly number[] }
export const SERIES_COLORS = ['#3B7AD4', '#D4C739'] as const;

const W = 1240;
const H = 480;
const LEFT = 56;
const RIGHT = 16;
const TOP = 64;
const BOTTOM = 96;

export function GroupedBarChart({ a11y, categories, series }: {
  a11y: ChartA11y; categories: readonly { key: string; label: string }[]; series: readonly BarSeries[];
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const slot = plotW / Math.max(1, categories.length);
  const barW = Math.min(24, (slot * 0.8) / Math.max(1, series.length));
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${a11y.titleId} ${a11y.descId}`}>
      <SvgA11y a11y={a11y} />
      <g>
        {series.map((s, i) => (
          <g key={s.label}>
            <rect x={LEFT + i * 220} y={16} width={16} height={16} fill={s.color} />
            <text x={LEFT + i * 220 + 24} y={29} fill="var(--text)" fontSize={15}>{s.label}</text>
          </g>
        ))}
      </g>
      <g>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" fill="var(--text-2)" fontSize={12}>{formatNumber(t)}</text>
          </g>
        ))}
      </g>
      <g>
        {categories.map((c, ci) => {
          const x0 = LEFT + slot * ci + (slot - barW * series.length) / 2;
          const labelX = LEFT + slot * ci + slot / 2;
          const labelY = H - BOTTOM + 16;
          return (
            <g key={c.key}>
              {series.map((s, si) => {
                const v = s.values[ci] ?? 0;
                const h = (v / max) * plotH;
                const x = x0 + si * barW;
                return (
                  <g key={si}>
                    <rect x={x} y={TOP + plotH - h} width={barW - 2} height={h} fill={s.color} />
                    <text x={x + (barW - 2) / 2} y={TOP + plotH - h - 4} textAnchor="middle" fill="var(--text)" fontSize={10}>
                      {formatNumber(v)}
                    </text>
                  </g>
                );
              })}
              <text
                x={labelX}
                y={labelY}
                textAnchor="end"
                fill="var(--text)"
                fontSize={13}
                transform={`rotate(-40 ${labelX} ${labelY})`}
              >
                {c.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
