import type {
  APIResource, Description, Effect, GenerationGameIndex, MachineVersionDetail, Name, NamedAPIResource,
  VerboseEffect, VersionGroupFlavorText,
} from './common';

export interface ItemPrice {
  purchase_price: number | null; sell_price: number | null;              // item/1: purchase_price null
  currency: NamedAPIResource<'currency'>; version_group: NamedAPIResource<'version-group'>;
}
export interface ItemSprites { default: string | null }
export interface ItemHolderPokemonVersionDetail { rarity: number; version: NamedAPIResource<'version'> }
export interface ItemHolderPokemon { pokemon: NamedAPIResource<'pokemon'>; version_details: ItemHolderPokemonVersionDetail[] }

export interface Item {
  id: number; name: string; cost?: number;                                 // ausente en vivo
  fling_power: number | null; fling_effect: NamedAPIResource<'item-fling-effect'> | null;
  prices: ItemPrice[];                                                     // puede venir vacío (item/4)
  attributes: NamedAPIResource<'item-attribute'>[];
  category: NamedAPIResource<'item-category'>;
  effect_entries: VerboseEffect[];
  flavor_text_entries: VersionGroupFlavorText[];
  game_indices: GenerationGameIndex[];
  names: Name[];
  sprites: ItemSprites;
  held_by_pokemon: ItemHolderPokemon[];
  baby_trigger_for: APIResource<'evolution-chain'> | null;
  machines: MachineVersionDetail[];
}

export interface ItemAttribute {
  id: number;
  name: string;
  items: NamedAPIResource<'item'>[];
  names: Name[];
  descriptions: Description[];
}

export interface ItemCategory {
  id: number;
  name: string;
  items: NamedAPIResource<'item'>[];
  names: Name[];
  pocket: NamedAPIResource<'item-pocket'>;
}

export interface ItemFlingEffect {
  id: number;
  name: string;
  effect_entries: Effect[];
  items: NamedAPIResource<'item'>[];
}

export interface ItemPocket {
  id: number;
  name: string;
  categories: NamedAPIResource<'item-category'>[];
  names: Name[];
}

/** `/currency/{id}`: solo trae `names` (comprobado en vivo; la API no lista objetos por moneda). */
export interface Currency {
  id: number;
  name: string;
  names: Name[];
}
