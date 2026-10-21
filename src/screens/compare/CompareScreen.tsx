// Comparar (§13.5, RF-CMP): dos ranuras con SearchBox en modo selector; URL ?a=&b= con replace y sin
// reescribir a ID (se comparte tal cual). Barras en espejo con data-compare-side y la columna central
// data-compare-diff (▲/▼ además del color). compare-used con los dos pokemon cargados.
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { displayCode } from '../../api/errors';
import { pickName, toBcp47 } from '../../api/localize';
import type { NamedAPIResource } from '../../api/types/common';
import type { Pokemon, PokemonSpecies, Type } from '../../api/types/pokemon';
import { BASE_URL, parseResourceUrl, validateIdOrName, type IdOrName } from '../../api/urls';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { defensiveGroups } from '../../data/effectiveness';
import { cachedLocalizedName, useDataLang, useListAll, useRefData } from '../../data/hooks';
import { refQuery, resourceQuery } from '../../data/queries';
import { rankSuggestions, type SearchEntry } from '../../data/search';
import { pokemonSprite } from '../../data/sprites';
import { es } from '../../i18n/es';
import { dmToM, formatSlug, hgToKg, padDex } from '../../i18n/format';
import { track } from '../../state/achievements';
import { DamageRelations } from '../../ui/data/DamageRelations';
import { ResourceLink } from '../../ui/data/ResourceLink';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { SearchBox } from '../../ui/SearchBox';
import { Skeleton } from '../../ui/Skeleton';
import { SpriteImage } from '../../ui/SpriteImage';
import { STAT_KEYS, StatBars, statValues } from '../../ui/StatBars';
import { TypeBadge } from '../../ui/TypeBadge';
import styles from './CompareScreen.module.css';

type Side = 'a' | 'b';
const EMPTY_ID: IdOrName = { kind: 'id', value: 0 };

interface SideData {
  id: IdOrName | null;
  pokemon: Pokemon | undefined;
  species: PokemonSpecies | undefined;
  types: Type[] | null;
  error: unknown;
  retry: () => void;
}

function useSide(raw: string | null): SideData {
  const id = raw === null ? null : validateIdOrName(raw);
  // Sin parámetro válido la consulta queda deshabilitada: no se pide nada (§5.2, §19).
  const q = useQuery({ ...resourceQuery('pokemon', id ?? EMPTY_ID), enabled: id !== null });
  const pokemon = id ? q.data : undefined;
  const species = useRefData(pokemon?.species ?? null, { priority: 'high' }).data;
  const typeQs = useQueries({ queries: (pokemon?.types ?? []).map((t) => ({ ...refQuery(t.type, 'high') })) });
  const types = pokemon && typeQs.every((t) => t.data) ? typeQs.map((t) => t.data as Type) : null;
  return { id, pokemon, species, types, error: id ? q.error : null, retry: () => void q.refetch() };
}

function nameOf(d: SideData, lang: string): { text: string; lang: string | null } {
  if (!d.pokemon) return { text: '', lang: null };
  if (d.species && d.pokemon.is_default) return pickName(d.species.names, lang, d.pokemon.name);
  return { text: formatSlug(d.pokemon.name), lang: null };
}

