import type {
  APIResource, Description, Effect, FlavorText, GenerationGameIndex, Name, NamedAPIResource, VerboseEffect,
  VersionEncounterDetail, VersionGameIndex,
} from './common';

/** Árbol genérico de sprites (`sprites.versions`, `sprites.other.home`, …): hojas URL o null. */
export interface SpriteTree { [key: string]: string | null | SpriteTree }

// ---------------------------------------------------------------- ability
export interface AbilityEffectChange {
  effect_entries: Effect[];
  version_group: NamedAPIResource<'version-group'>;
}
export interface AbilityFlavorText {
  flavor_text: string;
  language: NamedAPIResource<'language'>;
  version_group: NamedAPIResource<'version-group'>;
}
export interface AbilityPokemon { is_hidden: boolean; slot: number; pokemon: NamedAPIResource<'pokemon'> }
export interface Ability {
  id: number;
  name: string;
  is_main_series: boolean;
  generation: NamedAPIResource<'generation'>;
  names: Name[];
  effect_entries: VerboseEffect[];
  effect_changes: AbilityEffectChange[];
  flavor_text_entries: AbilityFlavorText[];
  pokemon: AbilityPokemon[];
}

// ---------------------------------------------------------------- characteristic
export interface Characteristic {
  id: number;
  gene_modulo: number;
  possible_values: number[];
  highest_stat: NamedAPIResource<'stat'>;
  descriptions: Description[];
}

// ---------------------------------------------------------------- egg-group, gender, growth-rate
export interface EggGroup {
  id: number;
  name: string;
  names: Name[];
  pokemon_species: NamedAPIResource<'pokemon-species'>[];
}

export interface PokemonSpeciesGender { rate: number; pokemon_species: NamedAPIResource<'pokemon-species'> }
export interface Gender {
  id: number;
  name: string;
  pokemon_species_details: PokemonSpeciesGender[];
  required_for_evolution: NamedAPIResource<'pokemon-species'>[];
}

export interface GrowthRateExperienceLevel { level: number; experience: number }
export interface GrowthRate {
  id: number;
  name: string;
  formula: string;
  descriptions: Description[];
  levels: GrowthRateExperienceLevel[];
  pokemon_species: NamedAPIResource<'pokemon-species'>[];
}

// ---------------------------------------------------------------- nature, pokeathlon-stat
export interface NatureStatChange { max_change: number; pokeathlon_stat: NamedAPIResource<'pokeathlon-stat'> }
export interface MoveBattleStylePreference {
  low_hp_preference: number;
  high_hp_preference: number;
  move_battle_style: NamedAPIResource<'move-battle-style'>;
}
export interface Nature {
  id: number;
  name: string;
  decreased_stat: NamedAPIResource<'stat'> | null;
  increased_stat: NamedAPIResource<'stat'> | null;
  hates_flavor: NamedAPIResource<'berry-flavor'> | null;
  likes_flavor: NamedAPIResource<'berry-flavor'> | null;
  pokeathlon_stat_changes: NatureStatChange[];
  move_battle_style_preferences: MoveBattleStylePreference[];
  names: Name[];
}

export interface NaturePokeathlonStatAffect { max_change: number; nature: NamedAPIResource<'nature'> }
export interface PokeathlonStat {
  id: number;
  name: string;
  names: Name[];
  affecting_natures: { increase: NaturePokeathlonStatAffect[]; decrease: NaturePokeathlonStatAffect[] };
}

// ---------------------------------------------------------------- pokemon
export interface PokemonAbility { is_hidden: boolean; slot: number; ability: NamedAPIResource<'ability'> }
export interface PokemonPastAbility {
  generation: NamedAPIResource<'generation'>;
  abilities: { is_hidden: boolean; slot: number; ability: NamedAPIResource<'ability'> | null }[];
}
export interface PokemonType { slot: number; type: NamedAPIResource<'type'> }
export interface PokemonPastType { generation: NamedAPIResource<'generation'>; types: PokemonType[] }
export interface PokemonHeldItemVersion { rarity: number; version: NamedAPIResource<'version'> }
export interface PokemonHeldItem { item: NamedAPIResource<'item'>; version_details: PokemonHeldItemVersion[] }
export interface PokemonMoveVersion {
  move_learn_method: NamedAPIResource<'move-learn-method'>;
  version_group: NamedAPIResource<'version-group'>;
  level_learned_at: number;
  order?: number | null;
}
export interface PokemonMove { move: NamedAPIResource<'move'>; version_group_details: PokemonMoveVersion[] }
export interface PokemonStat { base_stat: number; effort: number; stat: NamedAPIResource<'stat'> }
export interface PokemonPastStat { generation: NamedAPIResource<'generation'>; stats: PokemonStat[] }

export interface OfficialArtworkSprites { front_default: string | null; front_shiny: string | null }
export interface PokemonSprites {
  front_default: string | null;
  front_shiny: string | null;
  front_female: string | null;
  front_shiny_female: string | null;
  back_default: string | null;
  back_shiny: string | null;
  back_female: string | null;
  back_shiny_female: string | null;
  other?: {
    'official-artwork'?: OfficialArtworkSprites;
    home?: SpriteTree;
    dream_world?: SpriteTree;
    showdown?: SpriteTree;
  };
  versions?: SpriteTree;
}
export interface PokemonCries { latest: string | null; legacy: string | null }

