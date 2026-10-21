// Cabecera de la ficha (§13.2, RF-POK-1/2/3): imagen de 420 px (LCP, fetchpriority="high") con
// Shiny, Frontal/Trasero, Hembra y Variedad (se ocultan las opciones con URL nula); número, nombre,
// genus, tipos y chips; gritos con aviso en línea; Comparar con…; anterior y siguiente.
import { useQueryClient } from '@tanstack/react-query';
import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router';
import { pickGenus, toBcp47 } from '../../api/localize';
import type { NamedAPIResource } from '../../api/types/common';
import type { Pokemon, PokemonSpecies } from '../../api/types/pokemon';
import { playCry } from '../../audio/sfx';
import { cachedLocalizedName, useDataLang } from '../../data/hooks';
import { es } from '../../i18n/es';
import { formatSlug, padDex } from '../../i18n/format';
import { track } from '../../state/achievements';
import type { PokemonTab } from '../../state/validation';
import { POKEMON_COLORS, typeColor, type PokemonColorName } from '../../ui/colors';
import { LangBadge } from '../../ui/data/LocalizedText';
import { Icon } from '../../ui/icons';
import { Picker } from '../../ui/Picker';
import { SpriteImage } from '../../ui/SpriteImage';
import { TypeBadge } from '../../ui/TypeBadge';
import styles from './PokemonScreen.module.css';

export interface Neighbor { id: number; slug: string; ref: NamedAPIResource }

type View = 'artwork' | 'front' | 'back';

export interface HeroProps {
  pokemon: Pokemon;
  species: PokemonSpecies | undefined;
  name: { text: string; lang: string | null };
  shiny: boolean;
  onToggleShiny: () => void;
  prev: Neighbor | null;
  next: Neighbor | null;
  tab: PokemonTab;
}

function spriteUrl(p: Pokemon, view: View, shiny: boolean, female: boolean): string | null {
  const s = p.sprites;
  if (view === 'artwork') {
    const art = s.other?.['official-artwork'];
    return (shiny ? art?.front_shiny : art?.front_default) ?? null;
  }
  const variant = female ? (shiny ? 'shiny_female' : 'female') : shiny ? 'shiny' : 'default';
  return s[`${view}_${variant}` as const] ?? null;
}

type CryState = { kind: 'idle' } | { kind: 'failed'; ogg: boolean };

function NeighborLink({ n, dir, tab }: { n: Neighbor; dir: 'prev' | 'next'; tab: PokemonTab }) {
  const qc = useQueryClient();
  const lang = useDataLang();
  const name = cachedLocalizedName(qc, n.ref, lang)?.text ?? formatSlug(n.slug);
  const num = padDex(n.id);
  const to = tab === 'resumen' ? `/pokemon/${n.id}` : `/pokemon/${n.id}/${tab}`;
  return (
    <Link
      to={to}
      viewTransition
      className={styles.neighbor}
      data-dir={dir}
      aria-label={dir === 'prev' ? es.pokemon.prevAria(name) : es.pokemon.nextAria(name)}
    >
      {dir === 'prev' ? es.pokemon.prev(num, name) : es.pokemon.next(num, name)}
    </Link>
  );
}

