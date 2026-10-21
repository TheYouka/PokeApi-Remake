// Registro declarativo de los 50 recursos (§7.1, §7.3). `detail` (decisión P-3): un chunk lazy por grupo de
// endpoints con un export con nombre por recurso; `pokemon` no lleva (su detalle es PokemonScreen).
// Solo `import type` de React: se importa desde Node en los tests.
import type { ComponentType } from 'react';
import { pickDescription, pickFlavor, formatSlug } from '../api/localize';
import type { ResourceKey } from '../api/resources';
import type { ChainLink, NamedAPIResource, ResourceMap } from '../api/types/index';
import { berryItemSprite, itemSprite, pokemonSprite, typeIcon } from '../data/sprites';
import { es } from '../i18n/es';
import type { IconName } from '../ui/icons';
import type { EndpointGroup, HubPivotId } from './groups';

export type { EndpointGroup, PivotId } from './groups';

export type LabelMode = 'fetch' | 'slug' | 'summary' | 'versions';

export interface ResourceUi<K extends ResourceKey> {
  key: K;
  group: EndpointGroup;
  pivot: HubPivotId;
  label: string;            // plural en español (título de lista/tile)
  singular: string;         // título genérico del detalle
  icon: IconName;
  labelMode: LabelMode;
  // Sprite construido para filas/tiles. null = marcador (silueta) sin ninguna petición.
  thumb?: (id: number, name: string | null) => string | null;
  summary?: (d: ResourceMap[K], ctx: SummaryCtx) => string; // filas de recursos sin nombre (síncrona, sin peticiones)
  // Renderer de detalle. Opcional SOLO para 'pokemon', cuyo detalle es PokemonScreen (§13.2); lo exige registry.test.
  detail?: () => Promise<{ default: ComponentType<{ data: ResourceMap[K] }> }>;
}
export interface SummaryCtx {
  lang: string;
  // Nombre localizado si el recurso referido YA está en la caché de React Query (getQueryData);
  // si no, formatSlug(ref.name). Nunca dispara peticiones.
  label(ref: NamedAPIResource): string;
}

const t = (k: ResourceKey) => es.resources[k];
const sep = es.summary.separator;

