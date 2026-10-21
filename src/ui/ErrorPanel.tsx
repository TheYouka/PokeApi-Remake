// ErrorPanel (§8.2, §18): "Algo salió mal." + "Código: X" con Reintentar, Atrás e Ir a Inicio.
// role="alert"; suena `error` una vez al montarse (único punto de disparo, §12).
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { play } from '../audio/sfx';
import { es } from '../i18n/es';
import { dispatch } from '../nav/actions';
import { Icon } from './icons';
import styles from './ErrorPanel.module.css';

export interface ErrorPanelProps {
  /** Código visible (displayCode de api/errors.ts): '404', 'NETWORK', 'HTTP_500', 'CHUNK_LOAD'… */
  code: string;
  /** Reintentar; por defecto recarga la página. */
  onRetry?: () => void;
  /** h1 en una página (por defecto) o h2 dentro de una sección. */
  level?: 1 | 2;
}

export function ErrorPanel({ code, onRetry, level = 1 }: ErrorPanelProps) {
  const navigate = useNavigate();
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    play('error');
  }, []);

  const back = () => {
    if (dispatch('back', 'hint')) return;              // FocusEngine (capa 0) hace navigate(-1) o '/'
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) void navigate(-1);
    else void navigate('/');
  };
  const retry = onRetry ?? (() => window.location.reload());
  const Heading = level === 1 ? 'h1' : 'h2';

  return (
    <div className={styles.panel} role="alert">
      <span className={styles.icon} aria-hidden="true"><Icon name="alerta" size={40} /></span>
      <Heading className={styles.title} {...(level === 1 ? { tabIndex: -1, 'data-focus-start': '' } : {})}>
        {es.errors.title}
      </Heading>
      <p className={`${styles.code} tabular`}>{es.errors.code(code)}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          data-autofocus={level === 1 ? '' : undefined}
          onClick={retry}
        >
          <Icon name="flecha" size={18} />{es.errors.retry}
        </button>
        <button type="button" className={styles.button} data-sfx="none" onClick={back}>
          <Icon name="chevron-izq" size={18} />{es.errors.back}
        </button>
        <Link to="/" viewTransition className={styles.button}>
          <Icon name="inicio" size={18} />{es.errors.home}
        </Link>
      </div>
    </div>
  );
}
