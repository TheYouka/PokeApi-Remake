// Section (§7.2, §18): h2 + contenido dentro de su propio SectionBoundary.
import { useId, type ReactNode } from 'react';
import { SectionBoundary } from '../SectionBoundary';
import styles from './blocks.module.css';

export interface SectionProps {
  title: string;
  children: ReactNode;
  /** Controles a la derecha del título. */
  actions?: ReactNode;
  className?: string;
}

export function Section({ title, children, actions, className }: SectionProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`${styles.section} ${className ?? ''}`}>
      <header className={styles.sectionHeader}>
        <h2 id={id} className={styles.sectionTitle}>{title}</h2>
        {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
      </header>
      <SectionBoundary>{children}</SectionBoundary>
    </section>
  );
}
