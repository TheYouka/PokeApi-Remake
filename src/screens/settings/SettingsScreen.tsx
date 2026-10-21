// Ajustes (§10.13, RF-SET): categorías ?seccion= a la izquierda (aria-current) y contenido a la
// derecha; apilado en móvil. Acento e idioma se escriben con setAccent / setDataLang (únicos puntos de
// disparo de sus logros). Todos los borrados pasan por ConfirmDialog.
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { formatSlug, pickName } from '../../api/localize';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { audioStatus, play } from '../../audio/sfx';
import { pokeApi } from '../../data/client';
import { useListAll } from '../../data/hooks';
import { metaQuery, refQuery } from '../../data/queries';
import { pokemonSprite } from '../../data/sprites';
import { es } from '../../i18n/es';
import { formatDate, formatNumber } from '../../i18n/format';
import { achievements, resetAchievements } from '../../state/achievements';
import { connectivity } from '../../state/connectivity';
import { clearCreated, created } from '../../state/created';
import { useSystemReducedMotion } from '../../state/motion';
import { clearNotifications } from '../../state/notifications';
import { recent } from '../../state/recent';
import {
  ACCENT_SWATCHES, isKnownLang, setAccent, setAvatar, setDataLang, setGamertag, setReduceMotion, setSfx, setTheme, settings,
} from '../../state/settings';
import { useStore } from '../../state/store';
import { clearToasts } from '../../state/toasts';
import { parseSettingsSection, SETTINGS_SECTIONS, validateAvatarId, type SettingsSection } from '../../state/validation';
import { ConfirmDialog } from '../../ui/Dialog';
import { Icon, type IconName } from '../../ui/icons';
import { Picker, type PickerOption } from '../../ui/Picker';
import { SpriteImage } from '../../ui/SpriteImage';
import { Switch } from '../../ui/Switch';
import styles from './SettingsScreen.module.css';

const SECTION_ICONS: Record<SettingsSection, IconName> = {
  personalizacion: 'color', sonido: 'sonido', accesibilidad: 'perfil', idioma: 'idioma', perfil: 'perfil', datos: 'descargar', acerca: 'info',
};

