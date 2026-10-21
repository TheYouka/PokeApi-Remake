// Toasts (§10.10): región role="status" aria-live="polite" siempre montada fuera de #app-root.
// Cola FIFO: logro → círculo de acento con trofeo que se abre a una píldora de 420 px en 300 ms,
// 4 s visible, se recoge en 250 ms y 400 ms entre toasts; `chime` al mostrarse (único disparo).
// info → superficie --bg-elev-3, 2,5 s, sin sonido. Nunca recibe foco.
import { useEffect, useRef, useState } from 'react';
import { play } from '../audio/sfx';
import { es } from '../i18n/es';
import { achievementInfo } from '../state/achievementCatalog';
import { useStore } from '../state/store';
import { dequeueToast, toasts, type Toast } from '../state/toasts';
import { Icon } from './icons';
import styles from './Toasts.module.css';

const ENTER_MS = 300;
const EXIT_MS = 250;
const GAP_MS = 400;
const HOLD_MS = { achievement: 4000, info: 2500 } as const;

type Phase = 'in' | 'hold' | 'out';

export function Toasts() {
  const pending = useStore(toasts, (q) => q.length);
  const [current, setCurrent] = useState<{ toast: Toast; n: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('in');
  const [cooling, setCooling] = useState(false);
  // Evita sacar dos de la cola si el efecto se ejecuta dos veces (StrictMode) antes del re-render.
  const busy = useRef(false);

  // Siguiente de la cola cuando no hay ninguno en pantalla.
  useEffect(() => {
    if (busy.current || current || cooling || pending === 0) return;
    const next = dequeueToast();
    if (!next) return;
    busy.current = true;
    setCurrent((c) => ({ toast: next, n: (c?.n ?? 0) + 1 }));
    setPhase('in');
    if (next.kind === 'achievement') play('chime');
  }, [current, cooling, pending]);

  // Línea de tiempo del toast actual.
  useEffect(() => {
    if (!current) return;
    const kind = current.toast.kind;
    const ms = phase === 'in' ? ENTER_MS : phase === 'hold' ? HOLD_MS[kind] : EXIT_MS;
    const t = setTimeout(() => {
      if (phase === 'in') setPhase('hold');
      else if (phase === 'hold') setPhase('out');
      else { busy.current = false; setCurrent(null); setCooling(true); }
    }, ms);
    return () => clearTimeout(t);
  }, [current, phase]);

  useEffect(() => {
    if (!cooling) return;
    const t = setTimeout(() => setCooling(false), GAP_MS);
    return () => clearTimeout(t);
  }, [cooling]);

  return (
    <div className={styles.region} role="status" aria-live="polite" aria-atomic="true">
      {current ? <ToastView key={current.n} toast={current.toast} phase={phase} /> : null}
    </div>
  );
}

function ToastView({ toast, phase }: { toast: Toast; phase: Phase }) {
  if (toast.kind === 'achievement') {
    const info = achievementInfo(toast.id);
    return (
      <div className={styles.toast} data-kind="achievement" data-phase={phase}>
        <span className={styles.badge} aria-hidden="true"><Icon name="trofeo" size={28} /></span>
        <span className={styles.body}>
          <span className={`${styles.line1} caption`}>{es.ach.toast(info.points)}</span>
          <span className={styles.line2}><strong>{info.name}</strong> · {info.description}</span>
        </span>
      </div>
    );
  }
  return (
    <div className={styles.toast} data-kind="info" data-phase={phase}>
      <span className={styles.badge} aria-hidden="true"><Icon name={toast.icon} size={24} /></span>
      <span className={styles.body}><span className={styles.line2}><strong>{toast.text}</strong></span></span>
    </div>
  );
}