export interface Pokemon {
  id: number;
  name: string;
  base_experience: number | null;
  height: number;
  is_default: boolean;
  order: number;
  weight: number;
  abilities: PokemonAbility[];
  past_abilities?: PokemonPastAbility[];
  forms: NamedAPIResource<'pokemon-form'>[];
  game_indices: VersionGameIndex[];
  held_items: PokemonHeldItem[];
  /** URL de `/pokemon/{id}/encounters` (no es un recurso de RESOURCES). */
  location_area_encounters: string;
  moves: PokemonMove[];
  past_types?: PokemonPastType[];
  past_stats?: PokemonPastStat[];
  sprites: PokemonSprites;
  cries: PokemonCries;
  species: NamedAPIResource<'pokemon-species'>;
  stats: PokemonStat[];
  types: PokemonType[];
}

/** Elemento de `/pokemon/{id}/encounters`. */
export interface LocationAreaEncounter {
  location_area: NamedAPIResource<'location-area'>;
  version_details: VersionEncounterDetail[];
}

// ---------------------------------------------------------------- color, form, habitat, shape
export interface PokemonColor {
  id: number;
  name: string;
  names: Name[];
  pokemon_species: NamedAPIResource<'pokemon-species'>[];
}

export interface PokemonFormSprites {
  front_default: string | null;
  front_shiny: string | null;
  front_female?: string | null;
  front_shiny_female?: string | null;
  back_default: string | null;
  back_shiny: string | null;
  back_female?: string | null;
  back_shiny_female?: string | null;
  other?: SpriteTree;
  versions?: SpriteTree;
}
export interface PokemonForm {
  id: number;
  name: string;
  order: number;
  form_order: number;
  is_default: boolean;
  is_battle_only: boolean;
  is_mega: boolean;
  form_name: string;
  pokemon: NamedAPIResource<'pokemon'>;
  types: PokemonType[];
  sprites: PokemonFormSprites;
  version_group: NamedAPIResource<'version-group'>;
  names: Name[];
  form_names: Name[];
}

export interface PokemonHabitat {
  id: number;
  name: string;
  names: Name[];
  pokemon_species: NamedAPIResource<'pokemon-species'>[];
}

export interface AwesomeName { awesome_name: string; language: NamedAPIResource<'language'> }
export interface PokemonShape {
  id: number;
  name: string;
  awesome_names: AwesomeName[];
  names: Name[];
  pokemon_species: NamedAPIResource<'pokemon-species'>[];
}

// ---------------------------------------------------------------- pokemon-species
export interface Genus { genus: string; language: NamedAPIResource<'language'> }
export interface PokemonSpeciesDexEntry { entry_number: number; pokedex: NamedAPIResource<'pokedex'> }
export interface PalParkEncounterArea { base_score: number; rate: number; area: NamedAPIResource<'pal-park-area'> }
export interface PokemonSpeciesVariety { is_default: boolean; pokemon: NamedAPIResource<'pokemon'> }
export interface PokemonSpecies {
  id: number;
  name: string;
  order: number;
  /** Probabilidad de hembra en octavos; -1 = sin género. */
  gender_rate: number;
  capture_rate: number;
  base_happiness: number | null;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  hatch_counter: number | null;
  has_gender_differences: boolean;
  forms_switchable: boolean;
  growth_rate: NamedAPIResource<'growth-rate'>;
  pokedex_numbers: PokemonSpeciesDexEntry[];
  egg_groups: NamedAPIResource<'egg-group'>[];
  color: NamedAPIResource<'pokemon-color'>;
  shape: NamedAPIResource<'pokemon-shape'> | null;
  evolves_from_species: NamedAPIResource<'pokemon-species'> | null;
  evolution_chain: APIResource<'evolution-chain'>;
  habitat: NamedAPIResource<'pokemon-habitat'> | null;
  generation: NamedAPIResource<'generation'>;
  names: Name[];
  pal_park_encounters: PalParkEncounterArea[];
  flavor_text_entries: FlavorText[];
  form_descriptions: Description[];
  genera: Genus[];
  varieties: PokemonSpeciesVariety[];
}

// ---------------------------------------------------------------- stat
export interface MoveStatAffect { change: number; move: NamedAPIResource<'move'> }
export interface Stat {
  id: number;
  name: string;
  game_index: number;
  is_battle_only: boolean;
  affecting_moves: { increase: MoveStatAffect[]; decrease: MoveStatAffect[] };
  affecting_natures: { increase: NamedAPIResource<'nature'>[]; decrease: NamedAPIResource<'nature'>[] };
  /** Campo reciente de la API en vivo. */
  affecting_items?: NamedAPIResource<'item'>[];
  characteristics: APIResource<'characteristic'>[];
  move_damage_class: NamedAPIResource<'move-damage-class'> | null;
  names: Name[];
}

// ---------------------------------------------------------------- type
export interface TypeRelations {
  no_damage_to: NamedAPIResource<'type'>[];
  half_damage_to: NamedAPIResource<'type'>[];
  double_damage_to: NamedAPIResource<'type'>[];
  no_damage_from: NamedAPIResource<'type'>[];
  half_damage_from: NamedAPIResource<'type'>[];
  double_damage_from: NamedAPIResource<'type'>[];
}
export interface TypeRelationsPast {
  generation: NamedAPIResource<'generation'>;
  damage_relations: TypeRelations;
}
export interface TypePokemon { slot: number; pokemon: NamedAPIResource<'pokemon'> }
export interface TypeSprite { name_icon: string | null; symbol_icon?: string | null }
/** `type.sprites['generation-ix']['scarlet-violet'].name_icon`. */
export type TypeSprites = Record<string, Record<string, TypeSprite>>;
export interface Type {
  id: number;
  name: string;
  damage_relations: TypeRelations;
  past_damage_relations: TypeRelationsPast[];
  game_indices: GenerationGameIndex[];
  generation: NamedAPIResource<'generation'>;
  move_damage_class: NamedAPIResource<'move-damage-class'> | null;
  names: Name[];
  pokemon: TypePokemon[];
  moves: NamedAPIResource<'move'>[];
  sprites: TypeSprites;
}
