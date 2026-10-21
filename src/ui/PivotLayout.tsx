// Layout de las rutas de pivote (§6, §10.4): PivotBar + <Outlet/> + usePivotController (LB/RB en la
// capa 1). Va en el chunk de entrada. Al cambiar de pivote, el contenido entra deslizándose 32 px
// desde el lado de la dirección (data-direction) y las filas reciben data-enter (cascada).
import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import { usePivotController } from '../nav/pivots';
import { PivotBar } from './PivotBar';
import { TileEnterContext } from './TileRow';
import styles from './PivotLayout.module.css';

export function PivotLayout() {
  const { current, direction, go } = usePivotController();
  // 1 en el primer montaje (cascada de Inicio tras el arranque); +1 en cada cambio de pivote.
  const [enter, setEnter] = useState(1);
  const prev = useRef(current);
  useEffect(() => {
    if (prev.current === current) return;
    prev.current = current;
    setEnter((n) => n + 1);
  }, [current]);

  return (
    <div className={styles.layout}>
      <PivotBar current={current} onSelect={go} />
      <TileEnterContext.Provider value={enter}>
        <div key={current ?? 'none'} className={styles.content} data-direction={direction ?? undefined}>
          <Outlet />
        </div>
      </TileEnterContext.Provider>
    </div>
  );
}
