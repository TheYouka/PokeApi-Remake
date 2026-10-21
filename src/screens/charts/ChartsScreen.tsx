// Gráficas (§13.9, RF-ORIG-2): 4 ChartFrame con exportación SVG, PNG, CSV y JSON.
// 1) pastel por color (global o por generación); 2) pastel por tipo (type.pokemon de formas por defecto
// ∩ especies de la generación; un Pokémon con dos tipos cuenta en ambos; ErrorPanel si el catálogo de
// tipos está en partial/error); 3) barras agrupadas de los 18 tipos en la generación A frente a la B;
// 4) stats base de un Pokémon (SearchBox) con el degradado del original.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { displayCode } from '../../api/errors';
import { pickName } from '../../api/localize';
import type { NamedAPIResource } from '../../api/types/common';
import type { Generation } from '../../api/types/games';
import { BASE_URL, parseResourceUrl, validateIdOrName } from '../../api/urls';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { cachedLocalizedName, useDataLang, useListAll } from '../../data/hooks';
import { resourceQuery } from '../../data/queries';
import { idsOf, useResourceSet } from '../../data/resourceSets';
import { rankSuggestions, type SearchEntry } from '../../data/search';
import { pokemonSprite } from '../../data/sprites';
import { mode, percentages } from '../../data/statsCounts';
import { useTypeCatalog } from '../../data/typeCatalog';
import { es } from '../../i18n/es';
import { formatSlug, padDex } from '../../i18n/format';
import { track } from '../../state/achievements';
import { BarChart } from '../../ui/charts/BarChart';
import { ChartFrame, type ChartRow } from '../../ui/charts/ChartFrame';
import { GroupedBarChart, SERIES_COLORS } from '../../ui/charts/GroupedBarChart';
import { PieChart } from '../../ui/charts/PieChart';
import { POKEMON_COLORS, typeColor, type PokemonColorName } from '../../ui/colors';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { Picker } from '../../ui/Picker';
import { SearchBox } from '../../ui/SearchBox';
import { Spinner } from '../../ui/Spinner';
import { SpriteImage } from '../../ui/SpriteImage';
import { STAT_KEYS, statColor, statValues } from '../../ui/StatBars';
import styles from './ChartsScreen.module.css';

const c = es.charts;
const GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const MAX_DEFAULT_ID = 10000;
const GEN_OPTIONS = [{ value: 'all', label: c.allGens }, ...GENS.map((g) => ({ value: String(g), label: c.genOption(g) }))];
const GEN_ONLY = GENS.map((g) => ({ value: String(g), label: c.genOption(g) }));

/** generation/{n} (o nada con null) y el conjunto de IDs de sus especies. */
function useGenerationIds(gen: number | null) {
  const q = useQuery({ ...resourceQuery('generation', { kind: 'id', value: gen ?? 1 }), enabled: gen !== null });
  const ids = useMemo(() => (gen !== null && q.data ? new Set(idsOf((q.data as Generation).pokemon_species)) : null), [gen, q.data]);
  return { q, ids, ready: gen === null || ids !== null };
}

const scopeOf = (gen: number | null) => (gen === null ? c.scopeAll : c.genLong(gen));
const pctRows = <T extends { key: string; label: string; count: number }>(rows: T[]): ChartRow[] =>
  percentages(rows).map((r) => ({ slug: r.key, nombre: rows.find((x) => x.key === r.key)?.label ?? r.key, numero: r.count, porcentaje: r.percent }));
const PIE_COLUMNS = (label: string) => [
  { key: 'slug', label: c.slug },
  { key: 'nombre', label },
  { key: 'numero', label: c.count, numeric: true },
  { key: 'porcentaje', label: c.percent, numeric: true },
] as const;

// ---------------------------------------------------------------- 1. pastel por color
function ColorPie() {
  const lang = useDataLang();
  const [gen, setGen] = useState<number | null>(null);
  const colors = useResourceSet('pokemon-color');
  const g = useGenerationIds(gen);
  const rows = useMemo(() => colors.items.flatMap((x) => (x ? [{
    key: x.name,
    label: pickName(x.names, lang, x.name).text,
    count: idsOf(x.pokemon_species).filter((id) => !g.ids || g.ids.has(id)).length,
  }] : [])), [colors.items.map((x) => x?.id).join(), lang, g.ids]);
  const top = mode(rows, (k) => rows.find((r) => r.key === k)?.label ?? k, es.statistics.tie);
  const error = colors.error ?? g.q.error;
  const status = error
    ? <ErrorPanel level={2} code={displayCode(error)} onRetry={() => { colors.retry(); void g.q.refetch(); }} />
    : !colors.done || !g.ready ? <Spinner /> : null;
  return (
    <ChartFrame
      title={c.colorTitle}
      description={c.colorDesc(scopeOf(gen), top ? `${top.label} (${top.count})` : es.app.dash)}
      fileName={`grafica-colores-${gen ?? 'todas'}`}
      table={{ caption: c.colorTitle, columns: PIE_COLUMNS(c.color), rows: pctRows(rows) }}
      status={status}
      controls={<Picker label={c.generation} value={gen === null ? 'all' : String(gen)} options={GEN_OPTIONS}
        onChange={(v) => setGen(v === 'all' ? null : Number(v))} />}
    >
      {(a11y) => (
        <PieChart a11y={a11y} slices={rows.map((r) => ({
          ...r,
          value: r.count,
          color: Object.hasOwn(POKEMON_COLORS, r.key) ? POKEMON_COLORS[r.key as PokemonColorName] : '#888888',
        }))} />
      )}
    </ChartFrame>
  );
}

