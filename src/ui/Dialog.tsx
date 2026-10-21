// Dialog y ConfirmDialog (§8.2): capa 4 del bus; ✕ y "Cancelar" con data-sfx="none" llaman al
// manejador de `back` del overlay (suenan como `back`, no como `select`).
import { useId, type ReactNode } from 'react';
import { es } from '../i18n/es';
import { Icon } from './icons';
import { Overlay, useOverlay } from './Overlay';
import styles from './Dialog.module.css';

function CloseButton() {
  const { close } = useOverlay();
  return (
    <button type="button" className={styles.close} data-sfx="none" aria-label={es.app.close} onClick={close}>
      <Icon name="cerrar" size={20} />
    </button>
  );
}

function CancelButton({ label = es.app.cancel, autoFocus = false }: { label?: string; autoFocus?: boolean }) {
  const { close } = useOverlay();
  return (
    <button
      type="button"
      className={`${styles.button} ${styles.secondary}`}
      data-sfx="none"
      data-autofocus={autoFocus ? '' : undefined}
      onClick={close}
    >
      {label}
    </button>
  );
}

export interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Botones del pie (además de ✕). */
  actions?: ReactNode;
  /** 'wide' para listados (p. ej. "Ver todos (N)"). */
  size?: 'normal' | 'wide';
}

export function Dialog({ title, onClose, children, actions, size = 'normal' }: DialogProps) {
  const titleId = useId();
  return (
    <Overlay layer={4} onClose={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`${styles.panel} acrylic`} data-size={size}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <CloseButton />
        </header>
        <div className={styles.body}>{children}</div>
        {actions ? <footer className={styles.actions}>{actions}</footer> : null}
      </div>
    </Overlay>
  );
}

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  /** Acción destructiva: el botón de confirmar va en rojo. */
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** `role="alertdialog"` con el foco inicial en "Cancelar" (§15). */
export function ConfirmDialog({ title, message, confirmLabel = es.app.confirm, danger = true, onConfirm, onClose }: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  return (
    <Overlay layer={4} onClose={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`${styles.panel} acrylic`}
        data-size="normal"
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <CloseButton />
        </header>
        <p id={descId} className={styles.message}>{message}</p>
        <footer className={styles.actions}>
          <CancelButton autoFocus />
          <button
            type="button"
            className={`${styles.button} ${danger ? styles.danger : styles.primary}`}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </Overlay>
  );
}

export { CancelButton as DialogCancel };
