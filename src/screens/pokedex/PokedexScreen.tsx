// Pokédex (§13.1, RF-DEX): cuadrícula virtualizada con búsqueda, sugerencias y filtros cruzados en la
// URL. Datos: useDexIndex (2 listas) + useTypeCatalog (1 + 18) y, por filtro de especie activo, su
// recurso (generation/1…). Los tipos de las tarjetas salen del catálogo: ni un detalle por tarjeta.
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { displayCode } from '../../api/errors';
import type { NamedAPIResource } from '../../api/types/common';
import { parseResourceUrl, validateIdOrName } from '../../api/urls';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { useDexIndex, type DexEntry } from '../../data/dexIndex';
import { applyFilters, type CreatedFilterMeta, type FilterSets } from '../../data/filters';
import { cachedLocalizedName, useDataLang, useListAll, useListVisit } from '../../data/hooks';
import { resourceQuery } from '../../data/queries';
import { normalizeQuery, rankSuggestions } from '../../data/search';
import { useTypeCatalog } from '../../data/typeCatalog';
import { es } from '../../i18n/es';
import { formatSlug, padDex } from '../../i18n/format';
import { useAction } from '../../nav/actions';
import { focusElement } from '../../nav/focusEngine';
import {
  parseFlagParam, parseGenParam, parseQueryParam, parseSlugParam, parseTypeParam,
} from '../../state/validation';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { useHints } from '../../ui/HintBar';
import { SearchBox } from '../../ui/SearchBox';
import { Skeleton, SkeletonRegion } from '../../ui/Skeleton';
import { SpriteImage } from '../../ui/SpriteImage';
import { VirtualGrid } from '../../ui/VirtualGrid';
import { pokemonSprite } from '../../data/sprites';
import { DexCard, pokemonRef } from './DexCard';
import { FilterBar, type DexFilters, type SpeciesFilterKey } from './FilterBar';
import styles from './PokedexScreen.module.css';

const DEBOUNCE_MS = 120;
const CARD_W = 168;
const CARD_H = 220;
const GAP = 12;

const SPECIES_RESOURCE = {
  color: 'pokemon-color', habitat: 'pokemon-habitat', shape: 'pokemon-shape', egg: 'egg-group',
} as const satisfies Record<SpeciesFilterKey, string>;

interface DexState extends DexFilters { q: string | null }

/** Orden fijo de los parámetros: q, type, gen, color, habitat, shape, egg, forms. */
function serialize(s: DexState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.types.length > 0) p.set('type', s.types.join(','));
  if (s.gen !== null) p.set('gen', String(s.gen));
  if (s.color) p.set('color', s.color);
  if (s.habitat) p.set('habitat', s.habitat);
  if (s.shape) p.set('shape', s.shape);
  if (s.egg) p.set('egg', s.egg);
  if (s.forms) p.set('forms', '1');
  return p;
}

const namesOf = (list: { results: readonly NamedAPIResource[] } | undefined): Set<string> | null =>
  (list ? new Set(list.results.map((r) => r.name)) : null);

