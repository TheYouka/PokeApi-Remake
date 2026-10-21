import type { Name, NamedAPIResource } from './common';

export interface EncounterMethod {
  id: number;
  name: string;
  order: number;
  names: Name[];
}

export interface EncounterCondition {
  id: number;
  name: string;
  names: Name[];
  values: NamedAPIResource<'encounter-condition-value'>[];
}

export interface EncounterConditionValue {
  id: number;
  name: string;
  condition: NamedAPIResource<'encounter-condition'>;
  names: Name[];
}
