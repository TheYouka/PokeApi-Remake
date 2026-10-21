// Tabla de tiles por pivote (§10.4), construida a partir de REGISTRY y de los textos de es.ts.
// Todos los tiles de recurso enlazan a '/{recurso}'. Fila 1 de 4 unidades; las siguientes, de 2.
import type { ResourceKey } from '../../api/resources';
import { es } from '../../i18n/es';
import type { HubPivotId } from '../../registry/groups';
import { REGISTRY } from '../../registry/resources';
import type { IconName } from '../../ui/icons';
import type { TileSize, TileVariant } from '../../ui/Tile';

export type LiveKind = 'daily-pokemon' | 'pokedex-collage' | 'last-achievement' | 'daily-berry';

export interface TileDef {
  id: string;
  size: TileSize;
  variant: TileVariant;
  icon: IconName;
  title: string;
  ariaLabel: string;
  to: string;
  live?: LiveKind;
}
export interface RowDef { id: string; title: string; rows: 4 | 2; tiles: TileDef[] }

export type HomePivot = 'inicio' | HubPivotId;

const res = (key: ResourceKey, size: TileSize, variant: TileVariant = 'surface', title?: string): TileDef => {
  const r = REGISTRY[key];
  const label = title ?? r.label;
  return { id: key, size, variant, icon: r.icon, title: label, ariaLabel: label, to: `/${key}` };
};
const screen = (id: string, size: TileSize, variant: TileVariant, icon: IconName, title: string, to: string): TileDef =>
  ({ id, size, variant, icon, title, ariaLabel: title, to });

const h = es.home;

const TOOLS_SHORT: TileDef[] = [
  screen('tipos', 'medium', 'surface', 'tabla', h.typeChart, '/tipos'),
  screen('comparar', 'medium', 'surface', 'comparar', h.compare, '/comparar'),
  screen('estadisticas', 'medium', 'surface', 'estadistica', h.stats, '/estadisticas'),
  screen('graficas', 'medium', 'surface', 'grafica', h.charts, '/graficas'),
  screen('crear', 'medium', 'accent', 'crear', h.create, '/crear'),
];

