// Glifos originales de mando hechos en CSS (§10.7): A verde, B rojo, X azul, Y amarillo;
// LB/RB/LT/RT como píldoras; Menú como tres rayas. Decorativos (el texto va en el aria-label).
import styles from './Glyph.module.css';

export type GlyphKind = 'a' | 'b' | 'x' | 'y' | 'lb' | 'rb' | 'lt' | 'rt' | 'lbrb' | 'ltrt' | 'menu';

const PILL: Partial<Record<GlyphKind, string>> = { lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT' };

export function Glyph({ kind }: { kind: GlyphKind }) {
  if (kind === 'lbrb' || kind === 'ltrt') {
    const [l, r] = kind === 'lbrb' ? (['lb', 'rb'] as const) : (['lt', 'rt'] as const);
    return (
      <span className={styles.pair} aria-hidden="true">
        <Glyph kind={l} /><Glyph kind={r} />
      </span>
    );
  }
  if (kind === 'menu') {
    return (
      <span className={`${styles.glyph} ${styles.menu}`} aria-hidden="true">
        <span /><span /><span />
      </span>
    );
  }
  const pill = PILL[kind];
  if (pill) return <span className={`${styles.glyph} ${styles.pill}`} aria-hidden="true">{pill}</span>;
  return (
    <span className={`${styles.glyph} ${styles.face}`} data-face={kind} aria-hidden="true">
      {kind.toUpperCase()}
    </span>
  );
}
