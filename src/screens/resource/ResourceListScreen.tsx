// Lista genérica de un recurso (§7.2): /:resource. Clave fuera del registro o 'pokemon' → 404 sin
// peticiones. Toda la lista sale de UNA petición listAll; las etiquetas se piden solo para las filas
// visibles (useInViewDwell) según el labelMode del registro. VirtualList (ventana), filas de 64 px.
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { displayCode } from '../../api/errors';
import { toBcp47 } from '../../api/localize';
import { RESOURCES, type ResourceKey } from '../../api/resources';
import type { APIResource, NamedAPIResource } from '../../api/types/common';
import { parseResourceUrl } from '../../api/urls';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { useInViewDwell, useListAll, useListVisit, useLocalizedLabel } from '../../data/hooks';
import { refHref } from '../../data/links';
import { normalizeQuery } from '../../data/search';
import { es } from '../../i18n/es';
import { formatNumber } from '../../i18n/format';
import { RESOURCE_UI, isRegistryKey } from '../../registry/resources';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { Icon } from '../../ui/icons';
import { SearchBox } from '../../ui/SearchBox';
import { Skeleton, SkeletonRegion } from '../../ui/Skeleton';
import { SpriteImage } from '../../ui/SpriteImage';
import { VirtualList } from '../../ui/VirtualList';
import NotFoundScreen from '../error/NotFoundScreen';
import styles from './ResourceListScreen.module.css';

const ROW_HEIGHT = 64;
const ID_RE = /^-?\d{1,6}$/;
const NO_SUGGESTIONS: never[] = [];

interface Row { id: number; slug: string; ref: NamedAPIResource | APIResource }
type Sort = 'id' | 'az';

export default function ResourceListScreen() {
  const { resource = '' } = useParams();
  if (!isRegistryKey(resource) || resource === 'pokemon') return <NotFoundScreen />;
  return <ResourceList key={resource} r={resource} />;
}

function ListRow({ r, row }: { r: ResourceKey; row: Row }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const ui = RESOURCE_UI[r];
  const visible = useInViewDwell(ref);
  const label = useLocalizedLabel(row.ref, ui.labelMode, { enabled: visible });
  const href = refHref(row.ref, 'chip') ?? `/${r}/${row.id}`;
  const thumb = ui.thumb ? ui.thumb(row.id, row.slug || null) : undefined;
  return (
    <Link
      ref={ref}
      to={href}
      viewTransition
      className={styles.row}
      data-nav=""
      data-focus-id={`row:${r}:${row.id}`}
      data-nothumb={thumb === undefined ? '' : undefined}
    >
      <span className={styles.idChip}>{es.list.idChip(row.id)}</span>
      {thumb !== undefined ? <SpriteImage src={thumb} alt="" width={48} height={48} pixelated /> : null}
      <span className={styles.label} lang={label.lang ? toBcp47(label.lang) : undefined}>{label.text}</span>
      <Icon name="chevron" size={20} className={styles.chevron} />
    </Link>
  );
}