export default function PokedexScreen() {
  useDocumentTitle(es.pokedex.title, { recent: true });
  useListVisit('pokemon');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lang = useDataLang();
  const [params, setParams] = useSearchParams();
  const dex = useDexIndex();
  const catalog = useTypeCatalog();
  const lists = {
    color: useListAll('pokemon-color'),
    habitat: useListAll('pokemon-habitat'),
    shape: useListAll('pokemon-shape'),
    egg: useListAll('egg-group'),
  };

  // ------------------------------------------------------------ estado desde la URL (§19)
  const validTypes = catalog.battleTypeNames.length > 0 ? new Set(catalog.battleTypeNames) : null;
  const valid = {
    color: namesOf(lists.color.data), habitat: namesOf(lists.habitat.data),
    shape: namesOf(lists.shape.data), egg: namesOf(lists.egg.data),
  };
  const state: DexState = {
    q: parseQueryParam(params.get('q')),
    types: parseTypeParam(params.get('type'), validTypes),
    gen: parseGenParam(params.get('gen')),
    color: parseSlugParam(params.get('color'), valid.color),
    habitat: parseSlugParam(params.get('habitat'), valid.habitat),
    shape: parseSlugParam(params.get('shape'), valid.shape),
    egg: parseSlugParam(params.get('egg'), valid.egg),
    forms: parseFlagParam(params.get('forms')),
  };
  const canonical = serialize(state).toString();

  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearch = () => { if (searchRef.current) focusElement(searchRef.current); };
  const wantsSearchFocus = params.get('buscar') === '1';

  // Valores desconocidos y ?buscar= se eliminan con replace; ?buscar=1 enfoca el buscador al montar.
  useEffect(() => {
    // Tras el foco inicial de la navegación (FocusEngine enfoca el h1 en el mismo commit).
    if (wantsSearchFocus) setTimeout(focusSearch, 0);
    const current = new URLSearchParams(params);
    current.delete('buscar');
    if (current.toString() !== canonical || params.has('buscar')) setParams(new URLSearchParams(canonical), { replace: true });
  }, [canonical, params, setParams, wantsSearchFocus]);

  // El primer filtro aplicado hace push (Atrás lo deshace); los siguientes, replace.
  const pushed = useRef(false);
  const committedQ = useRef<string | null>(state.q);
  const commit = (next: DexState) => {
    const replace = pushed.current;
    pushed.current = true;
    committedQ.current = next.q;
    setParams(serialize(next), { replace });
  };

  // ------------------------------------------------------------ buscador
  const [text, setText] = useState(state.q ?? '');
  useEffect(() => {
    // Solo si la URL cambió desde fuera (Atrás, enlaces): lo que escribimos nosotros no pisa el campo.
    if (state.q === committedQ.current) return;
    committedQ.current = state.q;
    setText((t) => (normalizeQuery(t) === (state.q ?? '') ? t : state.q ?? ''));
  }, [state.q]);
  // Temporizador del ?q= pendiente: al navegar a una ficha se cancela, porque un setParams tardío
  // interrumpiría la navegación mientras se carga el chunk de la ficha (se quedaría en /pokemon?q=…).
  const pendingCommit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPendingCommit = () => {
    if (pendingCommit.current !== null) { clearTimeout(pendingCommit.current); pendingCommit.current = null; }
  };
  useEffect(() => {
    const q = normalizeQuery(text);
    if (q === (state.q ?? '')) return;
    const id = setTimeout(() => { pendingCommit.current = null; commit({ ...state, q: q === '' ? null : q }); }, DEBOUNCE_MS);
    pendingCommit.current = id;
    return () => { clearTimeout(id); if (pendingCommit.current === id) pendingCommit.current = null; };
  }, [text, canonical]);

  useAction('y', () => { focusSearch(); return true; }, 1);
  useHints([{ action: 'y', label: es.hints.search, key: 'y' }]);

  // ------------------------------------------------------------ filtros por especie
  const speciesFilters = useMemo(() => {
    const out: { key: string; resource: 'generation' | (typeof SPECIES_RESOURCE)[SpeciesFilterKey]; value: string }[] = [];
    if (state.gen !== null) out.push({ key: 'gen', resource: 'generation', value: String(state.gen) });
    for (const k of ['color', 'habitat', 'shape', 'egg'] as const) {
      const v = state[k];
      if (v !== null && valid[k] !== null) out.push({ key: k, resource: SPECIES_RESOURCE[k], value: v });
    }
    return out;
  }, [state.gen, state.color, state.habitat, state.shape, state.egg, valid.color, valid.habitat, valid.shape, valid.egg]);
  const speciesQueries = useQueries({
    queries: speciesFilters.map((f) => resourceQuery(f.resource, validateIdOrName(f.value)!)),
  });
  const speciesStamp = speciesQueries.map((q) => `${q.status}:${q.dataUpdatedAt}`).join('|');
  const speciesSets = useMemo(
    () => speciesQueries.map((q) => {
      const refs = (q.data as { pokemon_species?: NamedAPIResource[] } | undefined)?.pokemon_species;
      return refs ? new Set(refs.map((r) => parseResourceUrl(r.url)?.id ?? -1)) : null;
    }),
    [speciesStamp],
  );
  const typeSets = useMemo(
    () => state.types.map((t) => {
      const d = catalog.details.get(t);
      return d ? new Set(d.pokemon.map((p) => parseResourceUrl(p.pokemon.url)?.id ?? -1)) : null;
    }),
    [state.types.join(','), catalog.details],
  );
  const pendingFilter = speciesSets.some((s) => s === null) || typeSets.some((s) => s === null)
    || (state.types.length > 0 && catalog.status === 'loading');
  const failedFilter = speciesQueries.find((q) => q.isError);

  // ------------------------------------------------------------ resultados
  const createdById = useMemo(() => new Map(dex.createdList.map((c) => [c.id, c])), [dex.createdList]);
  const createdMeta: CreatedFilterMeta = {
    byId: createdById,
    active: { types: state.types, color: state.color, habitat: state.habitat, egg: state.egg, gen: state.gen, shape: state.shape },
  };
  const results = useMemo(() => {
    if (!dex.entries || pendingFilter) return null;
    const f: FilterSets = {
      typePokemonIds: typeSets.filter((s): s is Set<number> => s !== null),
      speciesSets: speciesSets.filter((s): s is Set<number> => s !== null),
    };
    return applyFilters(dex.entries, f, { includeForms: state.forms, q: state.q ?? '', createdMeta });
  }, [dex.entries, pendingFilter, typeSets, speciesSets, state.forms, state.q, canonical, createdById]);

  const suggestionPool = useMemo(
    () => (dex.entries ?? []).filter((e) => e.isDefault || state.forms),
    [dex.entries, state.forms],
  );
  const suggestions = useMemo(
    () => rankSuggestions(suggestionPool, text, {
      localizedName: (e) => (e.created ? null : cachedLocalizedName(qc, pokemonRef(e.id, e.slug), lang)?.text ?? null),
    }),
    [suggestionPool, text, qc, lang],
  );
  const entryIds = useMemo(() => new Set((dex.entries ?? []).map((e) => e.id)), [dex.entries]);

  const onSubmit = (value: string) => {
    const q = normalizeQuery(value);
    cancelPendingCommit();
    if (/^\d{1,6}$/.test(q) && entryIds.has(Number(q))) { void navigate(`/pokemon/${Number(q)}`); return; }
    commit({ ...state, q: q === '' ? null : q });
  };

  const typeRefsOf = (e: DexEntry): NamedAPIResource<'type'>[] | null => {
    if (e.created) {
      const c = createdById.get(e.id);
      return c ? c.types.map((t) => catalog.refOf(t)).filter((r): r is NamedAPIResource<'type'> => r !== null) : null;
    }
    const names = catalog.typesByPokemonId?.get(e.id);
    return names ? names.map((t) => catalog.refOf(t)).filter((r): r is NamedAPIResource<'type'> => r !== null) : null;
  };

  // ------------------------------------------------------------ render
  if (dex.pokemon.isError) {
    return <div className={styles.page}><ErrorPanel code={displayCode(dex.pokemon.error)} onRetry={() => void dex.pokemon.refetch()} /></div>;
  }

  const typesFailed = catalog.status === 'partial' || catalog.status === 'error';
  const speciesFailed = dex.species.isError;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <p className="caption">{es.groups.pokemon}</p>
          <h1 tabIndex={-1} data-focus-start="">{es.pokedex.title}</h1>
          {results ? <p className={`${styles.count} tabular`} role="status">{es.pokedex.results(results.length)}</p> : null}
        </div>
        <SearchBox
          label={es.pokedex.search}
          placeholder={es.pokedex.searchPlaceholder}
          value={text}
          onChange={setText}
          inputRef={searchRef}
          focusId="pokedex:search"
          suggestions={suggestions}
          suggestionKey={(e) => e.id}
          suggestionLabel={(e) => es.pokedex.suggestionAria(padDex(e.id), formatSlug(e.slug))}
          renderSuggestion={(e) => (
            <>
              <SpriteImage src={e.created ? null : pokemonSprite(e.id)} alt="" width={40} height={40} pixelated />
              <span className="tabular">{padDex(e.id)}</span>
              <span>{cachedLocalizedName(qc, pokemonRef(e.id, e.slug), lang)?.text ?? formatSlug(e.slug)}</span>
            </>
          )}
          onPick={(e) => { cancelPendingCommit(); void navigate(`/pokemon/${e.id}`); }}
          onSubmit={onSubmit}
        />
      </header>

      <FilterBar
        filters={state}
        onChange={(f) => commit({ ...f, q: state.q })}
        typeOptions={catalog.battleTypes}
        lists={{
          color: lists.color.data?.results ?? null,
          habitat: lists.habitat.data?.results ?? null,
          shape: lists.shape.data?.results ?? null,
          egg: lists.egg.data?.results ?? null,
        }}
        typesDisabled={typesFailed || catalog.battleTypes.length === 0}
        speciesDisabled={speciesFailed}
      />
      {typesFailed ? (
        <p className={styles.inlineError} role="status">
          {es.errors.typesFailed}
          <button type="button" className={styles.retry} onClick={catalog.retry}>{es.errors.retry}</button>
        </p>
      ) : null}
      {speciesFailed ? (
        <p className={styles.inlineError} role="status">
          {es.errors.speciesFailed}
          <button type="button" className={styles.retry} onClick={() => void dex.species.refetch()}>{es.errors.retry}</button>
        </p>
      ) : null}
      {failedFilter ? (
        <p className={styles.inlineError} role="status">
          {es.pokedex.filterFailed} · {es.errors.code(displayCode(failedFilter.error))}
          <button type="button" className={styles.retry} onClick={() => void failedFilter.refetch()}>{es.errors.retry}</button>
        </p>
      ) : null}

      {results === null ? (
        <SkeletonRegion className={styles.skeletonGrid} label={pendingFilter && dex.entries ? es.pokedex.loadingFilter : es.app.loading}>
          {Array.from({ length: 12 }, (_, i) => <Skeleton key={i} height={CARD_H} radius="2px" />)}
        </SkeletonRegion>
      ) : results.length === 0 ? (
        <EmptyState message={es.empty.pokemon} />
      ) : (
        <VirtualGrid
          items={results}
          minItemWidth={CARD_W}
          itemHeight={CARD_H}
          gap={GAP}
          ariaLabel={es.pokedex.gridLabel}
          getKey={(e) => e.id}
          renderItem={(e, i) => (
            <DexCard entry={e} types={typeRefsOf(e)} createdColor={createdById.get(e.id)?.color} autofocus={i === 0} />
          )}
        />
      )}
    </div>
  );
}
