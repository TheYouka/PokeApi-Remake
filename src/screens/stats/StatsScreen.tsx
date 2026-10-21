// Estadísticas (§13.8, RF-ORIG-1): los 10 colores, los 15 grupos huevo y los 9 hábitats (high y
// deduplicados) con progreso "n/34"; filtro ?gen=1..9 (generation/{n}); tablas con número y %, "Más
// común: X (N)" (empates unidos con "y"); Pokémon creados con "Incluir creados"; CSV y JSON por tabla.
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { displayCode } from '../../api/errors';
import { pickName, toBcp47 } from '../../api/localize';
import type { Name, NamedAPIResource } from '../../api/types/common';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { toCsv } from '../../data/csv';
import { downloadCsv, downloadJson } from '../../data/download';
import { useDataLang } from '../../data/hooks';
import { resourceQuery } from '../../data/queries';
import { idsOf, useResourceSet } from '../../data/resourceSets';
import { countBy, mode, percentages, type CountSet } from '../../data/statsCounts';
import { es } from '../../i18n/es';
import { formatNumber } from '../../i18n/format';
import { track } from '../../state/achievements';
import { created as createdStore, type CreatedPokemon } from '../../state/created';
import { useStore } from '../../state/store';
import { parseGenParam } from '../../state/validation';
import { POKEMON_COLORS, type PokemonColorName } from '../../ui/colors';
import { MiniTable } from '../../ui/data/MiniTable';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { Icon } from '../../ui/icons';
import { Picker } from '../../ui/Picker';
import { Skeleton } from '../../ui/Skeleton';
import { Switch } from '../../ui/Switch';
import styles from './StatsScreen.module.css';

const s = es.statistics;
const GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

interface SpeciesSet { name: string; names: Name[]; pokemon_species: NamedAPIResource[] }
interface TableRow { key: string; label: string; lang: string | null; count: number; percent: number }

function buildRows(
  items: readonly (SpeciesSet | undefined)[],
  lang: string,
  filter: ReadonlySet<number> | null,
  extra: (key: string) => number,
): TableRow[] {
  const loaded = items.filter((x): x is SpeciesSet => x !== undefined);
  const sets: CountSet[] = loaded.map((x) => ({ key: x.name, members: idsOf(x.pokemon_species), extra: extra(x.name) }));
  const labels = new Map(loaded.map((x) => [x.name, pickName(x.names, lang, x.name)]));
  return percentages(countBy(sets, filter)).map((c) => ({
    ...c,
    label: labels.get(c.key)?.text ?? c.key,
    lang: labels.get(c.key)?.lang ?? null,
  }));
}

