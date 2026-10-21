// Gráfico de pastel (§13.9): borde de 1,5 px con el --bg de la pantalla entre porciones (la blanca se
// distingue) y leyenda dentro del SVG. Las porciones < 2 % se agrupan en "Otros" SOLO en el dibujo:
// la tabla del ChartFrame sigue llevando todos los valores.
import { es } from '../../i18n/es';
import { formatNumber } from '../../i18n/format';
import { SvgA11y, type ChartA11y } from './ChartFrame';

export interface PieSlice { key: string; label: string; value: number; color: string }

const W = 760;
const H = 420;
const CX = 200;
const CY = 210;
const R = 185;
const LEGEND_X = 420;
const ROW = 19;
const MIN_SHARE = 0.02;
const OTHERS_COLOR = '#7A7A7A';

/** Porciones que se dibujan: las < 2 % se juntan en "Otros". Puro. */
export function drawnSlices(slices: readonly PieSlice[]): PieSlice[] {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (total <= 0) return [];
  const big: PieSlice[] = [];
  let others = 0;
  for (const s of slices) {
    if (s.value <= 0) continue;
    if (s.value / total < MIN_SHARE) others += s.value;
    else big.push(s);
  }
  if (others > 0) big.push({ key: 'otros', label: es.charts.others, value: others, color: OTHERS_COLOR });
  return big;
}

const pct = (v: number, total: number) => formatNumber((v / total) * 100, { maximumFractionDigits: 1 });

export function PieChart({ a11y, slices }: { a11y: ChartA11y; slices: readonly PieSlice[] }) {
  const drawn = drawnSlices(slices);
  const total = drawn.reduce((s, x) => s + x.value, 0);
  let angle = -Math.PI / 2;
  const legendTop = Math.max(20, CY - (drawn.length * ROW) / 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${a11y.titleId} ${a11y.descId}`}>
      <SvgA11y a11y={a11y} />
      {total <= 0 ? (
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="var(--text)" fontSize={18}>{es.charts.empty}</text>
      ) : null}
      <g>
        {drawn.map((s) => {
          const a0 = angle;
          const a1 = angle + (s.value / total) * Math.PI * 2;
          angle = a1;
          if (drawn.length === 1) {
            return <circle key={s.key} cx={CX} cy={CY} r={R} fill={s.color} stroke="var(--bg)" strokeWidth={1.5} />;
          }
          const x0 = CX + R * Math.cos(a0);
          const y0 = CY + R * Math.sin(a0);
          const x1 = CX + R * Math.cos(a1);
          const y1 = CY + R * Math.sin(a1);
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M ${CX} ${CY} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
          return <path key={s.key} d={d} fill={s.color} stroke="var(--bg)" strokeWidth={1.5} strokeLinejoin="round" />;
        })}
      </g>
      <g>
        {drawn.map((s, i) => {
          const y = legendTop + i * ROW;
          return (
            <g key={s.key}>
              <rect x={LEGEND_X} y={y} width={14} height={14} fill={s.color} stroke="var(--text-2)" strokeWidth={0.75} />
              <text x={LEGEND_X + 22} y={y + 12} fill="var(--text)" fontSize={14}>
                {es.charts.legendItem(s.label, formatNumber(s.value), pct(s.value, total))}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
