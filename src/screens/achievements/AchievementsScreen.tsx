// Página de logros (§10.10): cabecera "{G} / 1000 G", "{n} / 22 logros" y barra; rejilla de tarjetas
// con data-ach-id y data-unlocked; progreso parcial; "Borrar logros" con ConfirmDialog.
import { useState } from 'react';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { es } from '../../i18n/es';
import { formatDate } from '../../i18n/format';
import { ACH_IDS, achievementInfo, TOTAL_POINTS } from '../../state/achievementCatalog';
import { achievements, gamerscoreOf, progressOf, resetAchievements, unlockedCountOf } from '../../state/achievements';
import { useStore } from '../../state/store';
import { ConfirmDialog } from '../../ui/Dialog';
import { Icon } from '../../ui/icons';
import styles from './AchievementsScreen.module.css';

export default function AchievementsScreen() {
  useDocumentTitle(es.ach.title, { recent: true });
  const state = useStore(achievements, (s) => s);
  const [confirm, setConfirm] = useState(false);
  const g = gamerscoreOf(state);
  const n = unlockedCountOf(state);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 tabIndex={-1} data-focus-start="">{es.ach.title}</h1>
          <p className={`${styles.points} tabular`}>{es.ach.points(g, TOTAL_POINTS)}</p>
          <p className={`${styles.count} tabular`}>{es.ach.count(n, ACH_IDS.length)}</p>
        </div>
        <div
          className={styles.bar}
          role="progressbar"
          aria-label={es.ach.progressLabel}
          aria-valuemin={0}
          aria-valuemax={TOTAL_POINTS}
          aria-valuenow={g}
        >
          <span style={{ transform: `scaleX(${g / TOTAL_POINTS})` }} />
        </div>
        <button type="button" className={styles.reset} onClick={() => setConfirm(true)} data-focus-id="ach:reset">
          <Icon name="cerrar" size={18} />{es.ach.reset}
        </button>
      </header>

      <ul role="list" className={styles.grid} data-focus-group="achievements">
        {ACH_IDS.map((id, i) => {
          const info = achievementInfo(id);
          const at = state.unlocked[id];
          const unlocked = at !== undefined;
          const progress = progressOf(state, id);
          return (
            <li
              key={id}
              className={styles.card}
              data-ach-id={id}
              data-unlocked={unlocked ? 'true' : 'false'}
              data-nav=""
              tabIndex={-1}
              data-focus-id={`ach:${id}`}
              data-autofocus={i === 0 ? '' : undefined}
              aria-label={es.ach.cardAria(info.name, info.points, unlocked)}
            >
              <span className={styles.icon} aria-hidden="true"><Icon name={unlocked ? 'trofeo' : 'candado'} size={28} /></span>
              <span className={styles.body}>
                <span className={styles.name}>{info.name}</span>
                <span className={styles.desc}>{unlocked ? info.description : info.hint}</span>
                {unlocked ? (
                  <span className={styles.date}>{es.ach.unlockedOn(formatDate(at))}</span>
                ) : progress ? (
                  <span className={styles.progress}>
                    <span className={styles.progressBar} aria-hidden="true">
                      <span style={{ transform: `scaleX(${progress.current / progress.target})` }} />
                    </span>
                    <span className="tabular">{es.ach.progress(progress.current, progress.target)}</span>
                  </span>
                ) : (
                  <span className={styles.date}>{es.ach.locked}</span>
                )}
              </span>
              <span className={`${styles.g} tabular`}>{es.ach.pointsShort(info.points)}</span>
            </li>
          );
        })}
      </ul>

      {confirm ? (
        <ConfirmDialog
          title={es.ach.reset}
          message={es.ach.resetConfirm}
          confirmLabel={es.ach.reset}
          onConfirm={resetAchievements}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </div>
  );
}
