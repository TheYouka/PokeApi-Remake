// Spinner de puntos original (§10.11): solo aparece si la carga dura más de 300 ms y avisa a los 8 s.
// Con movimiento reducido son 3 puntos que laten en opacidad.
import { useEffect, useState } from 'react';
import { es } from '../i18n/es';
import { useReducedMotion } from '../state/motion';
import styles from './Spinner.module.css';

const SHOW_AFTER_MS = 300;
const SLOW_AFTER_MS = 8000;

export function Spinner({ label = es.app.loading }: { label?: string }) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const b = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const dots = reduced ? 3 : 5;
  return (
    <div className={styles.spinner} role="status" data-visible={visible ? '' : undefined}>
      <span className="sr-only">{label}</span>
      {visible ? (
        <span className={styles.track} aria-hidden="true" data-reduced={reduced ? '' : undefined}>
          {Array.from({ length: dots }, (_, i) => <span key={i} className={styles.dot} style={{ animationDelay: `${i * 120}ms` }} />)}
        </span>
      ) : null}
      {slow ? <p className={styles.slow}>{es.app.slow}</p> : null}
    </div>
  );
}
