import type { ResourceKey } from '../resources';

/** Referencia con nombre. `__kind` es un parámetro fantasma: nunca existe en runtime. */
export interface NamedAPIResource<K extends ResourceKey = ResourceKey> {
  name: string; url: string; readonly __kind?: K;   // __kind nunca existe en runtime
}
export interface APIResource<K extends ResourceKey = ResourceKey> { url: string; readonly __kind?: K }
export interface NamedAPIResourceList<K extends ResourceKey> {
  count: number; next: string | null; previous: string | null; results: NamedAPIResource<K>[];
}
export interface APIResourceList<K extends ResourceKey> {
  count: number; next: string | null; previous: string | null; results: APIResource<K>[];
}
export interface Name { name: string; language: NamedAPIResource<'language'> }
export interface Description { description: string; language: NamedAPIResource<'language'> }
export interface Effect { effect: string; language: NamedAPIResource<'language'> }
export interface VerboseEffect extends Effect { short_effect: string }
export interface FlavorText { flavor_text: string; language: NamedAPIResource<'language'>; version?: NamedAPIResource<'version'> }

export interface GenerationGameIndex { game_index: number; generation: NamedAPIResource<'generation'> }
export interface VersionGameIndex { game_index: number; version: NamedAPIResource<'version'> }
export interface VersionGroupFlavorText {
  text: string; language: NamedAPIResource<'language'>; version_group: NamedAPIResource<'version-group'>;
}
export interface MachineVersionDetail { machine: APIResource<'machine'>; version_group: NamedAPIResource<'version-group'> }

export interface Encounter {
  min_level: number;
  max_level: number;
  condition_values: NamedAPIResource<'encounter-condition-value'>[];
  chance: number;
  method: NamedAPIResource<'encounter-method'>;
  /** Campo reciente de la API en vivo (siempre null en las muestras); forma no documentada. */
  pokemon_details?: unknown;
}
export interface VersionEncounterDetail {
  version: NamedAPIResource<'version'>;
  max_chance: number;
  encounter_details: Encounter[];
}

/** Respuesta de `/api/v2/meta`. */
export interface ApiMeta { deploy_date: string; hash: string; tag: string | null }
