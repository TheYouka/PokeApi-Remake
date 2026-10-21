// Efectos de ruta (§8.3, §11.6): título del documento, anuncio para lectores de pantalla y
// recientes de las pantallas fijas. Aquí NO se dispara ningún logro de visita (§10.10).
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { es } from '../i18n/es';
import { addRecent } from '../state/recent';
import { createStore } from '../state/store';

/** Texto que lee RouteAnnouncer (aria-live="polite"). */
export const announcement = createStore<string>('');

export interface DocumentTitleOptions {
  /** Añade la pantalla a Recientes (pantallas fijas: Logros, Retro, Ajustes…). */
  recent?: boolean;
}

/**
 * `useDocumentTitle('Pikachu')` → document.title "Pikachu · PokéBox One" y anuncio "Página: Pikachu".
 * Con `null` (datos aún cargando) no cambia nada.
 */
export function useDocumentTitle(title: string | null, { recent = false }: DocumentTitleOptions = {}): void {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!title) return;
    document.title = es.app.title(title);
    announcement.set(es.app.routeAnnounce(title));
    if (recent) addRecent({ path: pathname, title, kind: 'screen' });
  }, [title, pathname, recent]);
}
