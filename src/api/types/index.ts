import type { RESOURCES, ResourceKey } from '../resources';
import type { APIResourceList, NamedAPIResourceList } from './common';
import type { Berry, BerryFirmness, BerryFlavor } from './berries';
import type { ContestEffect, ContestType, SuperContestEffect } from './contests';
import type { EncounterCondition, EncounterConditionValue, EncounterMethod } from './encounters';
import type { EvolutionChain, EvolutionTrigger, EvolutionVariable } from './evolution';
import type { Generation, Pokedex, Version, VersionGroup } from './games';
import type { Currency, Item, ItemAttribute, ItemCategory, ItemFlingEffect, ItemPocket } from './items';
import type { Location, LocationArea, PalParkArea, Region } from './locations';
import type { Machine } from './machines';
import type {
  Move, MoveAilment, MoveBattleStyle, MoveCategory, MoveDamageClass, MoveLearnMethod, MoveTarget,
} from './moves';
import type {
  Ability, Characteristic, EggGroup, Gender, GrowthRate, Nature, PokeathlonStat, Pokemon, PokemonColor,
  PokemonForm, PokemonHabitat, PokemonShape, PokemonSpecies, Stat, Type,
} from './pokemon';
import type { Language } from './utility';

export type * from './common';
export type * from './berries';
export type * from './contests';
export type * from './encounters';
export type * from './evolution';
export type * from './games';
export type * from './items';
export type * from './locations';
export type * from './machines';
export type * from './moves';
export type * from './pokemon';
export type * from './utility';

/** Recurso → tipo de su detalle. Debe cubrir las 50 claves de RESOURCES (comprobado abajo). */
export interface ResourceMap {
  'berry': Berry;
  'berry-firmness': BerryFirmness;
  'berry-flavor': BerryFlavor;
  'contest-type': ContestType;
  'contest-effect': ContestEffect;
  'super-contest-effect': SuperContestEffect;
  'currency': Currency;
  'encounter-method': EncounterMethod;
  'encounter-condition': EncounterCondition;
  'encounter-condition-value': EncounterConditionValue;
  'evolution-chain': EvolutionChain;
  'evolution-trigger': EvolutionTrigger;
  'evolution-variable': EvolutionVariable;
  'generation': Generation;
  'pokedex': Pokedex;
  'version': Version;
  'version-group': VersionGroup;
  'item': Item;
  'item-attribute': ItemAttribute;
  'item-category': ItemCategory;
  'item-fling-effect': ItemFlingEffect;
  'item-pocket': ItemPocket;
  'location': Location;
  'location-area': LocationArea;
  'pal-park-area': PalParkArea;
  'region': Region;
  'machine': Machine;
  'move': Move;
  'move-ailment': MoveAilment;
  'move-battle-style': MoveBattleStyle;
  'move-category': MoveCategory;
  'move-damage-class': MoveDamageClass;
  'move-learn-method': MoveLearnMethod;
  'move-target': MoveTarget;
  'ability': Ability;
  'characteristic': Characteristic;
  'egg-group': EggGroup;
  'gender': Gender;
  'growth-rate': GrowthRate;
  'nature': Nature;
  'pokeathlon-stat': PokeathlonStat;
  'pokemon': Pokemon;
  'pokemon-color': PokemonColor;
  'pokemon-form': PokemonForm;
  'pokemon-habitat': PokemonHabitat;
  'pokemon-shape': PokemonShape;
  'pokemon-species': PokemonSpecies;
  'stat': Stat;
  'type': Type;
  'language': Language;
}

// Prueba de tipos: falla en compilación si falta alguna clave o sobra alguna.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _resourceMapIsComplete = {} as { [K in keyof ResourceMap]: unknown } satisfies Record<ResourceKey, unknown>;
const _resourceMapHasNoExtras: Exact<keyof ResourceMap, ResourceKey> = true;
void _resourceMapIsComplete;
void _resourceMapHasNoExtras;

/** Lista de un recurso; distributiva: con `K = ResourceKey` da la unión de las 50 listas. */
export type ListMap<K extends ResourceKey> = K extends unknown
  ? ((typeof RESOURCES)[K]['named'] extends true ? NamedAPIResourceList<K> : APIResourceList<K>)
  : never;

/** Raíz `/api/v2/`: clave de recurso → URL de su lista. */
export type ApiIndex = Record<string, string>;
