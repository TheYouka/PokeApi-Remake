// Ruta desconocida (§6, RF-ERR-2): "Algo salió mal." + "Código: 404" con Reintentar, Atrás e Inicio.
import { useDocumentTitle } from '../../app/useRouteEffects';
import { es } from '../../i18n/es';
import { ErrorPanel } from '../../ui/ErrorPanel';

export default function NotFoundScreen() {
  useDocumentTitle(es.errors.notFound);
  return <ErrorPanel code="404" />;
}
