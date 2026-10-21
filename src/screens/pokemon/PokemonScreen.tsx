// Ficha de Pokémon (§13.2, RF-POK): /pokemon/:idOrName/:tab?. Parámetro inválido → 404 sin petición;
// forma canónica distinta → <Navigate replace>; ID creado (1026–9999) → CreatedPokemonView; pestaña
// inválida → replace a la base. Carga inicial de Resumen ≤ 19 peticiones (tabla de §13.2).
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { displayCode } from '../../api/errors';
import { pickName } from '../../api/localize';
import type { Pokemon, PokemonSpecies } from '../../api/types/pokemon';
import { canonicalIdOrName, parseResourceUrl, validateIdOrName, type IdOrName } from '../../api/urls';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { useDataLang, useListAll, useRefData, useResource } from '../../data/hooks';
import { pokemonSprite } from '../../data/sprites';
import { es } from '../../i18n/es';
import { formatSlug } from '../../i18n/format';
import { useAction } from '../../nav/actions';
import { track } from '../../state/achievements';
import { CREATED_MAX_ID, CREATED_MIN_ID, created } from '../../state/created';
import { addRecent } from '../../state/recent';
import { useStore } from '../../state/store';
import { POKEMON_TABS, parsePokemonTab, type PokemonTab } from '../../state/validation';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { useHints } from '../../ui/HintBar';
import { Skeleton, SkeletonRegion } from '../../ui/Skeleton';
import NotFoundScreen from '../error/NotFoundScreen';
import { CreatedPokemonView } from './CreatedPokemonView';
import { Hero, type Neighbor } from './Hero';
import { Encuentros } from './tabs/Encuentros';
import { Evolucion } from './tabs/Evolucion';
import { Formas } from './tabs/Formas';
import { Movimientos } from './tabs/Movimientos';
import { Naturaleza } from './tabs/Naturaleza';
import { Resumen } from './tabs/Resumen';
import styles from './PokemonScreen.module.css';

const tabPath = (base: string, tab: PokemonTab) => (tab === 'resumen' ? base : `${base}/${tab}`);

export default function PokemonScreen() {
  const { idOrName = '', tab } = useParams();
  const createdList = useStore(created, (s) => s);
  const parsed = validateIdOrName(idOrName);
  if (!parsed) return <NotFoundScreen />;
  const canonical = canonicalIdOrName(parsed);
  const tabValue = parsePokemonTab(tab);
  if (canonical !== idOrName || tabValue === null) {
    return <Navigate replace to={tabPath(`/pokemon/${canonical}`, tabValue ?? 'resumen')} />;
  }
  if (parsed.kind === 'id' && parsed.value >= CREATED_MIN_ID && parsed.value <= CREATED_MAX_ID) {
    const mine = createdList.find((c) => c.id === parsed.value);
    if (mine) return <CreatedPokemonView pokemon={mine} />;
  }
  return <PokemonDetail key={canonical} id={parsed} base={`/pokemon/${canonical}`} tab={tabValue} />;
}

/** Anterior y siguiente según listAll('pokemon') (sin useDexIndex: 1 sola petición). */
function useNeighbors(pokemonId: number | undefined): { prev: Neighbor | null; next: Neighbor | null } {
  const list = useListAll('pokemon');
  if (pokemonId === undefined || !list.data) return { prev: null, next: null };
  const results = list.data.results;
  const i = results.findIndex((r) => parseResourceUrl(r.url)?.id === pokemonId);
  if (i < 0) return { prev: null, next: null };
  const at = (j: number): Neighbor | null => {
    const r = results[j];
    const id = r ? parseResourceUrl(r.url)?.id : undefined;
    return r && id !== undefined ? { id, slug: r.name, ref: r } : null;
  };
  return { prev: at(i - 1), next: at(i + 1) };
}

function displayName(pokemon: Pokemon | undefined, species: PokemonSpecies | undefined, lang: string): { text: string; lang: string | null } | null {
  if (!pokemon) return null;
  if (!pokemon.is_default || !species) return { text: formatSlug(pokemon.name), lang: null };
  return pickName(species.names, lang, pokemon.name);
}

