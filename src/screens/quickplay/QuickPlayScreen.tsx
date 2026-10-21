// Partida rápida (§13.6, RF-QP): "carga de juego" de 1,2 s (200 ms con movimiento reducido), ID real
// de listAll('pokemon-species') con crypto.getRandomValues, quick-play y navigate replace a la ficha.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { displayCode } from '../../api/errors';
import { parseResourceUrl } from '../../api/urls';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { useListAll } from '../../data/hooks';
import { es } from '../../i18n/es';
import { track } from '../../state/achievements';
import { useReducedMotion } from '../../state/motion';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { Icon } from '../../ui/icons';
import { Spinner } from '../../ui/Spinner';
import styles from './QuickPlayScreen.module.css';

const FULL_MS = 1200;
const REDUCED_MS = 200;

/** Índice uniforme en [0, n) con crypto.getRandomValues (rechazo para evitar sesgo). */
export function randomIndex(n: number): number {
  const max = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < max) return buf[0]! % n;
  }
}

export default function QuickPlayScreen() {
  useDocumentTitle(es.quickPlay.title);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const list = useListAll('pokemon-species');
  const [ready, setReady] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), reduced ? REDUCED_MS : FULL_MS);
    return () => clearTimeout(id);
  }, [reduced]);

  useEffect(() => {
    if (!ready || !list.data || done.current) return;
    const ids = list.data.results.map((r) => parseResourceUrl(r.url)?.id).filter((x): x is number => x !== undefined && x > 0);
    if (ids.length === 0) return;
    done.current = true;
    const id = ids[randomIndex(ids.length)]!;
    track({ type: 'quick-play' });
    void navigate(`/pokemon/${id}`, { replace: true });
  }, [ready, list.data, navigate]);

  if (list.isError) {
    return <ErrorPanel code={displayCode(list.error)} onRetry={() => void list.refetch()} />;
  }
  return (
    <div className={styles.stage} data-reduced={reduced ? '' : undefined}>
      <div className={styles.tile} aria-hidden="true">
        <Icon name="dado" size={96} />
      </div>
      <div className={styles.text}>
        <h1 tabIndex={-1} data-focus-start="">{es.quickPlay.title}</h1>
        <Spinner label={es.quickPlay.loading} />
        <p className={styles.loading}>{es.quickPlay.loading}</p>
      </div>
    </div>
  );
}
