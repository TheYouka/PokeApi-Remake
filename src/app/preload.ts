// Precarga de chunks de ruta (§16, NFR-PERF-1). preloadRoute(path) resuelve la ruta con matchRoutes
// contra la MISMA tabla del router y llama al mismo import() de su lazy (el módulo queda en la caché
// del navegador, así que la navegación posterior no vuelve a descargarlo). usePreloadOnDwell lo
// dispara tras 300 ms de foco o hover y lo cancela al salir.
import { useEffect, useRef } from 'react';
import { matchRoutes } from 'react-router';
import { routes } from './router';

export const PRELOAD_DWELL_MS = 300;

const done = new Set<string>();

/** Precarga los chunks lazy de todas las rutas que casan con `path`. Nunca lanza. */
export function preloadRoute(path: string): void {
  const pathname = path.split(/[?#]/)[0] ?? '';
  if (!pathname.startsWith('/') || done.has(pathname)) return;
  done.add(pathname);
  const matches = matchRoutes(routes, pathname) ?? [];
  for (const m of matches) {
    const lazy = m.route.lazy;
    if (typeof lazy === 'function') {
      // Un fallo de red al precargar no importa: la navegación real lo reintentará y lo mostrará.
      void Promise.resolve().then(() => lazy()).catch(() => { done.delete(pathname); });
    }
  }
}

export interface PreloadHandlers {
  onFocus: () => void;
  onBlur: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

/** Manejadores de foco/hover que precargan `to` tras 300 ms de permanencia (cancelado al salir). */
export function usePreloadOnDwell(to: string | null | undefined): PreloadHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  const start = () => {
    if (!to || timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      preloadRoute(to);
    }, PRELOAD_DWELL_MS);
  };
  useEffect(() => cancel, []);
  return { onFocus: start, onBlur: cancel, onPointerEnter: start, onPointerLeave: cancel };
}
