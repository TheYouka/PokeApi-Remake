// Puntos bajo la barra superior mientras se carga el chunk de una ruta (§10.11, decisión P-7).
import { useNavigation } from 'react-router';
import { es } from '../i18n/es';
import styles from './NavigationProgress.module.css';

export function NavigationProgress() {
  const loading = useNavigation().state === 'loading';
  if (!loading) return null;
  return (
    <div className={styles.progress} role="progressbar" aria-label={es.app.navProgress}>
      {Array.from({ length: 5 }, (_, i) => <span key={i} className={styles.dot} style={{ animationDelay: `${i * 120}ms` }} />)}
    </div>
  );
}