function ResourceList({ r }: { r: ResourceKey }) {
  const ui = RESOURCE_UI[r];
  const named = RESOURCES[r].named;
  const navigate = useNavigate();
  useDocumentTitle(ui.label, { recent: true });
  useListVisit(r);
  const list = useListAll(r);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('id');
  const [status, setStatus] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const ref of (list.data?.results ?? []) as readonly (NamedAPIResource | APIResource)[]) {
      const p = parseResourceUrl(ref.url);
      if (p) out.push({ id: p.id, slug: 'name' in ref ? ref.name : '', ref });
    }
    return out.sort((a, b) => a.id - b.id);
  }, [list.data]);
  const ids = useMemo(() => new Set(rows.map((x) => x.id)), [rows]);

  const shown = useMemo<Row[]>(() => {
    const base = sort === 'az' && named ? [...rows].sort((a, b) => a.slug.localeCompare(b.slug)) : rows;
    if (!named) return base;
    const raw = query.trim();
    const q = normalizeQuery(raw);
    if (raw === '' || (q === '' && !ID_RE.test(raw))) return base;
    if (ID_RE.test(raw)) {
      // Búsqueda por ID (requisitos §3.2): la fila con ese id primero y después las que contienen los dígitos.
      const n = Number(raw) + 0;
      const exact = base.filter((x) => x.id === n);
      const rest = base.filter((x) => x.id !== n && q !== '' && x.slug.includes(q));
      return [...exact, ...rest];
    }
    return base.filter((x) => x.slug.includes(q));
  }, [rows, sort, named, query]);

  /** Enter: n en los IDs de listAll → /{r}/{n}; si no, "No existe el n.º {n}" sin ninguna petición. */
  const goTo = (text: string) => {
    const raw = text.trim();
    if (ID_RE.test(raw)) {
      const n = Number(raw) + 0;
      if (ids.has(n)) { setStatus(null); void navigate(`/${r}/${n}`); }
      else setStatus(es.errors.noSuchId(n));
      return;
    }
    const q = normalizeQuery(raw);
    const hit = q === '' ? undefined : rows.find((x) => x.slug === q);
    if (hit) void navigate(refHref(hit.ref, 'chip') ?? `/${r}/${hit.id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <p className="caption">{es.groups[ui.group]}</p>
          <h1 tabIndex={-1} data-focus-start="">{ui.label}</h1>
          {list.data ? <p className={`${styles.count} tabular`}>{es.list.count(formatNumber(list.data.count))}</p> : null}
        </div>
        <div className={styles.tools}>
          {named ? (
            <>
              <div className={styles.search}>
                <SearchBox
                  label={es.list.search(ui.label)}
                  placeholder={es.list.searchPlaceholder}
                  value={query}
                  onChange={(v) => { setQuery(v); setStatus(null); }}
                  suggestions={NO_SUGGESTIONS}
                  suggestionKey={() => ''}
                  renderSuggestion={() => null}
                  suggestionLabel={() => ''}
                  onPick={() => undefined}
                  onSubmit={goTo}
                  focusId={`list-search:${r}`}
                  status={status}
                />
              </div>
              <div className={styles.sort}>
                <span className={styles.sortLabel} id={`sort-${r}`}>{es.list.sort}</span>
                <div className={styles.sortGroup} role="group" aria-labelledby={`sort-${r}`}>
                  <button type="button" className={styles.sortButton} aria-pressed={sort === 'id'} onClick={() => setSort('id')}>{es.list.sortId}</button>
                  <button type="button" className={styles.sortButton} aria-pressed={sort === 'az'} onClick={() => setSort('az')}>{es.list.sortAz}</button>
                </div>
              </div>
            </>
          ) : (
            <GoToField r={r} status={status} onGo={goTo} onEdit={() => setStatus(null)} />
          )}
        </div>
      </header>
      {list.isError ? <ErrorPanel code={displayCode(list.error)} onRetry={() => void list.refetch()} /> : null}
      {list.isPending ? (
        <SkeletonRegion>
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={ROW_HEIGHT - 4} />)}
        </SkeletonRegion>
      ) : null}
      {list.data && shown.length === 0 ? <EmptyState message={es.list.empty} /> : null}
      {list.data && shown.length > 0 ? (
        <VirtualList
          items={shown}
          rowHeight={ROW_HEIGHT}
          overscan={6}
          scroll={{ mode: 'window' }}
          ariaLabel={ui.label}
          getKey={(x) => x.id}
          renderItem={(x) => <ListRow r={r} row={x} />}
        />
      ) : null}
    </div>
  );
}

/** "Ir al #" de los recursos sin nombre: solo dígitos, máximo 6. */
function GoToField({ r, status, onGo, onEdit }: { r: ResourceKey; status: string | null; onGo: (v: string) => void; onEdit: () => void }) {
  const [value, setValue] = useState('');
  const id = `goto-${r}`;
  return (
    <form className={styles.goto} onSubmit={(e) => { e.preventDefault(); if (value !== '') onGo(value); }}>
      <label htmlFor={id} className={styles.gotoLabel}>{es.list.goTo}</label>
      <div className={styles.gotoRow}>
        <input
          id={id}
          className={styles.gotoInput}
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          placeholder={es.list.goToPlaceholder}
          value={value}
          aria-describedby={status ? `${id}-status` : undefined}
          data-focus-id={`goto:${r}`}
          onChange={(e) => { setValue(e.target.value.replace(/\D/g, '').slice(0, 6)); onEdit(); }}
        />
        <button type="submit" className={styles.gotoButton}>{es.list.go}</button>
      </div>
      {status ? <p id={`${id}-status`} role="status" className={styles.status}>{status}</p> : null}
    </form>
  );
}
