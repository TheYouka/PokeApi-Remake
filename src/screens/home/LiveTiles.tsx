// Live tiles (§10.9): "Pokémon del día" (wide), collage del tile "Pokédex" (large), "Último logro"
// (wide) y "Baya del día" (medium). Elección diaria con dailyIndex sobre listAll; peticiones de las
// caras en prioridad baja. Fallos: si falla la lista, cara estática (icono + título, sin ErrorPanel ni
// sonido); si falla una cara, se omite; si no queda ninguna, cara estática.
import { pickFlavor, pickName, formatSlug } from '../../api/localize';
import type { APIResource, NamedAPIResource } from '../../api/types/common';
import { BASE_URL, parseResourceUrl } from '../../api/urls';
import { dailyIndex } from '../../data/daily';
import { useDataLang, useListAll, useLocalizedLabel, useRefData } from '../../data/hooks';
import { berryItemSprite, pokemonArtwork } from '../../data/sprites';
import { es } from '../../i18n/es';
import { formatDate, padDex } from '../../i18n/format';
import { achievementInfo, ACH_IDS, TOTAL_POINTS } from '../../state/achievementCatalog';
import { achievements, gamerscoreOf, recentUnlocks, unlockedCountOf } from '../../state/achievements';
import { useStore } from '../../state/store';
import { Icon } from '../../ui/icons';
import { SpriteImage } from '../../ui/SpriteImage';
import { Tile } from '../../ui/Tile';
import { TypeBadge } from '../../ui/TypeBadge';
import type { TileDef } from './pivots';
import styles from './LiveTiles.module.css';

interface LiveProps { def: TileDef; autofocus?: boolean }

/** El elemento del día de una lista (mismo índice todo el día local y entre recargas, AC-23). */
function useDaily<K extends 'pokemon-species' | 'berry'>(resource: K) {
  const list = useListAll(resource);
  const results = list.data?.results ?? [];
  const idx = dailyIndex(new Date(), results.length);
  const ref = idx >= 0 ? (results[idx] as NamedAPIResource<K>) : null;
  return { list, results, idx, ref, id: ref ? (parseResourceUrl(ref.url)?.id ?? null) : null };
}

/** Cara estática: icono + título + enlace a la lista del recurso. */
function StaticTile({ def, autofocus, to }: LiveProps & { to?: string }) {
  return (
    <Tile id={def.id} size={def.size} variant={def.variant === 'image' ? 'surface' : def.variant}
      title={def.title} icon={def.icon} ariaLabel={def.title} to={to ?? def.to} autofocus={autofocus} />
  );
}

function Caption({ children }: { children: string }) {
  return <span className={`${styles.caption} caption`}>{children}</span>;
}

// ---------------------------------------------------------------- Pokémon del día

export function DailyPokemonTile({ def, autofocus }: LiveProps) {
  const lang = useDataLang();
  const { list, ref, id } = useDaily('pokemon-species');
  const species = useRefData(ref);
  const formRef: APIResource<'pokemon-form'> | null = id !== null ? { url: `${BASE_URL}pokemon-form/${id}/` } : null;
  const form = useRefData(formRef);

  if (list.isError || (list.isSuccess && (ref === null || id === null))) return <StaticTile def={def} autofocus={autofocus} />;
  if (ref === null || id === null) {
    return <Tile id={def.id} size={def.size} variant="surface" title={def.title} icon={def.icon} ariaLabel={def.title} to={def.to} autofocus={autofocus} />;
  }

  const name = species.data ? pickName(species.data.names, lang, ref.name).text : formatSlug(ref.name);
  const art = pokemonArtwork(id);
  const flavor = species.data ? pickFlavor(species.data.flavor_text_entries, lang) : null;
  const faces = [
    <span key="art" className={styles.artFace}>
      <SpriteImage src={art} alt="" width={180} height={180} className={styles.art} />
      <Caption>{es.home.dailyPokemon}</Caption>
    </span>,
  ];
  if (form.isSuccess) {
    faces.push(
      <span key="info" className={styles.infoFace}>
        <SpriteImage src={art} alt="" width={96} height={96} className={styles.thumb} />
        <span className={styles.infoText}>
          <span className={`${styles.dex} tabular`}>{padDex(id)}</span>
          <span className={styles.name}>{name}</span>
          <span className={styles.types}>
            {form.data.types.map((t) => <TypeBadge key={t.type.name} type={t.type} size="small" />)}
          </span>
        </span>
      </span>,
    );
  }
  if (flavor) {
    faces.push(
      <span key="flavor" className={styles.flavorFace}>
        <Caption>{name}</Caption>
        <span className={styles.flavor} lang={flavor.lang ?? undefined}>{flavor.text}</span>
      </span>,
    );
  }

  return (
    <Tile
      id={def.id}
      size={def.size}
      variant="image"
      title={def.title}
      ariaLabel={es.home.dailyPokemonAria(name)}
      to={`/pokemon/${id}`}
      autofocus={autofocus}
      live={faces}
      reducedFace={faces.length > 1 ? 1 : 0}
    />
  );
}