const countSpecies = (link: ChainLink): number => 1 + link.evolves_to.reduce((s, l) => s + countSpecies(l), 0);
const MACHINE_RE = /^(tm|hm|tr)(\d+)$/;
function machineLabel(itemName: string): string {
  const m = MACHINE_RE.exec(itemName);
  if (!m) return formatSlug(itemName);
  return es.summary.machinePrefix[m[1] as 'tm' | 'hm' | 'tr'] + m[2]!;
}
const short = (s: string, max = 60) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export const REGISTRY = {
  // ---------------------------------------------------------------- Bayas
  'berry': { key: 'berry', group: 'bayas', pivot: 'bayas', ...t('berry'), icon: 'bayas', labelMode: 'fetch',
    thumb: (_id, name) => (name ? berryItemSprite(name) : null),
    detail: () => import('../screens/resource/details/berries').then((m) => ({ default: m.BerryDetail })) },
  'berry-firmness': { key: 'berry-firmness', group: 'bayas', pivot: 'bayas', ...t('berry-firmness'), icon: 'bayas', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/berries').then((m) => ({ default: m.BerryFirmnessDetail })) },
  'berry-flavor': { key: 'berry-flavor', group: 'bayas', pivot: 'bayas', ...t('berry-flavor'), icon: 'bayas', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/berries').then((m) => ({ default: m.BerryFlavorDetail })) },
  // ---------------------------------------------------------------- Concursos
  'contest-type': { key: 'contest-type', group: 'concursos', pivot: 'juegos', ...t('contest-type'), icon: 'concurso', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/contests').then((m) => ({ default: m.ContestTypeDetail })) },
  'contest-effect': { key: 'contest-effect', group: 'concursos', pivot: 'juegos', ...t('contest-effect'), icon: 'concurso', labelMode: 'summary',
    summary: (d) => es.summary.appeal(d.appeal) + sep + es.summary.jam(d.jam),
    detail: () => import('../screens/resource/details/contests').then((m) => ({ default: m.ContestEffectDetail })) },
  'super-contest-effect': { key: 'super-contest-effect', group: 'concursos', pivot: 'juegos', ...t('super-contest-effect'), icon: 'concurso',
    labelMode: 'summary',
    summary: (d, ctx) => {
      const flavor = pickFlavor(d.flavor_text_entries, ctx.lang);
      return es.summary.appeal(d.appeal) + (flavor ? sep + short(flavor.text) : '');
    },
    detail: () => import('../screens/resource/details/contests').then((m) => ({ default: m.SuperContestEffectDetail })) },
  // ---------------------------------------------------------------- Monedas
  'currency': { key: 'currency', group: 'monedas', pivot: 'objetos', ...t('currency'), icon: 'moneda', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/currency').then((m) => ({ default: m.CurrencyDetail })) },
  // ---------------------------------------------------------------- Encuentros
  'encounter-method': { key: 'encounter-method', group: 'encuentros', pivot: 'mundo', ...t('encounter-method'), icon: 'encuentro', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/encounters').then((m) => ({ default: m.EncounterMethodDetail })) },
  'encounter-condition': { key: 'encounter-condition', group: 'encuentros', pivot: 'mundo', ...t('encounter-condition'), icon: 'encuentro', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/encounters').then((m) => ({ default: m.EncounterConditionDetail })) },
  'encounter-condition-value': { key: 'encounter-condition-value', group: 'encuentros', pivot: 'mundo', ...t('encounter-condition-value'),
    icon: 'encuentro', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/encounters').then((m) => ({ default: m.EncounterConditionValueDetail })) },
  // ---------------------------------------------------------------- Evolución
  'evolution-chain': { key: 'evolution-chain', group: 'evolucion', pivot: 'pokedex', ...t('evolution-chain'), icon: 'evolucion', labelMode: 'summary',
    summary: (d, ctx) => ctx.label(d.chain.species) + sep + es.summary.species(countSpecies(d.chain)),
    detail: () => import('../screens/resource/details/evolution').then((m) => ({ default: m.EvolutionChainDetail })) },
  'evolution-trigger': { key: 'evolution-trigger', group: 'evolucion', pivot: 'pokedex', ...t('evolution-trigger'), icon: 'evolucion', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/evolution').then((m) => ({ default: m.EvolutionTriggerDetail })) },
  'evolution-variable': { key: 'evolution-variable', group: 'evolucion', pivot: 'pokedex', ...t('evolution-variable'), icon: 'evolucion', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/evolution').then((m) => ({ default: m.EvolutionVariableDetail })) },
  // ---------------------------------------------------------------- Juegos
  'generation': { key: 'generation', group: 'juegos', pivot: 'juegos', ...t('generation'), icon: 'juegos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/games').then((m) => ({ default: m.GenerationDetail })) },
  'pokedex': { key: 'pokedex', group: 'juegos', pivot: 'juegos', ...t('pokedex'), icon: 'pokedex', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/games').then((m) => ({ default: m.PokedexDetail })) },
  'version': { key: 'version', group: 'juegos', pivot: 'juegos', ...t('version'), icon: 'juegos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/games').then((m) => ({ default: m.VersionDetail })) },
  'version-group': { key: 'version-group', group: 'juegos', pivot: 'juegos', ...t('version-group'), icon: 'juegos', labelMode: 'versions',
    detail: () => import('../screens/resource/details/games').then((m) => ({ default: m.VersionGroupDetail })) },
  // ---------------------------------------------------------------- Objetos
  'item': { key: 'item', group: 'objetos', pivot: 'objetos', ...t('item'), icon: 'objetos', labelMode: 'fetch',
    thumb: (_id, name) => (name ? itemSprite(name) : null),
    detail: () => import('../screens/resource/details/items').then((m) => ({ default: m.ItemDetail })) },
  'item-attribute': { key: 'item-attribute', group: 'objetos', pivot: 'objetos', ...t('item-attribute'), icon: 'objetos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/items').then((m) => ({ default: m.ItemAttributeDetail })) },
  'item-category': { key: 'item-category', group: 'objetos', pivot: 'objetos', ...t('item-category'), icon: 'objetos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/items').then((m) => ({ default: m.ItemCategoryDetail })) },
  'item-fling-effect': { key: 'item-fling-effect', group: 'objetos', pivot: 'objetos', ...t('item-fling-effect'), icon: 'objetos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/items').then((m) => ({ default: m.ItemFlingEffectDetail })) },
  'item-pocket': { key: 'item-pocket', group: 'objetos', pivot: 'objetos', ...t('item-pocket'), icon: 'objetos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/items').then((m) => ({ default: m.ItemPocketDetail })) },
  // ---------------------------------------------------------------- Lugares
  'location': { key: 'location', group: 'lugares', pivot: 'mundo', ...t('location'), icon: 'lugar', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/locations').then((m) => ({ default: m.LocationDetail })) },
  'location-area': { key: 'location-area', group: 'lugares', pivot: 'mundo', ...t('location-area'), icon: 'lugar', labelMode: 'slug',
    detail: () => import('../screens/resource/details/locations').then((m) => ({ default: m.LocationAreaDetail })) },
  'pal-park-area': { key: 'pal-park-area', group: 'lugares', pivot: 'mundo', ...t('pal-park-area'), icon: 'lugar', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/locations').then((m) => ({ default: m.PalParkAreaDetail })) },
  'region': { key: 'region', group: 'lugares', pivot: 'mundo', ...t('region'), icon: 'mundo', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/locations').then((m) => ({ default: m.RegionDetail })) },
  // ---------------------------------------------------------------- Máquinas
  'machine': { key: 'machine', group: 'maquinas', pivot: 'movimientos', ...t('machine'), icon: 'maquina', labelMode: 'summary',
    summary: (d, ctx) => machineLabel(d.item.name) + sep + ctx.label(d.move) + sep + ctx.label(d.version_group),
    detail: () => import('../screens/resource/details/machines').then((m) => ({ default: m.MachineDetail })) },
  // ---------------------------------------------------------------- Movimientos
  'move': { key: 'move', group: 'movimientos', pivot: 'movimientos', ...t('move'), icon: 'movimientos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/moves').then((m) => ({ default: m.MoveDetail })) },
  'move-ailment': { key: 'move-ailment', group: 'movimientos', pivot: 'movimientos', ...t('move-ailment'), icon: 'movimientos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/moves').then((m) => ({ default: m.MoveAilmentDetail })) },
  'move-battle-style': { key: 'move-battle-style', group: 'movimientos', pivot: 'movimientos', ...t('move-battle-style'), icon: 'movimientos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/moves').then((m) => ({ default: m.MoveBattleStyleDetail })) },
  'move-category': { key: 'move-category', group: 'movimientos', pivot: 'movimientos', ...t('move-category'), icon: 'movimientos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/moves').then((m) => ({ default: m.MoveCategoryDetail })) },
  'move-damage-class': { key: 'move-damage-class', group: 'movimientos', pivot: 'movimientos', ...t('move-damage-class'), icon: 'movimientos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/moves').then((m) => ({ default: m.MoveDamageClassDetail })) },
  'move-learn-method': { key: 'move-learn-method', group: 'movimientos', pivot: 'movimientos', ...t('move-learn-method'), icon: 'movimientos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/moves').then((m) => ({ default: m.MoveLearnMethodDetail })) },
  'move-target': { key: 'move-target', group: 'movimientos', pivot: 'movimientos', ...t('move-target'), icon: 'movimientos', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/moves').then((m) => ({ default: m.MoveTargetDetail })) },
  // ---------------------------------------------------------------- Pokémon
  'ability': { key: 'ability', group: 'pokemon', pivot: 'pokedex', ...t('ability'), icon: 'estrella', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.AbilityDetail })) },
  'characteristic': { key: 'characteristic', group: 'pokemon', pivot: 'pokedex', ...t('characteristic'), icon: 'recurso', labelMode: 'summary',
    summary: (d, ctx) => pickDescription(d.descriptions, ctx.lang)?.text ?? es.summary.characteristic(d.id),
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.CharacteristicDetail })) },
  'egg-group': { key: 'egg-group', group: 'pokemon', pivot: 'pokedex', ...t('egg-group'), icon: 'huevo', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.EggGroupDetail })) },
  'gender': { key: 'gender', group: 'pokemon', pivot: 'pokedex', ...t('gender'), icon: 'genero', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.GenderDetail })) },
  'growth-rate': { key: 'growth-rate', group: 'pokemon', pivot: 'pokedex', ...t('growth-rate'), icon: 'grafica', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.GrowthRateDetail })) },
  'nature': { key: 'nature', group: 'pokemon', pivot: 'pokedex', ...t('nature'), icon: 'naturaleza', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.NatureDetail })) },
  'pokeathlon-stat': { key: 'pokeathlon-stat', group: 'pokemon', pivot: 'pokedex', ...t('pokeathlon-stat'), icon: 'estadistica', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.PokeathlonStatDetail })) },
  'pokemon': { key: 'pokemon', group: 'pokemon', pivot: 'pokedex', ...t('pokemon'), icon: 'pokemon', labelMode: 'slug',
    thumb: (id, _name) => pokemonSprite(id) },
  'pokemon-color': { key: 'pokemon-color', group: 'pokemon', pivot: 'pokedex', ...t('pokemon-color'), icon: 'color', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.PokemonColorDetail })) },
  'pokemon-form': { key: 'pokemon-form', group: 'pokemon', pivot: 'pokedex', ...t('pokemon-form'), icon: 'pokemon', labelMode: 'slug',
    thumb: (id, _name) => (id <= 10000 ? pokemonSprite(id) : null),
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.PokemonFormDetail })) },
  'pokemon-habitat': { key: 'pokemon-habitat', group: 'pokemon', pivot: 'pokedex', ...t('pokemon-habitat'), icon: 'habitat', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.PokemonHabitatDetail })) },
  'pokemon-shape': { key: 'pokemon-shape', group: 'pokemon', pivot: 'pokedex', ...t('pokemon-shape'), icon: 'forma', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.PokemonShapeDetail })) },
  'pokemon-species': { key: 'pokemon-species', group: 'pokemon', pivot: 'pokedex', ...t('pokemon-species'), icon: 'pokedex', labelMode: 'slug',
    thumb: (id, _name) => pokemonSprite(id),
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.PokemonSpeciesDetail })) },
  'stat': { key: 'stat', group: 'pokemon', pivot: 'pokedex', ...t('stat'), icon: 'estadistica', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.StatDetail })) },
  'type': { key: 'type', group: 'pokemon', pivot: 'pokedex', ...t('type'), icon: 'tipo', labelMode: 'fetch',
    thumb: (id, _name) => typeIcon(id),
    detail: () => import('../screens/resource/details/pokemonMisc').then((m) => ({ default: m.TypeDetail })) },
  // ---------------------------------------------------------------- Utilidad
  'language': { key: 'language', group: 'utilidad', pivot: 'juegos', ...t('language'), icon: 'idioma', labelMode: 'fetch',
    detail: () => import('../screens/resource/details/utility').then((m) => ({ default: m.LanguageDetail })) },
} satisfies { [K in ResourceKey]: ResourceUi<K> };

export type Registry = { [K in ResourceKey]: ResourceUi<K> };
/** Vista con el tipo mapeado completo (todas las propiedades opcionales visibles). */
export const RESOURCE_UI: Registry = REGISTRY;

export const isRegistryKey = (v: string): v is ResourceKey => Object.hasOwn(REGISTRY, v);

/** `summary` del recurso con el detalle sin tipar (para hooks genéricos sobre ResourceKey). */
export function summaryOf(r: ResourceKey): ((d: unknown, ctx: SummaryCtx) => string) | undefined {
  return RESOURCE_UI[r].summary as ((d: unknown, ctx: SummaryCtx) => string) | undefined;
}

/** Recursos de un pivote o de un grupo, en el orden del registro. */
export const resourcesOfPivot = (p: HubPivotId): ResourceKey[] =>
  (Object.keys(REGISTRY) as ResourceKey[]).filter((k) => REGISTRY[k].pivot === p);
export const resourcesOfGroup = (g: EndpointGroup): ResourceKey[] =>
  (Object.keys(REGISTRY) as ResourceKey[]).filter((k) => REGISTRY[k].group === g);