export function Hero({ pokemon, species, name, shiny, onToggleShiny, prev, next, tab }: HeroProps) {
  const lang = useDataLang();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('artwork');
  const [female, setFemale] = useState(false);
  const [cry, setCry] = useState<CryState>({ kind: 'idle' });

  const genus = species ? pickGenus(species.genera, lang) : null;
  const speciesColor = species && Object.hasOwn(POKEMON_COLORS, species.color.name)
    ? POKEMON_COLORS[species.color.name as PokemonColorName] : '#888888';
  const firstType = pokemon.types.find((t) => t.slot === 1)?.type.name ?? pokemon.types[0]?.type.name ?? 'normal';
  const heroStyle = { '--hero-color': speciesColor, '--hero-glow': typeColor(firstType) } as CSSProperties;

  const effFemale = female && view !== 'artwork';
  const src = spriteUrl(pokemon, view, shiny, effFemale);
  const canShiny = spriteUrl(pokemon, view, true, effFemale) !== null;
  const hasFront = pokemon.sprites.front_default !== null;
  const hasBack = pokemon.sprites.back_default !== null;
  const hasFemale = Boolean(species?.has_gender_differences) && pokemon.sprites.front_female !== null;
  const dexNumber = species?.id ?? pokemon.id;
  const varieties = species?.varieties ?? [];

  const playOne = async (url: string) => {
    const result = await playCry(url);
    if (result === 'ok') { setCry({ kind: 'idle' }); track({ type: 'cry-played' }); }
    else setCry({ kind: 'failed', ogg: result === 'unsupported' });
  };

  return (
    <section className={styles.hero} style={heroStyle} aria-labelledby="pokemon-title">
      <div className={styles.heroMedia}>
        <div className={styles.heroImage}>
          <SpriteImage
            src={src}
            alt={view === 'artwork'
              ? es.pokemon.artworkAlt(name.text, shiny)
              : es.pokemon.heroSpriteAlt(name.text, view === 'back', effFemale, shiny)}
            width={420}
            height={420}
            priority
            pixelated={view !== 'artwork'}
          />
        </div>
        <div className={styles.controls} role="group" aria-label={es.pokemon.controls}>
          {canShiny ? (
            <button type="button" className={styles.toggle} aria-pressed={shiny} onClick={onToggleShiny} data-focus-id="hero:shiny">
              <Icon name="estrella" size={18} />{es.pokemon.shiny}
            </button>
          ) : null}
          {hasFront ? (
            <button type="button" className={styles.toggle} aria-pressed={view === 'front'} onClick={() => setView((v) => (v === 'front' ? 'artwork' : 'front'))}>
              {es.pokemon.front}
            </button>
          ) : null}
          {hasBack ? (
            <button type="button" className={styles.toggle} aria-pressed={view === 'back'} onClick={() => setView((v) => (v === 'back' ? 'artwork' : 'back'))}>
              {es.pokemon.back}
            </button>
          ) : null}
          {hasFemale ? (
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={effFemale}
              onClick={() => { setFemale((f) => !f); if (view === 'artwork') setView('front'); }}
            >
              <Icon name="genero" size={18} />{es.pokemon.female}
            </button>
          ) : null}
        </div>
        {varieties.length > 1 ? (
          <Picker
            label={es.pokemon.variety}
            value={pokemon.name}
            options={varieties.map((v) => ({ value: v.pokemon.name, label: formatSlug(v.pokemon.name) }))}
            onChange={(v) => void navigate(`/pokemon/${v}`)}
          />
        ) : null}
      </div>

      <div className={styles.heroText}>
        <p className={`${styles.dexNumber} tabular`}>{padDex(dexNumber)}</p>
        <h1 id="pokemon-title" tabIndex={-1} data-focus-start="" className={styles.title} lang={name.lang ? toBcp47(name.lang) : undefined}>
          {name.text}
          {name.lang && name.lang !== 'es' ? <LangBadge code={name.lang} /> : null}
        </h1>
        {genus ? <p className={styles.genus} lang={genus.lang ? toBcp47(genus.lang) : undefined}>{genus.text}</p> : null}
        <div className={styles.typeRow}>
          {[...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => <TypeBadge key={t.type.name} type={t.type} />)}
          {species?.is_legendary ? <span className={styles.flag}>{es.pokemon.legendary}</span> : null}
          {species?.is_mythical ? <span className={styles.flag}>{es.pokemon.mythical}</span> : null}
          {species?.is_baby ? <span className={styles.flag}>{es.pokemon.baby}</span> : null}
        </div>
        <div className={styles.actions}>
          {pokemon.cries.latest ? (
            <button type="button" className={styles.action} onClick={() => void playOne(pokemon.cries.latest!)} aria-label={es.cry.play}>
              {es.pokemon.cry}
            </button>
          ) : null}
          {pokemon.cries.legacy ? (
            <button type="button" className={styles.action} onClick={() => void playOne(pokemon.cries.legacy!)} aria-label={es.cry.playLegacy}>
              {es.pokemon.cryLegacy}
            </button>
          ) : null}
          <Link to={`/comparar?a=${pokemon.id}`} viewTransition className={styles.action}>
            <Icon name="comparar" size={18} />{es.pokemon.compareWith}
          </Link>
        </div>
        <p role="status" className={styles.cryStatus}>
          {cry.kind === 'failed' ? `${es.cry.failed}${cry.ogg ? ` · ${es.cry.ogg}` : ''}` : ''}
        </p>
        <div className={styles.neighbors}>
          {prev ? <NeighborLink n={prev} dir="prev" tab={tab} /> : null}
          {next ? <NeighborLink n={next} dir="next" tab={tab} /> : null}
        </div>
      </div>
    </section>
  );
}
