// Retro (§10.12, RF-UI-11): homenaje al menú de consola del proyecto original. Fondo #000, texto
// #33FF66 en --font-mono, scanlines y cursor ▌ a 1 Hz. Texto LITERAL tecleado a 12 ms/carácter
// (al instante con movimiento reducido). Opciones 1–6 como <button> y con las teclas 1–6.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { es } from '../../i18n/es';
import { registerDigitHandler } from '../../nav/keyboard';
import { track } from '../../state/achievements';
import { useReducedMotion } from '../../state/motion';
import styles from './RetroScreen.module.css';

const MS_PER_CHAR = 12;
/** Opción → destino (tabla de §10.12). */
const OPTIONS: Record<number, string> = {
  1: '/pokemon',
  2: '/estadisticas',
  3: '/graficas',
  4: '/crear',
  5: '/ajustes?seccion=datos',
  6: '/apagar',
};
const OPTION_RE = /^([1-6])\. /;

export default function RetroScreen() {
  useDocumentTitle(es.retro.title, { recent: true });
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const lines = es.retro.lines;
  const total = useMemo(() => lines.reduce((s, l) => s + l.length, 0), [lines]);
  const [typed, setTyped] = useState(reduced ? total : 0);

  useEffect(() => { track({ type: 'retro-opened' }); }, []);

  // Tecleo: caracteres según el tiempo transcurrido (no depende de la precisión de los timers).
  useEffect(() => {
    if (reduced) { setTyped(total); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const n = Math.min(total, Math.floor((now - start) / MS_PER_CHAR));
      setTyped(n);
      if (n < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, total]);

  // Teclas 1–6 (solo aquí, fuera de los campos de texto).
  useEffect(() => registerDigitHandler((d) => {
    const to = OPTIONS[d];
    if (!to) return false;
    void navigate(to);
    return true;
  }), [navigate]);

  let remaining = typed;
  const done = typed >= total;
  return (
    <div className={styles.screen} data-done={done ? '' : undefined}>
      <div className={styles.scanlines} aria-hidden="true" />
      <div className={styles.terminal}>
        <h1 className="sr-only" tabIndex={-1} data-focus-start="">{es.retro.title}</h1>
        <div className={styles.text}>
          {lines.map((line, i) => {
            const visible = line.slice(0, Math.max(0, remaining));
            remaining -= line.length;
            const m = OPTION_RE.exec(line);
            if (m && visible.length > 0) {
              const n = Number(m[1]);
              return (
                <p key={i} className={styles.line}>
                  <button type="button" className={styles.option} data-focus-id={`retro:${n}`}
                    aria-label={line} onClick={() => { void navigate(OPTIONS[n]!); }}>
                    {visible}
                  </button>
                </p>
              );
            }
            return <p key={i} className={styles.line} aria-hidden={visible.length < line.length ? 'true' : undefined}>{visible || '\u00a0'}</p>;
          })}
          <p className={styles.line} aria-hidden="true">
            {done ? es.retro.prompt : ''}
            <span className={styles.cursor}>{es.retro.cursor}</span>
          </p>
        </div>
        <footer className={styles.credits}>
          <p>{es.credits.original}</p>
          <a href={es.credits.repoUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>{es.credits.repoUrl}</a>
        </footer>
      </div>
    </div>
  );
}
