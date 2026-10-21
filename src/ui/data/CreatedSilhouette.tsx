// Silueta original de un Pokémon creado, teñida con su color (§13.1, §13.10). Decorativa.
import { POKEMON_COLORS, type PokemonColorName } from '../colors';

export const createdColor = (color: string): string =>
  Object.hasOwn(POKEMON_COLORS, color) ? POKEMON_COLORS[color as PokemonColorName] : POKEMON_COLORS.gray;

export function CreatedSilhouette({ color, size = 96 }: { color: string; size?: number }) {
  const fill = createdColor(color);
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <ellipse cx="48" cy="86" rx="26" ry="5" fill="rgb(0 0 0 / .25)" />
      <path
        d="M30 22c-4-8-2-16 2-18 4 4 6 10 7 15a26 26 0 0 1 18 0c1-5 3-11 7-15 4 2 6 10 2 18a24 24 0 0 1 8 18c0 8-3 14-8 18l4 14c1 4-2 6-5 4l-8-8a26 26 0 0 1-16 0l-8 8c-3 2-6 0-5-4l4-14c-5-4-8-10-8-18a24 24 0 0 1 8-18z"
        fill={fill}
        stroke="rgb(0 0 0 / .45)"
        strokeWidth="2"
      />
      <circle cx="39" cy="38" r="3.5" fill="rgb(0 0 0 / .55)" />
      <circle cx="57" cy="38" r="3.5" fill="rgb(0 0 0 / .55)" />
    </svg>
  );
}
