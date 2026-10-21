import type { GenerationGameIndex, Name, NamedAPIResource, VersionEncounterDetail } from './common';

export interface Location {
  id: number;
  name: string;
  region: NamedAPIResource<'region'> | null;
  names: Name[];
  game_indices: GenerationGameIndex[];
  areas: NamedAPIResource<'location-area'>[];
}

export interface EncounterVersionDetails { rate: number; version: NamedAPIResource<'version'> }
export interface EncounterMethodRate {
  encounter_method: NamedAPIResource<'encounter-method'>;
  version_details: EncounterVersionDetails[];
}
export interface PokemonEncounter {
  pokemon: NamedAPIResource<'pokemon'>;
  version_details: VersionEncounterDetail[];
}
export interface LocationArea {
  id: number;
  name: string;
  game_index: number;
  encounter_method_rates: EncounterMethodRate[];
  location: NamedAPIResource<'location'>;
  names: Name[];
  pokemon_encounters: PokemonEncounter[];
}

export interface PalParkEncounterSpecies {
  base_score: number;
  rate: number;
  pokemon_species: NamedAPIResource<'pokemon-species'>;
}
export interface PalParkArea {
  id: number;
  name: string;
  names: Name[];
  pokemon_encounters: PalParkEncounterSpecies[];
}

export interface Region {
  id: number;
  name: string;
  locations: NamedAPIResource<'location'>[];
  main_generation: NamedAPIResource<'generation'> | null;
  names: Name[];
  pokedexes: NamedAPIResource<'pokedex'>[];
  version_groups: NamedAPIResource<'version-group'>[];
}
