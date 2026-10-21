// PokemonRefGrid (§7.2): tarjetas con sprite construido (pokemonSprite(idDeLaURL)) y slug; destino con
// refHref 'grid' (las especies llevan a /pokemon/{id}). Se virtualiza a partir de 60.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { NamedAPIResource } from '../../api/types/common';
import { parseResourceUrl } from '../../api/urls';
import { useLocalizedLabel } from '../../data/hooks';
import { refHref } from '../../data/links';
import { pokemonSprite } from '../../data/sprites';
import { padDex } from '../../i18n/format';
import { SpriteImage } from '../SpriteImage';
import { VirtualGrid } from '../VirtualGrid';
import styles from './blocks.module.css';

type Ref = NamedAPIResource<'pokemon'> | NamedAPIResource<'pokemon-species'> | NamedAPIResource;

export interface PokemonRefGridProps {
  refs: readonly Ref[];
  /** Insignia opcional por tarjeta (p. ej. "Oculta" en habilidades). */
  badge?: (ref: Ref, index: number) => ReactNode;
  ariaLabel: string;
}

const VIRTUAL_THRESHOLD = 60;
const CARD_W = 140;
const CARD_H = 156;

function RefCard({ r, badge }: { r: Ref; badge?: ReactNode }) {
  const p = parseResourceUrl(r.url);
  const href = refHref(r, 'grid');
  const label = useLocalizedLabel(r, 'slug');
  // pokemonSprite vale para pokemon (cualquier ID) y especies ≤ 10000 (§5.6).
  const sprite = p && (p.resource === 'pokemon' || p.id <= 10000) ? pokemonSprite(p.id) : null;
  const body = (
    <>
      <SpriteImage src={sprite} alt="" width={96} height={96} pixelated />
      <span className={`${styles.refNum} tabular`}>{p ? padDex(p.id) : ''}</span>
      <span className={styles.refName}>{label.text}</span>
      {badge}
    </>
  );
  if (!href) return <span className={styles.refCard}>{body}</span>;
  return (
    <Link to={href} viewTransition className={styles.refCard} data-nav="" aria-label={label.text}>{body}</Link>
  );
}

export function PokemonRefGrid({ refs, badge, ariaLabel }: PokemonRefGridProps) {
  if (refs.length > VIRTUAL_THRESHOLD) {
    return (
      <VirtualGrid
        items={refs}
        minItemWidth={CARD_W}
        itemHeight={CARD_H}
        ariaLabel={ariaLabel}
        getKey={(r, i) => `${r.url}|${i}`}
        renderItem={(r, i) => <RefCard r={r} badge={badge?.(r, i)} />}
      />
    );
  }
  return (
    <ul role="list" className={styles.refGrid} aria-label={ariaLabel}>
      {refs.map((r, i) => <li key={`${r.url}|${i}`}><RefCard r={r} badge={badge?.(r, i)} /></li>)}
    </ul>
  );
}
