/** Lista cerrada de los 50 recursos navegables de la PokeAPI v2 (§4.1). */
export const RESOURCES = {
  'berry': { named: true }, 'berry-firmness': { named: true }, 'berry-flavor': { named: true },
  'contest-type': { named: true }, 'contest-effect': { named: false }, 'super-contest-effect': { named: false },
  'currency': { named: true },
  'encounter-method': { named: true }, 'encounter-condition': { named: true }, 'encounter-condition-value': { named: true },
  'evolution-chain': { named: false }, 'evolution-trigger': { named: true }, 'evolution-variable': { named: true },
  'generation': { named: true }, 'pokedex': { named: true }, 'version': { named: true }, 'version-group': { named: true },
  'item': { named: true }, 'item-attribute': { named: true }, 'item-category': { named: true },
  'item-fling-effect': { named: true }, 'item-pocket': { named: true },
  'location': { named: true }, 'location-area': { named: true }, 'pal-park-area': { named: true }, 'region': { named: true },
  'machine': { named: false },
  'move': { named: true }, 'move-ailment': { named: true }, 'move-battle-style': { named: true },
  'move-category': { named: true }, 'move-damage-class': { named: true }, 'move-learn-method': { named: true },
  'move-target': { named: true },
  'ability': { named: true }, 'characteristic': { named: false }, 'egg-group': { named: true }, 'gender': { named: true },
  'growth-rate': { named: true }, 'nature': { named: true }, 'pokeathlon-stat': { named: true }, 'pokemon': { named: true },
  'pokemon-color': { named: true }, 'pokemon-form': { named: true }, 'pokemon-habitat': { named: true },
  'pokemon-shape': { named: true }, 'pokemon-species': { named: true }, 'stat': { named: true }, 'type': { named: true },
  'language': { named: true },
} as const;
export type ResourceKey = keyof typeof RESOURCES;           // exactamente 50
export const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];
