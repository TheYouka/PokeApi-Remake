import type { Effect, FlavorText, NamedAPIResource } from './common';

export interface ContestName { name: string; color: string; language: NamedAPIResource<'language'> }
export interface ContestType {
  id: number;
  name: string;
  berry_flavor: NamedAPIResource<'berry-flavor'>;
  names: ContestName[];
}

export interface ContestEffect {
  id: number;
  appeal: number;
  jam: number;
  effect_entries: Effect[];
  flavor_text_entries: FlavorText[];
}

export interface SuperContestEffect {
  id: number;
  appeal: number;
  flavor_text_entries: FlavorText[];
  moves: NamedAPIResource<'move'>[];
}
