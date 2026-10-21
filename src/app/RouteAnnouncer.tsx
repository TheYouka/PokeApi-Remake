// Anunciador de rutas (§8.1, §15): región aria-live="polite" visualmente oculta.
import { useStore } from '../state/store';
import { announcement } from './useRouteEffects';

export function RouteAnnouncer() {
  const text = useStore(announcement, (t) => t);
  return <div className="sr-only" aria-live="polite" aria-atomic="true">{text}</div>;
}