export const PIVOT_ROWS: Record<HomePivot, RowDef[]> = {
  inicio: [
    {
      id: 'inicio-1', title: h.featured, rows: 4, tiles: [
        { ...screen('pokedex', 'large', 'image', 'pokedex', h.pokedex, '/pokemon'), ariaLabel: h.collageAria, live: 'pokedex-collage' },
        { ...screen('pokemon-del-dia', 'wide', 'image', 'pokemon', h.dailyPokemon, '/pokemon-species'), live: 'daily-pokemon' },
        screen('partida-rapida', 'medium', 'accent', 'dado', h.quickPlay, '/partida-rapida'),
        screen('tabla-tipos', 'medium', 'surface', 'tabla', h.typeChart, '/tipos'),
        screen('comparar', 'small', 'surface', 'comparar', h.compare, '/comparar'),
        screen('logros', 'small', 'accent', 'trofeo', h.achievements, '/logros'),
        screen('explorador', 'small', 'surface', 'api', h.explorer, '/api'),
        screen('retro', 'small', 'surface', 'retro', h.retro, '/retro'),
      ],
    },
    {
      id: 'inicio-herramientas', title: h.tools, rows: 2, tiles: [
        screen('estadisticas', 'medium', 'surface', 'estadistica', h.stats, '/estadisticas'),
        screen('graficas', 'medium', 'surface', 'grafica', h.charts, '/graficas'),
        screen('crear', 'medium', 'accent', 'crear', h.create, '/crear'),
        { ...screen('ultimo-logro', 'wide', 'surface', 'trofeo', h.lastAchievement, '/logros'), live: 'last-achievement' },
        { ...screen('baya-del-dia', 'medium', 'surface', 'bayas', h.dailyBerry, '/berry'), live: 'daily-berry' },
        screen('ajustes', 'small', 'surface', 'ajustes', h.settings, '/ajustes'),
      ],
    },
  ],
  pokedex: [
    {
      id: 'pokedex-1', title: es.pivots.pokedex, rows: 4, tiles: [
        { ...res('pokemon', 'large', 'accent', h.pokedex), icon: 'pokedex', to: '/pokemon' },
        res('pokemon-species', 'wide'),
        res('type', 'medium'),
        res('ability', 'medium'),
        res('pokemon-form', 'small'),
        res('nature', 'small'),
      ],
    },
    { id: 'pokedex-herramientas', title: h.tools, rows: 2, tiles: TOOLS_SHORT },
    {
      id: 'pokedex-cria', title: h.breeding, rows: 2, tiles: [
        res('egg-group', 'medium'), res('gender', 'medium'), res('growth-rate', 'medium'), res('characteristic', 'medium'),
      ],
    },
    {
      id: 'pokedex-clasificacion', title: h.classification, rows: 2, tiles: [
        res('pokemon-color', 'medium'), res('pokemon-habitat', 'medium'), res('pokemon-shape', 'medium'),
        res('stat', 'medium'), res('pokeathlon-stat', 'medium'),
      ],
    },
    {
      id: 'pokedex-evolucion', title: h.evolution, rows: 2, tiles: [
        res('evolution-chain', 'wide', 'accent'), res('evolution-trigger', 'medium'), res('evolution-variable', 'medium'),
      ],
    },
  ],
  juegos: [
    {
      id: 'juegos-1', title: es.pivots.juegos, rows: 4, tiles: [
        res('generation', 'wide', 'accent'), res('pokedex', 'wide'), res('version', 'medium'), res('version-group', 'medium'),
      ],
    },
    {
      id: 'juegos-concursos', title: h.contests, rows: 2, tiles: [
        res('contest-type', 'medium'), res('contest-effect', 'medium'), res('super-contest-effect', 'medium'),
      ],
    },
    { id: 'juegos-utilidad', title: h.utility, rows: 2, tiles: [res('language', 'medium')] },
  ],
  objetos: [
    {
      id: 'objetos-1', title: es.pivots.objetos, rows: 4, tiles: [
        res('item', 'large', 'accent'), res('item-category', 'medium'), res('item-pocket', 'medium'),
      ],
    },
    {
      id: 'objetos-mas', title: h.moreItems, rows: 2, tiles: [
        res('item-attribute', 'medium'), res('item-fling-effect', 'medium'), res('currency', 'medium'),
      ],
    },
  ],
  movimientos: [
    {
      id: 'movimientos-1', title: es.pivots.movimientos, rows: 4, tiles: [
        res('move', 'wide', 'accent'), res('machine', 'medium'), res('move-damage-class', 'medium'),
      ],
    },
    {
      id: 'movimientos-mas', title: h.moreMoves, rows: 2, tiles: [
        res('move-ailment', 'medium'), res('move-battle-style', 'medium'), res('move-category', 'medium'),
        res('move-learn-method', 'medium'), res('move-target', 'medium'),
      ],
    },
  ],
  mundo: [
    {
      id: 'mundo-1', title: es.pivots.mundo, rows: 4, tiles: [
        res('region', 'wide', 'accent'), res('location', 'wide'), res('location-area', 'medium'), res('pal-park-area', 'medium'),
      ],
    },
    {
      id: 'mundo-encuentros', title: h.encounters, rows: 2, tiles: [
        res('encounter-method', 'medium'), res('encounter-condition', 'medium'), res('encounter-condition-value', 'medium'),
      ],
    },
  ],
  bayas: [
    {
      id: 'bayas-1', title: es.pivots.bayas, rows: 4, tiles: [
        res('berry', 'wide', 'accent'),
        { ...screen('baya-del-dia', 'medium', 'surface', 'bayas', h.dailyBerry, '/berry'), live: 'daily-berry' },
        res('berry-firmness', 'medium'),
        res('berry-flavor', 'medium'),
      ],
    },
  ],
};
