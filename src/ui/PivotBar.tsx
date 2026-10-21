// Barra de pivotes (§10.4): banda acrílica con los 8 enlaces, aria-current="page" en el activo e
// indicador de acento de 3 px que se mueve con translateX/scaleX según el enlace medido.
// En móvil hace scroll horizontal y centra el activo. Solo la pinta PivotLayout.
import { useCallback, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router';
import { usePreloadOnDwell } from '../app/preload';
import { es } from '../i18n/es';
import { PIVOTS, type PivotId } from '../registry/groups';
import styles from './PivotBar.module.css';

export interface PivotBarProps {
  current: PivotId | null;
  onSelect: (id: PivotId) => void;
}

export function PivotBar({ current, onSelect }: PivotBarProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);

  const measure = useCallback(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !el) { setBar(null); return; }
    setBar({ x: el.offsetLeft, w: el.offsetWidth });
    // Centra el activo dentro de la banda (sin desplazar la página).
    const left = el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2;
    if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
  }, []);

  useLayoutEffect(() => { measure(); }, [current, measure]);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(list);
    void document.fonts?.ready.then(() => measure());
    return () => ro.disconnect();
  }, [measure]);

  const click = (id: PivotId) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onSelect(id);
  };

  return (
    <nav aria-label={es.pivots.nav} className={`${styles.band} acrylic`}>
      <ul ref={listRef} role="list" className={styles.list} data-focus-group="pivots" data-scroll-row="">
        {PIVOTS.map((p) => (
          <li key={p.id} className={styles.item}>
            <PivotLink path={p.path} label={p.label} id={p.id} active={p.id === current} onClick={click(p.id)} />
          </li>
        ))}
        <li aria-hidden="true" className={styles.indicatorHolder}>
          <span
            className={styles.indicator}
            style={bar ? { transform: `translateX(${bar.x}px) scaleX(${bar.w})`, opacity: 1 } : { opacity: 0 }}
          />
        </li>
      </ul>
    </nav>
  );
}

/** Enlace de pivote: precarga el chunk de su ruta tras 300 ms de foco o hover (§16). */
function PivotLink({ path, label, id, active, onClick }: {
  path: string; label: string; id: PivotId; active: boolean; onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const preload = usePreloadOnDwell(path);
  return (
    <Link
      to={path}
      className={styles.link}
      aria-current={active ? 'page' : undefined}
      data-focus-id={`pivot:${id}`}
      onClick={onClick}
      {...preload}
    >
      {label}
    </Link>
  );
}