export default function SettingsScreen() {
  const [params] = useSearchParams();
  const section = parseSettingsSection(params.get('seccion'));
  useDocumentTitle(es.settings.title);

  return (
    <div className={styles.page}>
      <h1 className="sr-only" tabIndex={-1} data-focus-start="">{es.settings.title}</h1>
      <nav aria-label={es.settings.sectionsNav} className={styles.nav}>
        <ul role="list" className={styles.navList} data-focus-group="settings-sections">
          {SETTINGS_SECTIONS.map((s, i) => (
            <li key={s}>
              <Link
                to={{ search: `?seccion=${s}` }}
                replace
                className={styles.navLink}
                aria-current={s === section ? 'true' : undefined}
                data-focus-id={`settings:${s}`}
                data-autofocus={(params.get('seccion') === null ? i === 0 : s === section) ? '' : undefined}
              >
                <Icon name={SECTION_ICONS[s]} size={20} />
                <span>{es.settings.sections[s]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <section className={styles.content} aria-labelledby="settings-section-title" key={section}>
        <h2 id="settings-section-title" className={styles.sectionTitle}>{es.settings.sections[section]}</h2>
        {section === 'personalizacion' ? <Personalization /> : null}
        {section === 'sonido' ? <Sound /> : null}
        {section === 'accesibilidad' ? <Accessibility /> : null}
        {section === 'idioma' ? <DataLanguage /> : null}
        {section === 'perfil' ? <Profile /> : null}
        {section === 'datos' ? <DataStorage /> : null}
        {section === 'acerca' ? <About /> : null}
      </section>
    </div>
  );
}

function Group({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  const autoId = useId();
  const hid = id ?? autoId;
  return (
    <div className={styles.group} role="group" aria-labelledby={hid}>
      <h3 id={hid} className={styles.groupTitle}>{title}</h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Personalización

function Personalization() {
  const theme = useStore(settings, (s) => s.theme);
  const accent = useStore(settings, (s) => s.accent);
  const themeLabel = useId();
  const accentLabel = useId();
  return (
    <>
      <Group title={es.settings.theme} id={themeLabel}>
        <div role="radiogroup" aria-labelledby={themeLabel} className={styles.segmented} data-focus-group="theme">
          {(['dark', 'light'] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={theme === t} className={styles.segment}
              data-theme-swatch={t} onClick={() => setTheme(t)}>
              <span className={styles.themePreview} data-preview={t} aria-hidden="true" />
              {t === 'dark' ? es.settings.themeDark : es.settings.themeLight}
            </button>
          ))}
        </div>
      </Group>
      <Group title={es.settings.accent} id={accentLabel}>
        <div role="radiogroup" aria-labelledby={accentLabel} className={styles.swatches} data-focus-group="accent">
          {ACCENT_SWATCHES.map((sw) => (
            <button key={sw.hex} type="button" role="radio" aria-checked={accent === sw.hex} aria-label={sw.name}
              className={styles.swatch} style={{ background: sw.hex }} onClick={() => setAccent(sw.hex)}>
              {accent === sw.hex ? <span className={styles.swatchCheck} aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
        <p className={styles.note}>{ACCENT_SWATCHES.find((s) => s.hex === accent)?.name}</p>
      </Group>
    </>
  );
}

// ---------------------------------------------------------------- Sonido

function Sound() {
  const sfx = useStore(settings, (s) => s.sfx);
  const unavailable = audioStatus() === 'unavailable';
  return (
    <Group title={es.settings.sfx}>
      <Switch label={es.settings.sfx} checked={sfx} onChange={setSfx} disabled={unavailable} />
      <button type="button" className={styles.button} data-sfx="none" disabled={unavailable || !sfx} onClick={() => play('chime')}>
        <Icon name="play" size={18} />{es.settings.testSound}
      </button>
      {unavailable ? <p className={styles.warning} role="status">{es.settings.soundUnavailable}</p> : null}
    </Group>
  );
}

// ---------------------------------------------------------------- Accesibilidad

function Accessibility() {
  const own = useStore(settings, (s) => s.reduceMotion);
  const system = useSystemReducedMotion();
  return (
    <Group title={es.settings.reduceMotion}>
      <Switch
        label={es.settings.reduceMotion}
        checked={own || system}
        disabled={system}
        onChange={setReduceMotion}
        note={es.settings.reduceMotionNote}
      />
    </Group>
  );
}

// ---------------------------------------------------------------- Idioma de los datos

function DataLanguage() {
  const current = useStore(settings, (s) => s.dataLang);
  const list = useListAll('language');
  const known = (list.data?.results ?? []).filter((r) => isKnownLang(r.name));
  const details = useQueries({ queries: known.map((r) => ({ ...refQuery(r, 'low') })) });

  let options: PickerOption<string>[];
  if (list.isSuccess && known.length > 0) {
    options = known.map((r, i) => {
      const names = details[i]?.data?.names;
      const text = names ? pickName(names, current, r.name).text : formatSlug(r.name);
      return { value: r.name, label: es.settings.langOption(text, r.name) };
    });
  } else {
    options = [
      { value: 'es', label: es.settings.langFallbackEs },
      { value: 'en', label: es.settings.langFallbackEn },
    ];
    if (current !== 'es' && current !== 'en') options.push({ value: current, label: es.settings.langOption(current, current) });
  }

  return (
    <Group title={es.settings.dataLang}>
      <Picker label={es.settings.dataLang} value={current} options={options} onChange={setDataLang} id="data-lang-picker" />
      <p className={styles.note}>{es.settings.dataLangNote}</p>
    </Group>
  );
}

// ---------------------------------------------------------------- Perfil

function Profile() {
  const saved = useStore(settings, (s) => s.gamertag);
  const avatar = useStore(settings, (s) => s.avatar);
  const [value, setValue] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const counterId = useId();
  const messageId = useId();
  const n = [...value.trim()].length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = setGamertag(value);
    if ('error' in r) {
      setError(r.error);
      inputRef.current?.focus();               // el foco se queda en el campo
      return;
    }
    setError(null);
    setValue(value.trim());
  };

  return (
    <>
      <Group title={es.settings.gamertag}>
        <form className={styles.form} onSubmit={submit} noValidate>
          <label htmlFor={inputId} className={styles.label}>{es.settings.gamertag}</label>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              id={inputId}
              className={styles.input}
              type="text"
              value={value}
              maxLength={32}
              autoComplete="nickname"
              spellCheck={false}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? `${counterId} ${messageId}` : counterId}
              onChange={(e) => setValue(e.target.value)}
            />
            <button type="submit" className={`${styles.button} ${styles.primary}`}>{es.app.save}</button>
          </div>
          <p id={counterId} className={`${styles.counter} tabular`} data-over={n > 15 ? '' : undefined}>
            {es.settings.gamertagCounter(n)}{n > 15 ? ` · ${es.settings.gamertagTooLong}` : ''}
          </p>
          <p id={messageId} role="status" className={styles.error}>{error ?? ''}</p>
        </form>
      </Group>
      <AvatarPicker avatar={avatar} />
    </>
  );
}

function AvatarPicker({ avatar }: { avatar: ReturnType<typeof settings.get>['avatar'] }) {
  const [mode, setMode] = useState<'default' | 'pokemon'>(avatar === 'default' ? 'default' : 'pokemon');
  const [num, setNum] = useState(avatar === 'default' ? '25' : String(avatar.pokemonId));
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  const labelId = useId();
  const preview = validateAvatarId(num.trim());

  const choose = (m: 'default' | 'pokemon') => {
    setMode(m);
    setError(null);
    if (m === 'default') setAvatar('default');
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = validateAvatarId(num.trim());
    const r = id === null ? { error: es.validation.avatar } : setAvatar({ pokemonId: id });
    setError('error' in r ? r.error : null);
  };

  return (
    <Group title={es.settings.avatar} id={labelId}>
      <div role="radiogroup" aria-labelledby={labelId} className={styles.segmented}>
        <button type="button" role="radio" aria-checked={mode === 'default'} className={styles.segment} onClick={() => choose('default')}>
          {es.settings.avatarSilhouette}
        </button>
        <button type="button" role="radio" aria-checked={mode === 'pokemon'} className={styles.segment} onClick={() => choose('pokemon')}>
          {es.settings.avatarPokemon}
        </button>
      </div>
      {mode === 'pokemon' ? (
        <form className={styles.avatarForm} onSubmit={submit} noValidate>
          <div className={styles.form}>
            <label htmlFor={inputId} className={styles.label}>{es.settings.avatarPokemon}</label>
            <div className={styles.inputRow}>
              <input
                id={inputId}
                className={`${styles.input} ${styles.short}`}
                type="text"
                inputMode="numeric"
                value={num}
                maxLength={4}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={errorId}
                onChange={(e) => setNum(e.target.value)}
              />
              <button type="submit" className={`${styles.button} ${styles.primary}`}>{es.app.save}</button>
            </div>
            <p id={errorId} role="status" className={styles.error}>{error ?? ''}</p>
          </div>
          <span className={styles.preview}>
            <SpriteImage src={preview !== null ? pokemonSprite(preview) : null}
              alt={preview !== null ? es.settings.avatarPreview(preview) : ''} width={96} height={96} pixelated />
          </span>
        </form>
      ) : null}
    </Group>
  );
}

// ---------------------------------------------------------------- Datos y almacenamiento

type ClearAction = 'cache' | 'achievements' | 'created' | 'preferences' | 'all';

function removePbxKeys(storage: Storage | null): void {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith('pbx1:')) keys.push(k);
    }
    for (const k of keys) storage.removeItem(k);
  } catch { /* almacenamiento inaccesible: no hay nada que borrar */ }
}
const safeStorage = (kind: 'local' | 'session'): Storage | null => {
  try { return kind === 'local' ? window.localStorage : window.sessionStorage; } catch { return null; }
};

function DataStorage() {
  const qc = useQueryClient();
  const offline = useStore(connectivity, (c) => c === 'offline');
  const [, bump] = useState(0);
  const [confirm, setConfirm] = useState<ClearAction | null>(null);
  const [busy, setBusy] = useState(false);
  const achCount = useStore(achievements, (s) => Object.keys(s.unlocked).length);
  const createdCount = useStore(created, (c) => c.length);
  const stats = pokeApi.persistentStats();

  const refresh = async () => {
    setBusy(true);
    try {
      pokeApi.clearPersistent();
      await qc.invalidateQueries({ queryKey: ['pokeapi'], refetchType: 'active' });
      await qc.invalidateQueries({ queryKey: ['pokeapi-list'], refetchType: 'active' });
    } finally {
      setBusy(false);
      bump((n) => n + 1);
    }
  };

  const run = (a: ClearAction) => {
    switch (a) {
      case 'cache':
        pokeApi.clearPersistent();
        void qc.resetQueries();
        break;
      case 'achievements':
        resetAchievements();
        break;
      case 'created':
        clearCreated();
        break;
      case 'preferences':
        settings.reset();
        break;
      case 'all':
        // §9: todas las claves pbx1:* de localStorage y sessionStorage, cachés y stores.
        removePbxKeys(safeStorage('local'));
        removePbxKeys(safeStorage('session'));
        pokeApi.clearPersistent();
        void qc.resetQueries();
        settings.reset();
        achievements.reset();
        created.reset();
        recent.reset();
        clearNotifications();
        clearToasts();
        break;
    }
    bump((n) => n + 1);
  };

  const CONFIRM: Record<ClearAction, { title: string; message: string }> = {
    cache: { title: es.settings.clearCache, message: es.settings.confirmClearCache },
    achievements: { title: es.settings.clearAchievements, message: es.settings.confirmClearAchievements },
    created: { title: es.settings.clearCreated, message: es.settings.confirmClearCreated },
    preferences: { title: es.settings.clearPreferences, message: es.settings.confirmClearPreferences },
    all: { title: es.settings.clearAll, message: es.settings.confirmClearAll },
  };
  const kb = formatNumber((stats.chars * 2) / 1024, { maximumFractionDigits: 0 });

  return (
    <>
      <Group title={es.settings.sections.datos}>
        <p className={`${styles.usage} tabular`}>
          <Icon name="descargar" size={20} />
          {stats.enabled ? es.settings.cacheUsage(stats.entries, kb) : es.settings.cacheMemoryOnly}
        </p>
        <div className={styles.buttons}>
          <button type="button" className={`${styles.button} ${styles.primary}`} disabled={offline || busy} onClick={() => { void refresh(); }}>
            <Icon name="flecha" size={18} />{es.settings.refreshCache}
          </button>
          <button type="button" className={styles.button} onClick={() => setConfirm('cache')}>{es.settings.clearCache}</button>
        </div>
      </Group>
      <Group title={es.settings.clearAll}>
        <div className={styles.buttons}>
          <button type="button" className={styles.button} onClick={() => setConfirm('achievements')}>
            {es.settings.clearAchievements} <span className={styles.badge}>{achCount}</span>
          </button>
          <button type="button" className={styles.button} onClick={() => setConfirm('created')}>
            {es.settings.clearCreated} <span className={styles.badge}>{createdCount}</span>
          </button>
          <button type="button" className={styles.button} onClick={() => setConfirm('preferences')}>{es.settings.clearPreferences}</button>
          <button type="button" className={`${styles.button} ${styles.danger}`} onClick={() => setConfirm('all')}>{es.settings.clearAll}</button>
        </div>
      </Group>
      {confirm ? (
        <ConfirmDialog
          title={CONFIRM[confirm].title}
          message={CONFIRM[confirm].message}
          confirmLabel={CONFIRM[confirm].title}
          onConfirm={() => run(confirm)}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- Acerca de

function About() {
  const meta = useQuery(metaQuery());       // prioridad baja; si falla, la fecha y el hash se ocultan
  return (
    <>
      <Group title={es.app.name}>
        <p className={styles.version}>{es.settings.version(__APP_VERSION__)}</p>
      </Group>
      <Group title={es.settings.credits}>
        <p>{es.credits.original}</p>
        <a className={styles.extLink} href={es.credits.repoUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="flecha" size={18} />{es.credits.repoLabel}
        </a>
      </Group>
      <Group title={es.settings.legal}>
        <p className={styles.legal}>{es.legal}</p>
      </Group>
      <Group title={es.settings.apiData}>
        {meta.isSuccess ? (
          <ul role="list" className={styles.meta}>
            {meta.data.deploy_date ? <li>{es.settings.deployDate(formatDate(meta.data.deploy_date))}</li> : null}
            {meta.data.hash ? <li className="tabular">{es.settings.hash(meta.data.hash.slice(0, 12))}</li> : null}
          </ul>
        ) : null}
        <a className={styles.extLink} href={es.credits.docsUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="api" size={18} />{es.credits.docsLabel}
        </a>
      </Group>
    </>
  );
}