// ---------------------------------------------------------------- collage del tile "Pokédex"

export function PokedexCollageTile({ def, autofocus }: LiveProps) {
  const { list, results, idx } = useDaily('pokemon-species');
  if (list.isError || (list.isSuccess && idx < 0)) return <StaticTile def={def} autofocus={autofocus} />;
  const ids: number[] = [];
  if (idx >= 0) {
    for (let k = 0; k < 4; k++) {
      const r = results[(idx + k) % results.length];
      const id = r ? parseResourceUrl(r.url)?.id : undefined;
      if (id !== undefined) ids.push(id);
    }
  }
  const media = (
    <span className={styles.collage}>
      {ids.length === 4
        ? ids.map((id) => <span key={id} className={styles.cell}><SpriteImage src={pokemonArtwork(id)} alt="" width={200} height={200} /></span>)
        : <span className={styles.collageEmpty}><Icon name="pokedex" size={96} /></span>}
    </span>
  );
  return (
    <Tile id={def.id} size={def.size} variant="image" title={def.title} ariaLabel={def.ariaLabel}
      to={def.to} autofocus={autofocus} media={media} subtitle={es.resources.pokemon.label} />
  );
}

// ---------------------------------------------------------------- Último logro

export function LastAchievementTile({ def, autofocus }: LiveProps) {
  const state = useStore(achievements, (s) => s);
  const last = recentUnlocks(state, 1)[0] ?? null;
  const info = last ? achievementInfo(last.id) : null;
  const progress = es.home.achProgress(unlockedCountOf(state), ACH_IDS.length, gamerscoreOf(state));
  const faces = [
    info && last ? (
      <span key="last" className={styles.achFace}>
        <span className={styles.trophy} aria-hidden="true"><Icon name="trofeo" size={36} /></span>
        <span className={styles.infoText}>
          <Caption>{es.home.lastAchievement}</Caption>
          <span className={styles.name}>{info.name}</span>
          <span className={`${styles.meta} tabular`}>{es.ach.pointsShort(info.points)} · {formatDate(last.at)}</span>
        </span>
      </span>
    ) : (
      <span key="none" className={styles.achFace}>
        <span className={styles.trophy} aria-hidden="true"><Icon name="trofeo" size={36} /></span>
        <span className={styles.infoText}>
          <Caption>{es.home.lastAchievement}</Caption>
          <span className={styles.meta}>{es.ach.none}</span>
        </span>
      </span>
    ),
    <span key="progress" className={styles.achFace}>
      <span className={styles.infoText}>
        <Caption>{es.ach.title}</Caption>
        <span className={`${styles.big} tabular`}>{progress}</span>
        <span className={styles.meter} aria-hidden="true">
          <span style={{ transform: `scaleX(${gamerscoreOf(state) / TOTAL_POINTS})` }} />
        </span>
      </span>
    </span>,
  ];
  return (
    <Tile id={def.id} size={def.size} variant="surface" title={def.title}
      ariaLabel={es.home.lastAchievementAria(info?.name ?? null)} to={def.to} autofocus={autofocus}
      live={faces} reducedFace={0} />
  );
}

// ---------------------------------------------------------------- Baya del día

export function DailyBerryTile({ def, autofocus }: LiveProps) {
  const lang = useDataLang();
  const { list, ref } = useDaily('berry');
  const berry = useRefData(ref);
  const item = useRefData(berry.data ? berry.data.item : null);
  const firmness = useLocalizedLabel(berry.data ? berry.data.firmness : null, 'fetch');

  if (list.isError || (list.isSuccess && ref === null)) return <StaticTile def={def} autofocus={autofocus} />;
  if (ref === null) {
    return <Tile id={def.id} size={def.size} variant="surface" title={def.title} icon={def.icon} ariaLabel={def.title} to={def.to} autofocus={autofocus} />;
  }
  const name = item.data ? pickName(item.data.names, lang, item.data.name).text : formatSlug(ref.name);
  const faces = [
    <span key="sprite" className={styles.berryFace}>
      <SpriteImage src={berryItemSprite(ref.name)} alt="" width={64} height={64} pixelated className={styles.berry} />
      <Caption>{es.home.dailyBerry}</Caption>
    </span>,
  ];
  if (berry.isSuccess) {
    faces.push(
      <span key="name" className={styles.berryFace}>
        <span className={styles.name}>{name}</span>
        <span className={styles.meta}>{es.home.firmness}: {firmness.text}</span>
      </span>,
      <span key="gift" className={styles.berryFace}>
        <Caption>{es.home.naturalGift}</Caption>
        <TypeBadge type={berry.data.natural_gift_type} />
      </span>,
    );
  }
  return (
    <Tile id={def.id} size={def.size} variant="surface" title={def.title} ariaLabel={es.home.dailyBerryAria(name)}
      to={`/berry/${ref.name}`} autofocus={autofocus} live={faces} />
  );
}
