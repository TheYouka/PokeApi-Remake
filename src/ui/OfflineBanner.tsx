// Banner "Sin conexión" (§15, §18): región role="status" siempre montada.
import { es } from '../i18n/es';
import { connectivity } from '../state/connectivity';
import { useStore } from '../state/store';
import { Icon } from './icons';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
  const offline = useStore(connectivity, (c) => c === 'offline');
  return (
    <div role="status" className={styles.holder}>
      {offline ? (
        <p className={styles.banner}>
          <Icon name="wifi-off" size={18} />
          <span>{es.notif.offline}</span>
        </p>
      ) : null}
    </div>
  );
}