function Slot({ side, data, value, onPick, entries, autofocus }: {
  side: Side; data: SideData; value: string; onPick: (slug: string) => void; entries: readonly SearchEntry[]; autofocus: boolean;
}) {
  const qc = useQueryClient();
  const lang = useDataLang();
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const suggestions = useMemo(() => rankSuggestions(entries, text), [entries, text]);
  const name = nameOf(data, lang);
  const label = (e: SearchEntry) => cachedLocalizedName(qc, { name: e.slug, url: `${BASE_URL}pokemon/${e.id}/` }, lang)?.text ?? formatSlug(e.slug);
  return (
    <div className={styles.slot} data-slot={side}>
      <SearchBox
        mode="selector"
        label={side === 'a' ? es.compare.slotA : es.compare.slotB}
        placeholder={es.compare.pick}
        value={text}
        onChange={setText}
        autofocus={autofocus}
        focusId={`compare:${side}`}
        suggestions={suggestions}
        suggestionKey={(e) => e.id}
        suggestionLabel={(e) => `${padDex(e.id)} ${label(e)}`}
        renderSuggestion={(e) => (
          <>
            <SpriteImage src={pokemonSprite(e.id)} alt="" width={40} height={40} pixelated />
            <span className="tabular">{padDex(e.id)}</span>
            <span>{label(e)}</span>
          </>
        )}
        onPick={(e) => { setText(e.slug); onPick(e.slug); }}
      />
      {data.error ? <ErrorPanel level={2} code={displayCode(data.error)} onRetry={data.retry} /> : null}
      {data.id && !data.pokemon && !data.error ? <Skeleton height="320px" /> : null}
      {data.pokemon ? (
        <div className={styles.card}>
          <SpriteImage
            src={data.pokemon.sprites.other?.['official-artwork']?.front_default ?? null}
            alt={es.pokemon.artworkAlt(name.text)}
            width={240}
            height={240}
          />
          <p className="tabular caption">{padDex(data.species?.id ?? data.pokemon.id)}</p>
          <h2 className={styles.name} lang={name.lang ? toBcp47(name.lang) : undefined}>{name.text}</h2>
          <div className={styles.types}>
            {[...data.pokemon.types].sort((x, y) => x.slot - y.slot).map((t) => <TypeBadge key={t.type.name} type={t.type} />)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Details({ data }: { data: SideData }) {
  if (!data.pokemon) return <div />;
  const p = data.pokemon;
  return (
    <div className={styles.details}>
      <dl className={styles.facts}>
        <div><dt className="caption">{es.compare.height}</dt><dd>{dmToM(p.height)}</dd></div>
        <div><dt className="caption">{es.compare.weight}</dt><dd>{hgToKg(p.weight)}</dd></div>
        <div>
          <dt className="caption">{es.compare.abilities}</dt>
          <dd className={styles.abilities}>
            {[...p.abilities].sort((x, y) => x.slot - y.slot).map((a) => (
              <span key={a.ability.name}>
                <ResourceLink resource={a.ability} />
                {a.is_hidden ? <span className={styles.flag}>{es.blocks.hidden}</span> : null}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <h3 className={styles.subTitle}>{es.compare.defense}</h3>
      {data.types ? <DamageRelations groups={defensiveGroups(data.types)} /> : <Skeleton height="5em" />}
    </div>
  );
}

export default function CompareScreen() {
  useDocumentTitle(es.compare.title, { recent: true });
  const [params, setParams] = useSearchParams();
  const rawA = params.get('a');
  const rawB = params.get('b');
  const a = useSide(rawA);
  const b = useSide(rawB);
  const list = useListAll('pokemon');
  const entries = useMemo<SearchEntry[]>(
    () => (list.data?.results ?? []).map((r: NamedAPIResource) => ({ id: parseResourceUrl(r.url)?.id ?? 0, slug: r.name })).filter((e) => e.id > 0),
    [list.data],
  );

  // Parámetros inválidos: se vacía esa ranura (replace). Los válidos se conservan tal cual.
  useEffect(() => {
    const next = new URLSearchParams(params);
    let changed = false;
    for (const k of ['a', 'b'] as const) {
      const v = params.get(k);
      if (v !== null && validateIdOrName(v) === null) { next.delete(k); changed = true; }
    }
    if (changed) setParams(next, { replace: true });
  }, [params, setParams]);

  const setSide = (side: Side, slug: string) => {
    const next = new URLSearchParams(params);
    next.set(side, slug);
    setParams(next, { replace: true });
  };

  const both = a.pokemon && b.pokemon ? `${a.pokemon.id}|${b.pokemon.id}` : null;
  useEffect(() => { if (both) track({ type: 'compare-used' }); }, [both]);

  const va = a.pokemon ? statValues(a.pokemon.stats) : null;
  const vb = b.pokemon ? statValues(b.pokemon.stats) : null;
  const total = (v: number[] | null) => (v ? v.reduce((s, x) => s + x, 0) : null);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="caption">{es.groups.pokemon}</p>
        <h1 tabIndex={-1} data-focus-start="">{es.compare.title}</h1>
      </header>
      <div className={styles.slots}>
        <Slot side="a" data={a} value={rawA ?? ''} onPick={(s) => setSide('a', s)} entries={entries} autofocus={false} />
        <Slot side="b" data={b} value={rawB ?? ''} onPick={(s) => setSide('b', s)} entries={entries} autofocus={a.id !== null && b.id === null} />
      </div>
      {va && vb ? (
        <section className={styles.versus} aria-label={es.stats.listLabel}>
          <StatBars values={va} variant="left" hideLabels showTotal={false} compareSide="a" />
          <div className={styles.diff} data-compare-diff="" role="list" aria-label={es.compare.diff}>
            {STAT_KEYS.map((k, i) => {
              const d = (va[i] ?? 0) - (vb[i] ?? 0);
              return (
                <div key={k} role="listitem" className={styles.diffRow} data-stat={k} data-diff={d} data-sign={d > 0 ? 'up' : d < 0 ? 'down' : 'eq'}
                  aria-label={es.compare.diffAria(es.stats.labels[k]!, d)}>
                  <span className={styles.diffLabel} aria-hidden="true">{es.stats.labels[k]}</span>
                  <span className={`${styles.diffValue} tabular`} aria-hidden="true">{es.compare.diffValue(d)}</span>
                </div>
              );
            })}
          </div>
          <StatBars values={vb} variant="right" hideLabels showTotal={false} compareSide="b" />
          <p className={`${styles.total} tabular`}>{total(va)}</p>
          <p className={`${styles.totalLabel}`}>{es.compare.total} · {es.compare.diffValue((total(va) ?? 0) - (total(vb) ?? 0))}</p>
          <p className={`${styles.total} tabular`}>{total(vb)}</p>
        </section>
      ) : !a.id || !b.id ? <EmptyState message={es.compare.empty} icon="comparar" /> : null}
      {a.pokemon || b.pokemon ? (
        <div className={styles.slots}>
          <Details data={a} />
          <Details data={b} />
        </div>
      ) : null}
    </div>
  );
}

