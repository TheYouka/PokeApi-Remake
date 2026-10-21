import type { Description, Name, NamedAPIResource } from './common';

export interface EvolutionChain {
  id: number;
  baby_trigger_item: NamedAPIResource<'item'> | null;
  chain: ChainLink;
}

export interface ChainLink {
  is_baby: boolean;
  species: NamedAPIResource<'pokemon-species'>;
  evolution_details: EvolutionDetail[];
  evolves_to: ChainLink[];
}

export interface EvolutionDetail {
  item: NamedAPIResource<'item'> | null;
  trigger: NamedAPIResource<'evolution-trigger'>;
  gender: number | null;
  held_item: NamedAPIResource<'item'> | null;
  known_move: NamedAPIResource<'move'> | null;
  known_move_type: NamedAPIResource<'type'> | null;
  location: NamedAPIResource<'location'> | null;
  min_level: number | null;
  min_happiness: number | null;
  min_beauty: number | null;
  min_affection: number | null;
  needs_overworld_rain: boolean;
  party_species: NamedAPIResource<'pokemon-species'> | null;
  party_type: NamedAPIResource<'type'> | null;
  relative_physical_stats: number | null;
  /** "" cuando no aplica. */
  time_of_day: string;
  trade_species: NamedAPIResource<'pokemon-species'> | null;
  turn_upside_down: boolean;
  // Campos que trae la API en vivo y la documentación aún no lista (opcionales).
  region?: NamedAPIResource<'region'> | null;
  required_pokemon_form?: NamedAPIResource<'pokemon-form'> | null;
  evolved_pokemon_form?: NamedAPIResource<'pokemon-form'> | null;
  used_move?: NamedAPIResource<'move'> | null;
  min_move_count?: number | null;
  min_steps?: number | null;
  min_damage_taken?: number | null;
  allowed_natures?: NamedAPIResource<'nature'>[] | null;
  condition_expression?: string | null;
  near_special_rock?: boolean;
  needs_multiplayer?: boolean;
  version_group?: NamedAPIResource<'version-group'> | null;
  is_default?: boolean;
}

export interface EvolutionTrigger {
  id: number;
  name: string;
  names: Name[];
  pokemon_species: NamedAPIResource<'pokemon-species'>[];
}

/** `/evolution-variable/{id}`: recurso reciente, no documentado (comprobado en vivo). */
export interface EvolutionVariable {
  id: number;
  name: string;
  symbol: string | null;
  data_type: string | null;
  source: string | null;
  version_group: NamedAPIResource<'version-group'> | null;
  names: Name[];
  descriptions: Description[];
}
