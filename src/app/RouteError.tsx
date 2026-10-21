// errorElement de las rutas (§6, §18, RF-ERR-3): ErrorPanel con displayCode. CHUNK_LOAD → Reintentar
// recarga la página. Las excepciones de UI (bugs) se registran con log.error.
import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { displayCode, PokeApiError } from '../api/errors';
import { es } from '../i18n/es';
import { log } from '../log';
import { ErrorPanel } from '../ui/ErrorPanel';
import { useDocumentTitle } from './useRouteEffects';

export function RouteError() {
  const error = useRouteError();
  const code = isRouteErrorResponse(error)
    ? (error.status === 404 ? '404' : `HTTP_${error.status}`)
    : displayCode(error);
  useDocumentTitle(es.errors.title);
  useEffect(() => {
    if (code === 'UI_ERROR' && !(error instanceof PokeApiError)) log.error('RouteError', error);
  }, [code, error]);
  return (
    <div style={{ paddingTop: 'var(--space-5)' }}>
      <ErrorPanel code={code} onRetry={() => window.location.reload()} />
    </div>
  );
}