// ---------------------------------------------------------------- catálogo de tipos → conteos
function typeCounts(catalog: ReturnType<typeof useTypeCatalog>, lang: string, ids: ReadonlySet<number> | null) {
  return catalog.battleTypes.flatMap((t) => {
    const d = catalog.details.get(t.name);
    if (!d) return [];
    const count = d.pokemon.filter((p) => {
      const id = parseResourceUrl(p.pokemon.url)?.id;
      return id !== undefined && id <= MAX_DEFAULT_ID && (!ids || ids.has(id));
    }).length;
    return [{ key: t.name, label: pickName(d.names, lang, t.name).text, count }];
  });
}

function catalogStatus(catalog: ReturnType<typeof useTypeCatalog>) {
  if (catalog.status === 'error' || catalog.status === 'partial') {
    return <ErrorPanel level={2} code={displayCode(catalog.error)} onRetry={catalog.retry} />;
  }
  return catalog.status === 'loading' ? <Spinner /> : null;
}

// ---------------------------------------------------------------- 2. pastel por tipo
function TypePie({ catalog }: { catalog: ReturnType<typeof useTypeCatalog> }) {
  const lang = useDataLang();
  const [gen, setGen] = useState<number | null>(null);
  const g = useGenerationIds(gen);
  const rows = useMemo(() => typeCounts(catalog, lang, g.ids), [catalog.status, catalog.details, lang, g.ids]);
  const top = mode(rows, (k) => rows.find((r) => r.key === k)?.label ?? k, es.statistics.tie);
  const status = catalogStatus(catalog)
    ?? (g.q.error ? <ErrorPanel level={2} code={displayCode(g.q.error)} onRetry={() => void g.q.refetch()} /> : !g.ready ? <Spinner /> : null);
  return (
    <ChartFrame
      title={c.typeTitle}
      description={c.typeDesc(scopeOf(gen), top ? `${top.label} (${top.count})` : es.app.dash)}
      fileName={`grafica-tipos-${gen ?? 'todas'}`}
      table={{ caption: c.typeTitle, columns: PIE_COLUMNS(c.type), rows: pctRows(rows) }}
      status={status}
      controls={<Picker label={c.generation} value={gen === null ? 'all' : String(gen)} options={GEN_OPTIONS}
        onChange={(v) => setGen(v === 'all' ? null : Number(v))} />}
    >
      {(a11y) => <PieChart a11y={a11y} slices={rows.map((r) => ({ ...r, value: r.count, color: typeColor(r.key) }))} />}
    </ChartFrame>
  );
}

// ---------------------------------------------------------------- 3. tipos: generación A frente a B
function TypeCompare({ catalog }: { catalog: ReturnType<typeof useTypeCatalog> }) {
  const lang = useDataLang();
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const ga = useGenerationIds(a);
  const gb = useGenerationIds(b);
  const ra = useMemo(() => (ga.ids ? typeCounts(catalog, lang, ga.ids) : []), [catalog.status, catalog.details, lang, ga.ids]);
  const rb = useMemo(() => (gb.ids ? typeCounts(catalog, lang, gb.ids) : []), [catalog.status, catalog.details, lang, gb.ids]);
  const genError = ga.q.error ?? gb.q.error;
  const status = catalogStatus(catalog)
    ?? (genError ? <ErrorPanel level={2} code={displayCode(genError)} onRetry={() => { void ga.q.refetch(); void gb.q.refetch(); }} />
      : !ga.ids || !gb.ids ? <Spinner /> : null);
  const labelA = c.genOption(a);
  const labelB = c.genOption(b);
  const rows: ChartRow[] = ra.map((r, i) => ({ slug: r.key, nombre: r.label, [labelA]: r.count, [labelB]: rb[i]?.count ?? 0 }));
  return (
    <ChartFrame
      title={c.compareTitle}
      description={c.compareDesc(c.genLong(a), c.genLong(b))}
      fileName={`grafica-tipos-g${a}-g${b}`}
      table={{
        caption: c.compareTitle,
        columns: [{ key: 'slug', label: c.slug }, { key: 'nombre', label: c.type }, { key: labelA, label: labelA, numeric: true }, { key: labelB, label: labelB, numeric: true }],
        rows,
      }}
      status={status}
      controls={(
        <>
          <Picker label={c.genA} value={String(a)} options={GEN_ONLY} onChange={(v) => setA(Number(v))} />
          <Picker label={c.genB} value={String(b)} options={GEN_ONLY} onChange={(v) => setB(Number(v))} />
        </>
      )}
    >
      {(a11y) => (
        <GroupedBarChart
          a11y={a11y}
          categories={ra.map((r) => ({ key: r.key, label: r.label }))}
          series={[
            { label: labelA, color: SERIES_COLORS[0], values: ra.map((r) => r.count) },
            { label: labelB, color: SERIES_COLORS[1], values: rb.map((r) => r.count) },
          ]}
        />
      )}
    </ChartFrame>
  );
}

