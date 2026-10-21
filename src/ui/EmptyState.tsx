// Estado vacío (§8.2): icono + mensaje (+ acciones opcionales).
import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import styles from './EmptyState.module.css';

export function EmptyState({ message, icon = 'busqueda', children }: { message: string; icon?: IconName; children?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <span className={styles.icon} aria-hidden="true"><Icon name={icon} size={48} /></span>
      <p className={styles.message}>{message}</p>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </div>
  );
}
