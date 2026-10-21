// Constructores de URL de sprites (§5.6). Puro. Solo donde el patrón está comprobado.
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';

/** Vale para `pokemon` (cualquier ID) y para especies y formas con ID ≤ 10000. */
export const pokemonSprite = (id: number): string => `${SPRITES}/pokemon/${id}.png`;
export const pokemonArtwork = (id: number, shiny = false): string =>
  `${SPRITES}/pokemon/other/official-artwork/${shiny ? 'shiny/' : ''}${id}.png`;
export const itemSprite = (itemName: string): string => `${SPRITES}/items/${itemName}.png`;
export const berryItemSprite = (berryName: string): string => itemSprite(`${berryName}-berry`);
/** Tipos 1–19 (stellar incluido); unknown y shadow no tienen icono. */
export const typeIcon = (id: number): string | null =>
  id >= 1 && id <= 19 ? `${SPRITES}/types/generation-ix/scarlet-violet/${id}.png` : null;
