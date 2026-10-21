// FactGrid (§7.2): <dl> de pares etiqueta y valor.
import type { ReactNode } from 'react';
import styles from './blocks.module.css';

export interface Fact { label: string; value: ReactNode; key?: string }

export function FactGrid({ facts, className }: { facts: readonly Fact[]; className?: string }) {
  return (
    <dl className={`${styles.facts} ${className ?? ''}`}>
      {facts.map((f) => (
        <div key={f.key ?? f.label} className={styles.fact}>
          <dt className="caption">{f.label}</dt>
          <dd className={styles.factValue}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