function StatTable({ id, title, rows, swatch, note, ready, error, onRetry }: {
  id: string; title: string; rows: TableRow[]; swatch?: boolean; note?: string; ready: boolean; error: unknown; onRetry: () => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const top = mode(rows, (k) => rows.find((r) => r.key === k)?.label ?? k, s.tie);
  const total = rows.reduce((n, r) => n + r.count, 0);
  const exportRows = rows.map((r) => ({ slug: r.key, nombre: r.label, numero: r.count, porcentaje: r.percent }));
  const columns = [
    { key: 'slug', label: s.slug },
    { key: 'nombre', label: s.name },
    { key: 'numero', label: s.count },
    { key: 'porcentaje', label: s.percent },
  ] as const;
  return (
    <section className={styles.card} aria-labelledby={`${id}-title`} data-stats-table={id}>
      <h2 id={`${id}-title`} className={styles.cardTitle}>{title}</h2>
      {error ? <ErrorPanel level={2} code={displayCode(error)} onRetry={onRetry} /> : null}
      {!ready && !error ? <Skeleton height="320px" /> : null}
      {ready ? (
        <>
          <p className={styles.mode}>{top ? s.mostCommon(top.label, formatNumber(top.count)) : es.app.dash}</p>
          <MiniTable
            caption={title}
            captionHidden
            rowHeader={!swatch}
            columns={[
              ...(swatch ? [{ key: 'swatch', label: s.swatch }] : []),
              { key: 'name', label: s.name },
              { key: 'count', label: s.count, numeric: true },
              { key: 'percent', label: s.percent, numeric: true },
            ]}
            rows={rows.map((r) => ({
              key: r.key,
              cells: [
                ...(swatch ? [<span key="sw" className={styles.swatch} aria-hidden="true"
                  style={{ background: Object.hasOwn(POKEMON_COLORS, r.key) ? POKEMON_COLORS[r.key as PokemonColorName] : 'transparent' }} />] : []),
                <span key="n" lang={r.lang ? toBcp47(r.lang) : undefined}>{r.label}</span>,
                formatNumber(r.count),
                formatNumber(r.percent, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
              ],
            }))}
          />
          <p className={`${styles.total} tabular`}>{s.total(formatNumber(total))}</p>
          {note ? <p className={styles.note}>{note}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.button}
              onClick={() => setStatus(downloadCsv(`estadisticas-${id}.csv`, toCsv(exportRows, columns)))}>
              <Icon name="descargar" size={18} />{es.charts.csv}
            </button>
            <button type="button" className={styles.button}
              onClick={() => setStatus(downloadJson(`estadisticas-${id}.json`, exportRows))}>
              <Icon name="descargar" size={18} />{es.charts.json}
            </button>
          </div>
          {status ? <p role="status" className={styles.status}>{status}</p> : null}
        </>
      ) : null}
    </section>
  );
}

export default function StatsScreen() {
  useDocumentTitle(s.title, { recent: true });
  useEffect(() => { track({ type: 'stats-opened' }); }, []);
  const lang = useDataLang();
  const [params, setParams] = useSearchParams();
  const gen = parseGenParam(params.get('gen'));
  const [includeCreated, setIncludeCreated] = useState(true);
  const createdList = useStore(createdStore, (x) => x);

  const colors = useResourceSet('pokemon-color');
  const eggs = useResourceSet('egg-group');
  const habitats = useResourceSet('pokemon-habitat');
  const generation = useQuery({ ...resourceQuery('generation', { kind: 'id', value: gen ?? 1 }), enabled: gen !== null });

  // ?gen inválido → se quita (replace).
  useEffect(() => {
    const raw = params.get('gen');
    if (raw !== null && gen === null) {
      const next = new URLSearchParams(params);
      next.delete('gen');
      setParams(next, { replace: true });
    }
  }, [params, gen, setParams]);

  const filter = useMemo(
    () => (gen !== null && generation.data ? new Set(idsOf(generation.data.pokemon_species)) : null),
    [gen, generation.data],
  );
  // Los creados no tienen generación: solo cuentan en "Todas las generaciones".
  const created: readonly CreatedPokemon[] = includeCreated && gen === null ? createdList : [];
  const genReady = gen === null || filter !== null;

  const colorRows = useMemo(
    () => buildRows(colors.items, lang, filter, (k) => created.filter((c) => c.color === k).length),
    [colors.items.map((x) => x?.id).join(), lang, filter, created],
  );
  const eggRows = useMemo(
    () => buildRows(eggs.items, lang, filter, (k) => created.filter((c) => (c.eggGroups as readonly string[]).includes(k)).length),
    [eggs.items.map((x) => x?.id).join(), lang, filter, created],
  );
  const habitatRows = useMemo(
    () => buildRows(habitats.items, lang, filter, (k) => created.filter((c) => c.habitat === k).length),
    [habitats.items.map((x) => x?.id).join(), lang, filter, created],
  );

  const total = (colors.total ?? 0) + (eggs.total ?? 0) + (habitats.total ?? 0);
  const loaded = colors.loaded + eggs.loaded + habitats.loaded;
  const known = colors.total !== null && eggs.total !== null && habitats.total !== null;

  const setGen = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'all') next.delete('gen');
    else next.set('gen', v);
    setParams(next, { replace: true });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <p className="caption">{es.home.tools}</p>
          <h1 tabIndex={-1} data-focus-start="">{s.title}</h1>
        </div>
        <div className={styles.controls}>
          <Picker
            label={s.generation}
            value={gen === null ? 'all' : String(gen)}
            options={[{ value: 'all', label: es.charts.allGens }, ...GENS.map((g) => ({ value: String(g), label: es.charts.genOption(g) }))]}
            onChange={setGen}
          />
          <Switch
            label={s.includeCreated}
            checked={includeCreated}
            onChange={setIncludeCreated}
            note={includeCreated
              ? (gen === null ? s.includesCreated(createdList.length) : s.createdOnlyAll)
              : undefined}
          />
          <div className={styles.progress}>
            <span className={styles.progressLabel} id="stats-progress">
              {s.progressLabel}{' '}
              <span className="tabular">{s.progress(loaded, known ? total : 34)}</span>
            </span>
            <progress aria-labelledby="stats-progress" max={known ? total : 34} value={loaded} />
          </div>
        </div>
      </header>
      {generation.isError ? <ErrorPanel level={2} code={displayCode(generation.error)} onRetry={() => void generation.refetch()} /> : null}
      <div className={styles.grid}>
        <StatTable id="colores" title={s.colors} rows={colorRows} swatch
          ready={colors.done && genReady} error={colors.error} onRetry={colors.retry} />
        <StatTable id="grupos-huevo" title={s.eggGroups} rows={eggRows}
          ready={eggs.done && genReady} error={eggs.error} onRetry={eggs.retry} />
        <StatTable id="habitats" title={s.habitats} rows={habitatRows} note={s.habitatNote}
          ready={habitats.done && genReady} error={habitats.error} onRetry={habitats.retry} />
      </div>
    </div>
  );
}
