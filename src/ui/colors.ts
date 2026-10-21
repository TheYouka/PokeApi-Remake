// Colores de tipo y de Pokémon (§10.1, decisión P-4). El texto encima se calcula por contraste.
import { contrastRatio } from '../state/settings';

export const TYPE_COLORS = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C',
  ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3',
  psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC',
  dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD', stellar: '#40B5A5', unknown: '#68A090',
  shadow: '#403A5F',
} as const;
export type TypeColorName = keyof typeof TYPE_COLORS;

/** Homenaje al original: gráficas y fondo de la ficha. */
export const POKEMON_COLORS = {
  black: '#000000', blue: '#0000FF', yellow: '#FFDD00', brown: '#82401D', red: '#FF0000',
  white: '#FFFFFF', gray: '#888888', green: '#00FF00', pink: '#FF57E6', purple: '#B300FF',
} as const;
export type PokemonColorName = keyof typeof POKEMON_COLORS;

/** Blanco si su contraste con `hex` es ≥ 4.5; si no, negro (que entonces supera 4.5). */
export const textOn = (hex: string): '#FFFFFF' | '#000000' => (contrastRatio('#FFFFFF', hex) >= 4.5 ? '#FFFFFF' : '#000000');

/** Color de un tipo por slug (gris neutro si es desconocido). */
export const typeColor = (slug: string): string =>
  Object.hasOwn(TYPE_COLORS, slug) ? TYPE_COLORS[slug as TypeColorName] : TYPE_COLORS.unknown;
