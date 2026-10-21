// Panel Guía (§10.8, decisión P-5): Overlay capa 3 con role="dialog" y 4 pestañas ARIA.
// LB/RB (Q/E) cambian de pestaña; back y guide la cierran. `guide-opened` lo dispara openGuide()
// (state/guide.ts, único punto de disparo), no este componente.
import { useEffect, useId, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { play } from '../audio/sfx';
import { es } from '../i18n/es';
import { formatDate, formatRelative } from '../i18n/format';
import { useAction } from '../nav/actions';
import { PIVOTS } from '../registry/groups';
import { achievementInfo, ACH_IDS, TOTAL_POINTS } from '../state/achievementCatalog';
import { achievements, gamerscoreOf, recentUnlocks, unlockedCountOf } from '../state/achievements';
import { closeGuide, guide, setGuideTab, type GuideTab } from '../state/guide';
import { markAllRead, notifications } from '../state/notifications';
import { recent } from '../state/recent';
import { ACCENT_SWATCHES, setAccent, setSfx, setTheme, settings } from '../state/settings';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './icons';
import { Overlay } from './Overlay';
import { Switch } from './Switch';
import { useClock } from './useClock';
import styles from './GuidePanel.module.css';

const TABS: readonly GuideTab[] = ['inicio', 'logros', 'notificaciones', 'ajustes'];
const PIVOT_ICONS: Record<string, IconName> = {
  inicio: 'inicio', pokedex: 'pokedex', juegos: 'juegos', objetos: 'objetos', movimientos: 'movimientos',
  mundo: 'mundo', bayas: 'bayas', ajustes: 'ajustes',
};

export function GuidePanel() {
  const open = useStore(guide, (g) => g.open);
  const { key } = useLocation();
  // Si se navega por otro medio con la Guía abierta, se cierra. Con View Transitions la URL cambia antes
  // de que React reciba la nueva ubicación: si la Guía se abrió ya en esa URL (su clave de historial es
  // la que llega), no es una navegación posterior y no se cierra.
  const firstKey = useRef(key);
  const openedAtKey = useRef<unknown>(null);
  useEffect(() => {
    if (open) openedAtKey.current = (window.history.state as { key?: unknown } | null)?.key ?? null;
  }, [open]);
  useEffect(() => {
    if (firstKey.current === key) return;
    firstKey.current = key;
    if (key !== openedAtKey.current) closeGuide();
  }, [key]);
  return open ? <GuideDialog /> : null;
}

function GuideDialog() {
  const tab = useStore(guide, (g) => g.tab);
  const titleId = useId();
  const baseId = useId();
  const gamertag = useStore(settings, (s) => s.gamertag);
  const avatar = useStore(settings, (s) => s.avatar);
  const g = useStore(achievements, gamerscoreOf);
  const clock = useClock();

  const step = (delta: 1 | -1) => {
    const i = TABS.indexOf(guide.get().tab);
    const next = TABS[(i + delta + TABS.length) % TABS.length]!;
    setGuideTab(next);
    requestAnimationFrame(() => document.getElementById(`${baseId}-tab-${next}`)?.focus({ preventScroll: true }));
    return true;
  };
  useAction('lb', () => step(-1), 3);
  useAction('rb', () => step(1), 3);
  useAction('guide', () => { play('back'); closeGuide(); return true; }, 3);

  return (
    <Overlay layer={3} onClose={closeGuide} placement="start">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`${styles.panel} acrylic`}>
        <h2 id={titleId} className="sr-only">{es.guide.title}</h2>
        <header className={styles.header}>
          <Avatar avatar={avatar} size={56} />
          <div className={styles.who}>
            <span className={styles.gamertag}>{gamertag}</span>
            <span className={`${styles.score} tabular`}>{es.topbar.gamerscore(g)}</span>
          </div>
          <button type="button" className={styles.close} data-sfx="none" aria-label={es.guide.close}
            onClick={() => { play('back'); closeGuide(); }}>
            <Icon name="cerrar" size={20} />
          </button>
        </header>

        <div role="tablist" aria-label={es.guide.title} className={styles.tabs} data-focus-group="guide-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              id={`${baseId}-tab-${t}`}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-controls={`${baseId}-panel`}
              tabIndex={tab === t ? 0 : -1}
              data-autofocus={tab === t ? '' : undefined}
              data-focus-id={`guide-tab:${t}`}
              className={styles.tab}
              onClick={() => setGuideTab(t)}
            >
              {es.guide.tabs[t]}
            </button>
          ))}
        </div>

        <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className={styles.content} key={tab}>
          {tab === 'inicio' ? <HomeTab /> : null}
          {tab === 'logros' ? <AchievementsTab /> : null}
          {tab === 'notificaciones' ? <NotificationsTab /> : null}
          {tab === 'ajustes' ? <QuickSettingsTab /> : null}
        </div>

        <footer className={styles.footer}>
          <Icon name="reloj" size={18} />
          <time className="tabular">{clock}</time>
        </footer>
      </div>
    </Overlay>
  );
}