// ---------------------------------------------------------------- 4. stats de un Pokémon
function PokemonStats() {
  const qc = useQueryClient();
  const lang = useDataLang();
  const list = useListAll('pokemon');
  const [slug, setSlug] = useState('pikachu');
  const [text, setText] = useState('pikachu');
  const entries = useMemo<SearchEntry[]>(
    () => (list.data?.results ?? []).map((r: NamedAPIResource) => ({ id: parseResourceUrl(r.url)?.id ?? 0, slug: r.name })).filter((e) => e.id > 0),
    [list.data],
  );
  const suggestions = useMemo(() => rankSuggestions(entries, text), [entries, text]);
  const id = validateIdOrName(slug);
  const q = useQuery({ ...resourceQuery('pokemon', id ?? { kind: 'id', value: 25 }), enabled: id !== null });
  const label = (e: SearchEntry) => cachedLocalizedName(qc, { name: e.slug, url: `${BASE_URL}pokemon/${e.id}/` }, lang)?.text ?? formatSlug(e.slug);
  const name = q.data ? (cachedLocalizedName(qc, { name: q.data.name, url: `${BASE_URL}pokemon/${q.data.id}/` }, lang)?.text ?? formatSlug(q.data.name)) : '';
  const values = q.data ? statValues(q.data.stats) : [];
  const bars = STAT_KEYS.map((k, i) => ({ key: k, label: es.stats.labels[k]!, value: values[i] ?? 0, color: statColor(values[i] ?? 0) }));
  const status = q.isError ? <ErrorPanel level={2} code={displayCode(q.error)} onRetry={() => void q.refetch()} /> : !q.data ? <Spinner /> : null;
  return (
    <ChartFrame
      title={c.statsTitle}
      description={c.statsDesc(name, bars.map((x) => c.statItem(x.label, x.value)).join(c.itemSep))}
      fileName={`grafica-stats-${q.data?.name ?? slug}`}
      table={{
        caption: c.statsTitle,
        columns: [{ key: 'slug', label: c.slug }, { key: 'nombre', label: c.stat }, { key: 'valor', label: c.value, numeric: true }],
        rows: bars.map((x) => ({ slug: x.key, nombre: x.label, valor: x.value })),
      }}
      json={q.data ? { pokemon: q.data.name, id: q.data.id, stats: bars.map((x) => ({ stat: x.key, valor: x.value })) } : undefined}
      status={status}
      controls={(
        <div className={styles.search}>
          <SearchBox
            mode="selector"
            label={c.pokemon}
            placeholder={c.pokemonPick}
            value={text}
            onChange={setText}
            focusId="charts:pokemon"
            suggestions={suggestions}
            suggestionKey={(e) => e.id}
            suggestionLabel={(e) => `${padDex(e.id)} ${label(e)}`}
            renderSuggestion={(e) => (
              <span className={styles.option}>
                <SpriteImage src={pokemonSprite(e.id)} alt="" width={40} height={40} pixelated />
                <span className="tabular">{padDex(e.id)}</span>
                <span>{label(e)}</span>
              </span>
            )}
            onPick={(e) => { setText(e.slug); setSlug(e.slug); }}
          />
        </div>
      )}
    >
      {(a11y) => <BarChart a11y={a11y} bars={bars} max={255} />}
    </ChartFrame>
  );
}

export default function ChartsScreen() {
  useDocumentTitle(c.title, { recent: true });
  useEffect(() => { track({ type: 'stats-opened' }); }, []);
  const catalog = useTypeCatalog();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className="caption">{es.home.tools}</p>
        <h1 tabIndex={-1} data-focus-start="">{c.title}</h1>
      </header>
      <div className={styles.grid}>
        <ColorPie />
        <TypePie catalog={catalog} />
        <div className={styles.wide}><TypeCompare catalog={catalog} /></div>
        <PokemonStats />
      </div>
    </div>
  );
}
