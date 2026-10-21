import type { Description, Name, NamedAPIResource } from './common';

export interface Generation {
  id: number;
  name: string;
  abilities: NamedAPIResource<'ability'>[];
  names: Name[];
  main_region: NamedAPIResource<'region'>;
  moves: NamedAPIResource<'move'>[];
  pokemon_species: NamedAPIResource<'pokemon-species'>[];
  types: NamedAPIResource<'type'>[];
  version_groups: NamedAPIResource<'version-group'>[];
}

export interface PokemonEntry { entry_number: number; pokemon_species: NamedAPIResource<'pokemon-species'> }
export interface Pokedex {
  id: number;
  name: string;
  is_main_series: boolean;
  descriptions: Description[];
  names: Name[];
  pokemon_entries: PokemonEntry[];
  region: NamedAPIResource<'region'> | null;
  version_groups: NamedAPIResource<'version-group'>[];
}

export interface Version {
  id: number;
  name: string;
  names: Name[];
  version_group: NamedAPIResource<'version-group'>;
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
  generation: NamedAPIResource<'generation'>;
  move_learn_methods: NamedAPIResource<'move-learn-method'>[];
  pokedexes: NamedAPIResource<'pokedex'>[];
  regions: NamedAPIResource<'region'>[];
  versions: NamedAPIResource<'version'>[];
}
