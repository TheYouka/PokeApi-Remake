// Pivotes (§10.4): LB/RB (Q/E) en la capa 1 con orden circular. Lo registra PivotLayout.
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { PIVOTS, pivotFromPath, type PivotId } from '../registry/groups';
import { useAction } from './actions';

export type PivotDirection = 'forward' | 'backward';

export function usePivotController(): { current: PivotId | null; direction: PivotDirection | null; go: (id: PivotId) => void } {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = pivotFromPath(pathname);
  const [direction, setDirection] = useState<PivotDirection | null>(null);

  const go = useCallback((id: PivotId) => {
    const from = PIVOTS.findIndex((p) => p.id === current);
    const to = PIVOTS.findIndex((p) => p.id === id);
    if (to < 0 || to === from) return;
    setDirection(from < 0 || to > from ? 'forward' : 'backward');
    void navigate(PIVOTS[to]!.path, { viewTransition: true });
  }, [current, navigate]);

  const step = (delta: 1 | -1) => {
    const i = PIVOTS.findIndex((p) => p.id === current);
    if (i < 0) return false;
    const next = PIVOTS[(i + delta + PIVOTS.length) % PIVOTS.length]!;
    setDirection(delta === 1 ? 'forward' : 'backward');
    void navigate(next.path, { viewTransition: true });
    return true;
  };
  useAction('rb', () => step(1), 1);
  useAction('lb', () => step(-1), 1);

  return { current, direction, go };
}
