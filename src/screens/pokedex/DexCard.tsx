// Tarjeta de la Pokédex (§13.1): sprite de 96 px, "#0025", nombre (slug o caché; la especie se pide
// solo tras 150 ms visible) y 1–2 TypeBadge del catálogo. Los creados llevan silueta e insignia
// "Creado". A los 500 ms de foco se precargan pokemon/{id} y pokemon-species/{id} (low).
import { useQueryClient } from '@tanstack/react-query';
import { memo, useRef } from 'react';
import { Link } from 'react-router';
import { usePreloadOnDwell } from '../../app/preload';
import { pickName } from '../../api/localize';
import type { NamedAPIResource } from '../../api/types/common';
import { BASE_URL } from '../../api/urls';
import type { DexEntry } from '../../data/dexIndex';
import { cachedLocalizedName, useDataLang, useInViewDwell, useRefData } from '../../data/hooks';
import { refQuery } from '../../data/queries';
import { pokemonSprite } from '../../data/sprites';
import { es } from '../../i18n/es';
import { formatSlug, padDex } from '../../i18n/format';
import { CreatedSilhouette } from '../../ui/data/CreatedSilhouette';
import { SpriteImage } from '../../ui/SpriteImage';
import { TypeBadge } from '../../ui/TypeBadge';
import styles from './DexCard.module.css';

const PREFETCH_MS = 500;

export const pokemonRef = (id: number, slug = ''): NamedAPIResource<'pokemon'> => ({ name: slug, url: `${BASE_URL}pokemon/${id}/` });
export const speciesRef = (id: number, slug = ''): NamedAPIResource<'pokemon-species'> => ({ name: slug, url: `${BASE_URL}pokemon-species/${id}/` });

export interface DexCardProps {
  entry: DexEntry;
  /** Tipos del catálogo (null si no está listo: sin badges). */
  types: readonly NamedAPIResource<'type'>[] | null;
  /** Color del creado (silueta). */
  createdColor?: string;
  autofocus?: boolean;
}

function DexCardImpl({ entry, types, createdColor, autofocus = false }: DexCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const qc = useQueryClient();
  const lang = useDataLang();
  const visible = useInViewDwell(ref);
  const wantsSpecies = !entry.created && entry.isDefault && entry.speciesId !== null;
  const species = useRefData(wantsSpecies ? speciesRef(entry.speciesId!, entry.slug) : null, { enabled: visible, priority: 'low' });

  let name = formatSlug(entry.slug);
  let nameLang: string | undefined;
  if (wantsSpecies && species.data) {
    const l = pickName(species.data.names, lang, entry.slug);
    name = l.text;
    nameLang = l.lang ?? undefined;
  } else if (!entry.created) {
    const cached = cachedLocalizedName(qc, pokemonRef(entry.id, entry.slug), lang);
    if (cached) { name = cached.text; nameLang = cached.lang; }
  }

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFocus = () => {
    if (entry.created || timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      void qc.prefetchQuery(refQuery(pokemonRef(entry.id, entry.slug), 'low'));
      if (entry.speciesId !== null) void qc.prefetchQuery(refQuery(speciesRef(entry.speciesId), 'low'));
    }, PREFETCH_MS);
  };
  const onBlur = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  // Precarga del chunk de la ficha a los 300 ms de foco o hover (§16).
  const href = `/pokemon/${entry.id}`;
  const preload = usePreloadOnDwell(href);

  const num = padDex(entry.id);
  return (
    <Link
      ref={ref}
      to={href}
      viewTransition
      data-nav=""
      data-focus-id={`card:${entry.id}`}
      data-autofocus={autofocus ? '' : undefined}
      data-created={entry.created ? '' : undefined}
      className={styles.card}
      aria-label={es.pokedex.cardAria(num, name, entry.created)}
      onFocus={() => { onFocus(); preload.onFocus(); }}
      onBlur={() => { onBlur(); preload.onBlur(); }}
      onPointerEnter={preload.onPointerEnter}
      onPointerLeave={preload.onPointerLeave}
    >
      <span className={styles.media}>
        {entry.created
          ? <CreatedSilhouette color={createdColor ?? 'gray'} size={96} />
          : <SpriteImage src={pokemonSprite(entry.id)} alt="" width={96} height={96} pixelated />}
      </span>
      <span className={`${styles.num} tabular`} aria-hidden="true">{num}</span>
      <span className={styles.name} lang={nameLang}>{name}</span>
      <span className={styles.types}>
        {entry.created ? <span className={styles.createdBadge}>{es.blocks.created}</span> : null}
        {types?.map((t) => <TypeBadge key={t.name} type={t} size="small" />)}
      </span>
    </Link>
  );
}

export const DexCard = memo(DexCardImpl);
