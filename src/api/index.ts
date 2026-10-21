// Capa API (§4): sin React y sin DOM al importar (RF-API-7). Único camino a la red.
export { createPokeApiClient } from './client';
export type { ClientEvent, PokeApiClient, PokeApiClientOptions, RequestOpts } from './client';
export { RESOURCES, RESOURCE_KEYS } from './resources';
export type { ResourceKey } from './resources';
export type * from './types/index';
export { PokeApiError, displayCode, isChunkLoadError, isAbortError, createAbortError } from './errors';
export type { ApiErrorCode } from './errors';
export {
  BASE_URL, parseApiId, parseResourceUrl, parseEncountersUrl, parseListUrl, validateIdOrName, canonicalIdOrName,
} from './urls';
export type { IdOrName } from './urls';
export {
  formatSlug, languageChain, pickName, pickDescription, pickGenus, pickFlavor, pickEffect, cleanFlavor,
  substituteEffectChance, toBcp47,
} from './localize';
export type { Localized, LocalizedFlavor, LocalizedEffect, FlavorEntry } from './localize';
export { browserLocalStorage, memoryStorage } from './storage';
export type { KeyValueStorage } from './storage';
export type { Priority } from './limiter';