function GuideLink({ to, icon, label }: { to: string; icon: IconName; label: string }) {
  return (
    <Link to={to} viewTransition className={styles.link} onClick={() => closeGuide()}>
      <span className={styles.linkIcon} aria-hidden="true"><Icon name={icon} size={20} /></span>
      <span className={styles.linkText}>{label}</span>
    </Link>
  );
}

function HomeTab() {
  const recents = useStore(recent, (r) => r.slice(0, 5));
  return (
    <>
      <nav aria-label={es.pivots.nav} className={styles.grid}>
        {PIVOTS.map((p) => <GuideLink key={p.id} to={p.path} icon={PIVOT_ICONS[p.id] ?? 'inicio'} label={p.label} />)}
      </nav>
      <div className={styles.grid}>
        <GuideLink to="/api" icon="api" label={es.guide.explorer} />
        <GuideLink to="/tipos" icon="tabla" label={es.guide.typeChart} />
        <GuideLink to="/comparar" icon="comparar" label={es.guide.compare} />
        <GuideLink to="/partida-rapida" icon="dado" label={es.guide.quickPlay} />
      </div>
      <h3 className={`${styles.subhead} caption`}>{es.guide.recent}</h3>
      {recents.length === 0 ? (
        <p className={styles.muted}>{es.guide.noRecent}</p>
      ) : (
        <div className={styles.list}>
          {recents.map((r) => (
            <GuideLink key={r.path} to={r.path} icon={r.kind === 'pokemon' ? 'pokemon' : r.kind === 'resource' ? 'recurso' : 'flecha'} label={r.title} />
          ))}
        </div>
      )}
    </>
  );
}

function AchievementsTab() {
  const state = useStore(achievements, (s) => s);
  const g = gamerscoreOf(state);
  const n = unlockedCountOf(state);
  const last = recentUnlocks(state, 3);
  return (
    <>
      <div className={styles.stats}>
        <span className={`${styles.big} tabular`}>{es.ach.points(g, TOTAL_POINTS)}</span>
        <span className="tabular">{es.ach.count(n, ACH_IDS.length)}</span>
        <span className={styles.meter} aria-hidden="true"><span style={{ transform: `scaleX(${g / TOTAL_POINTS})` }} /></span>
      </div>
      <h3 className={`${styles.subhead} caption`}>{es.guide.lastUnlocked}</h3>
      {last.length === 0 ? <p className={styles.muted}>{es.ach.none}</p> : (
        <ul role="list" className={styles.achList}>
          {last.map(({ id, at }) => {
            const info = achievementInfo(id);
            return (
              <li key={id} className={styles.ach}>
                <span className={styles.trophy} aria-hidden="true"><Icon name="trofeo" size={20} /></span>
                <span className={styles.achText}>
                  <strong>{info.name}</strong>
                  <span className={styles.muted}>{es.ach.pointsShort(info.points)} · {formatDate(at)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.list}>
        <GuideLink to="/logros" icon="trofeo" label={es.guide.allAchievements} />
      </div>
    </>
  );
}

function NotificationsTab() {
  const list = useStore(notifications, (l) => l);
  useEffect(() => { markAllRead(); }, [list.length]);
  if (list.length === 0) return <p className={styles.muted}>{es.guide.noNotifications}</p>;
  return (
    <ul role="list" className={styles.notifs}>
      {list.map((n) => (
        <li key={n.id} className={styles.notif} data-nav="" tabIndex={-1} data-focus-id={`notif:${n.id}`}>
          <span className={styles.notifIcon} aria-hidden="true">
            <Icon name={n.kind === 'achievement' ? 'trofeo' : n.kind === 'offline' ? 'wifi-off' : n.kind === 'gamepad' ? 'mando' : 'info'} size={18} />
          </span>
          <span className={styles.achText}>
            <strong>{n.title}</strong>
            {n.body ? <span>{n.body}</span> : null}
            <span className={styles.muted}>{formatRelative(n.at)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function QuickSettingsTab() {
  const s = useStore(settings, (x) => x);
  return (
    <>
      <div className={styles.switches}>
        <Switch label={es.guide.sound} checked={s.sfx} onChange={setSfx} />
        <Switch label={es.guide.lightTheme} checked={s.theme === 'light'} onChange={(on) => setTheme(on ? 'light' : 'dark')} />
      </div>
      <h3 className={`${styles.subhead} caption`} id="guide-accent-label">{es.guide.accent}</h3>
      <div role="radiogroup" aria-labelledby="guide-accent-label" className={styles.swatches} data-focus-group="guide-accent">
        {ACCENT_SWATCHES.map((sw) => (
          <button
            key={sw.hex}
            type="button"
            role="radio"
            aria-checked={s.accent === sw.hex}
            aria-label={sw.name}
            className={styles.swatch}
            style={{ background: sw.hex }}
            onClick={() => setAccent(sw.hex)}
          />
        ))}
      </div>
      <div className={styles.list}>
        <GuideLink to="/ajustes" icon="ajustes" label={es.guide.allSettings} />
        <GuideLink to="/apagar" icon="apagar" label={es.guide.shutdown} />
      </div>
    </>
  );
}
