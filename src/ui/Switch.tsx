// Interruptor accesible (role="switch", aria-checked) para Ajustes y la Guía.
import { useId } from 'react';
import styles from './Switch.module.css';

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Texto de ayuda enlazado con aria-describedby. */
  note?: string;
  autofocus?: boolean;
}

export function Switch({ label, checked, onChange, disabled = false, note, autofocus = false }: SwitchProps) {
  const noteId = useId();
  return (
    <div className={styles.row}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={note ? noteId : undefined}
        disabled={disabled}
        className={styles.switch}
        data-autofocus={autofocus ? '' : undefined}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.label}>{label}</span>
        <span className={styles.track} aria-hidden="true"><span className={styles.thumb} /></span>
      </button>
      {note ? <p id={noteId} className={styles.note}>{note}</p> : null}
    </div>
  );
}
