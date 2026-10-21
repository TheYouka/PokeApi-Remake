// Barra superior (§10.6): acrílica y fija (view-transition-name: topbar). Izquierda: perfil con
// avatar, gamertag y "◆ n G". Derecha: sin conexión, sonido, campana, reloj y "☰ Guía".
// Clases globales de P-8: topbar, gamertag, clock, offline, label, guide (CSS móvil y verificación).
import { Link } from 'react-router';
import { es } from '../i18n/es';
import { achievements, gamerscoreOf } from '../state/achievements';
import { connectivity } from '../state/connectivity';
import { openGuide } from '../state/guide';
import { notifications, unreadCount } from '../state/notifications';
import { setSfx, settings } from '../state/settings';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { Icon } from './icons';
import { useClock } from './useClock';
import styles from './TopBar.module.css';

export function TopBar() {
  const gamertag = useStore(settings, (s) => s.gamertag);
  const avatar = useStore(settings, (s) => s.avatar);
  const sfx = useStore(settings, (s) => s.sfx);
  const g = useStore(achievements, gamerscoreOf);
  const unread = useStore(notifications, unreadCount);
  const offline = useStore(connectivity, (c) => c === 'offline');
  const clock = useClock();

  return (
    <header className={`${styles.bar} topbar acrylic`}>
      <Link
        to="/ajustes?seccion=perfil"
        viewTransition
        className={styles.profile}
        aria-label={es.topbar.profile(gamertag, g)}
        data-focus-id="topbar:profile"
      >
        <Avatar avatar={avatar} size={40} />
        <span className={styles.identity}>
          <span className={`${styles.gamertag} gamertag`}>{gamertag}</span>
          <span className={`${styles.score} tabular`}>{es.topbar.gamerscore(g)}</span>
        </span>
      </Link>

      <div className={styles.spacer} />

      {offline ? (
        <span className={`${styles.offline} offline`} role="img" aria-label={es.topbar.offline}>
          <Icon name="wifi-off" size={20} />
          <span className={`${styles.label} label`} aria-hidden="true">{es.topbar.offline}</span>
        </span>
      ) : null}

      <button
        type="button"
        className={styles.iconButton}
        aria-pressed={!sfx}
        aria-label={es.topbar.mute}
        data-focus-id="topbar:sound"
        onClick={() => setSfx(!sfx)}
      >
        <Icon name={sfx ? 'sonido' : 'silencio'} size={22} />
      </button>

      <button
        type="button"
        className={styles.iconButton}
        aria-label={es.topbar.notifications(unread)}
        data-focus-id="topbar:bell"
        onClick={() => openGuide('notificaciones')}
      >
        <Icon name="campana" size={22} />
        {unread > 0 ? <span className={`${styles.badge} tabular`} aria-hidden="true">{unread > 9 ? '9+' : unread}</span> : null}
      </button>

      <time className={`${styles.clock} clock tabular`} aria-label={`${es.topbar.clock}: ${clock}`}>{clock}</time>

      <button
        type="button"
        className={`${styles.guide} guide`}
        aria-label={es.topbar.openGuide}
        data-focus-id="topbar:guide"
        onClick={() => openGuide()}
      >
        <span className={styles.guideGlyph} aria-hidden="true">{es.topbar.guideGlyph}</span>
        <span className={`${styles.label} label`} aria-hidden="true">{es.topbar.guide}</span>
      </button>
    </header>
  );
}