function PokemonDetail({ id, base, tab }: { id: IdOrName; base: string; tab: PokemonTab }) {
  const navigate = useNavigate();
  const lang = useDataLang();
  const pokemonQ = useResource('pokemon', id);
  const pokemon = pokemonQ.data;
  const speciesQ = useRefData(pokemon?.species ?? null, { priority: 'high' });
  const species = speciesQ.data;
  const { prev, next } = useNeighbors(pokemon?.id);
  const [shiny, setShiny] = useState(false);

  const name = displayName(pokemon, species, lang);
  useDocumentTitle(name?.text ?? null);

  // Visita: SOLO tras una carga correcta y con la identidad de los datos (§10.10). Un 404 no llega aquí.
  useEffect(() => {
    if (pokemon) track({ type: 'pokemon-viewed', id: pokemon.id });
  }, [pokemon?.id]);
  useEffect(() => {
    if (!pokemon || !name) return;
    addRecent({ path: `/pokemon/${pokemon.id}`, title: name.text, kind: 'pokemon', image: pokemonSprite(pokemon.id) });
  }, [pokemon?.id, name?.text]);

  const toggleShiny = () => {
    const nextValue = !shiny;
    setShiny(nextValue);
    if (nextValue) track({ type: 'shiny-toggled' });
  };

  const tabIndex = POKEMON_TABS.indexOf(tab);
  // Sin datos (carga o error 404) no hay pestañas ni vecinos: las acciones no se consumen y no hay pistas.
  const goTab = (delta: number) => {
    if (!pokemon) return false;
    const t = POKEMON_TABS[(tabIndex + delta + POKEMON_TABS.length) % POKEMON_TABS.length]!;
    void navigate(tabPath(base, t), { replace: true });
    return true;
  };
  const goNeighbor = (n: Neighbor | null) => {
    if (!n) return false;
    void navigate(tabPath(`/pokemon/${n.id}`, tab));
    return true;
  };
  useAction('lb', () => goTab(-1), 1);
  useAction('rb', () => goTab(1), 1);
  useAction('lt', () => goNeighbor(prev), 1);
  useAction('rt', () => goNeighbor(next), 1);
  useAction('x', () => { if (!pokemon) return false; toggleShiny(); return true; }, 1);
  useHints(pokemon ? [
    { action: 'rb', label: es.hints.tabs, key: 'lbrb' },
    { action: 'rt', label: es.hints.prevNext, key: 'ltrt' },
    { action: 'x', label: es.hints.shiny, key: 'x' },
  ] : []);

  if (pokemonQ.isError) {
    return <div className={styles.page}><ErrorPanel code={displayCode(pokemonQ.error)} onRetry={() => void pokemonQ.refetch()} /></div>;
  }
  if (!pokemon) {
    return (
      <div className={styles.page}>
        <SkeletonRegion className={styles.heroSkeleton}>
          <Skeleton width={420} height={420} radius="50%" />
          <div className={styles.heroSkeletonText}>
            <Skeleton width="30%" height="1.2em" />
            <Skeleton width="60%" height="3em" />
            <Skeleton width="40%" height="1.2em" />
          </div>
        </SkeletonRegion>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Hero
        pokemon={pokemon}
        species={species}
        name={name!}
        shiny={shiny}
        onToggleShiny={toggleShiny}
        prev={prev}
        next={next}
        tab={tab}
      />
      <nav className={styles.tabs} aria-label={es.pokemon.tabsNav} data-focus-group="pokemon-tabs">
        {POKEMON_TABS.map((t) => (
          <Link
            key={t}
            to={tabPath(base, t)}
            replace
            viewTransition
            className={styles.tab}
            aria-current={t === tab ? 'page' : undefined}
            data-focus-id={`tab:${t}`}
          >
            {es.pokemon.tabs[t]}
          </Link>
        ))}
      </nav>
      <div className={styles.panel} aria-label={es.pokemon.tabs[tab]} role="region">
        {tab === 'resumen' ? <Resumen pokemon={pokemon} species={species} speciesError={speciesQ.error} /> : null}
        {tab === 'movimientos' ? <Movimientos pokemon={pokemon} /> : null}
        {tab === 'evolucion' ? <Evolucion species={species} speciesError={speciesQ.error} /> : null}
        {tab === 'encuentros' ? <Encuentros pokemon={pokemon} /> : null}
        {tab === 'formas' ? <Formas pokemon={pokemon} species={species} /> : null}
        {tab === 'naturaleza' ? <Naturaleza pokemon={pokemon} species={species} /> : null}
      </div>
    </div>
  );
}

