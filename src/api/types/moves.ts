import type {
  APIResource, Description, MachineVersionDetail, Name, NamedAPIResource, VerboseEffect,
} from './common';
import type { AbilityEffectChange } from './pokemon';

export interface ContestComboDetail {
  use_before: NamedAPIResource<'move'>[] | null;
  use_after: NamedAPIResource<'move'>[] | null;
}
export interface ContestComboSets { normal: ContestComboDetail; super: ContestComboDetail }

export interface MoveFlavorText {
  flavor_text: string;
  language: NamedAPIResource<'language'>;
  version_group: NamedAPIResource<'version-group'>;
}

export interface MoveMetaData {
  ailment: NamedAPIResource<'move-ailment'>;
  category: NamedAPIResource<'move-category'>;
  min_hits: number | null;
  max_hits: number | null;
  min_turns: number | null;
  max_turns: number | null;
  drain: number;
  healing: number;
  crit_rate: number;
  ailment_chance: number;
  flinch_chance: number;
  stat_chance: number;
}

export interface MoveStatChange { change: number; stat: NamedAPIResource<'stat'> }

export interface PastMoveStatValues {
  accuracy: number | null;
  effect_chance: number | null;
  power: number | null;
  pp: number | null;
  effect_entries: VerboseEffect[];
  type: NamedAPIResource<'type'> | null;
  version_group: NamedAPIResource<'version-group'>;
}

export interface Move {
  id: number;
  name: string;
  accuracy: number | null;
  effect_chance: number | null;
  pp: number | null;
  priority: number;
  power: number | null;
  contest_combos: ContestComboSets | null;
  contest_type: NamedAPIResource<'contest-type'> | null;
  contest_effect: APIResource<'contest-effect'> | null;
  damage_class: NamedAPIResource<'move-damage-class'>;
  effect_entries: VerboseEffect[];
  effect_changes: AbilityEffectChange[];
  learned_by_pokemon: NamedAPIResource<'pokemon'>[];
  flavor_text_entries: MoveFlavorText[];
  generation: NamedAPIResource<'generation'>;
  machines: MachineVersionDetail[];
  meta: MoveMetaData | null;
  names: Name[];
  past_values: PastMoveStatValues[];
  stat_changes: MoveStatChange[];
  super_contest_effect: APIResource<'super-contest-effect'> | null;
  target: NamedAPIResource<'move-target'>;
  type: NamedAPIResource<'type'>;
}

export interface MoveAilment {
  id: number;
  name: string;
  moves: NamedAPIResource<'move'>[];
  names: Name[];
}

export interface MoveBattleStyle {
  id: number;
  name: string;
  names: Name[];
}

export interface MoveCategory {
  id: number;
  name: string;
  moves: NamedAPIResource<'move'>[];
  descriptions: Description[];
}

export interface MoveDamageClass {
  id: number;
  name: string;
  descriptions: Description[];
  moves: NamedAPIResource<'move'>[];
  names: Name[];
}

export interface MoveLearnMethod {
  id: number;
  name: string;
  descriptions: Description[];
  names: Name[];
  version_groups: NamedAPIResource<'version-group'>[];
}

export interface MoveTarget {
  id: number;
  name: string;
  descriptions: Description[];
  moves: NamedAPIResource<'move'>[];
  names: Name[];
}
