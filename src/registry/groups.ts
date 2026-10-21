// 12 grupos de endpoints y 8 pivotes (§7.1, §10.4), con etiqueta española, orden y ruta.
import { es } from '../i18n/es';

export type EndpointGroup = 'bayas' | 'concursos' | 'monedas' | 'encuentros' | 'evolucion' | 'juegos'
  | 'objetos' | 'lugares' | 'maquinas' | 'movimientos' | 'pokemon' | 'utilidad';           // 12 (VER-3)
export type PivotId = 'inicio' | 'pokedex' | 'juegos' | 'objetos' | 'movimientos' | 'mundo' | 'bayas' | 'ajustes';
export type HubPivotId = Exclude<PivotId, 'inicio' | 'ajustes'>;

/** Orden de la documentación de la PokeAPI (el del Explorador). */
export const GROUP_ORDER: readonly EndpointGroup[] = [
  'bayas', 'concursos', 'monedas', 'encuentros', 'evolucion', 'juegos',
  'objetos', 'lugares', 'maquinas', 'movimientos', 'pokemon', 'utilidad',
];
export const GROUPS: readonly { id: EndpointGroup; label: string }[] =
  GROUP_ORDER.map((id) => ({ id, label: es.groups[id] }));

/** Orden circular de LB/RB: Inicio → Pokédex → Juegos → Objetos → Movimientos → Mundo → Bayas → Ajustes. */
export const PIVOTS: readonly { id: PivotId; label: string; path: string }[] = [
  { id: 'inicio', label: es.pivots.inicio, path: '/' },
  { id: 'pokedex', label: es.pivots.pokedex, path: '/hub/pokedex' },
  { id: 'juegos', label: es.pivots.juegos, path: '/hub/juegos' },
  { id: 'objetos', label: es.pivots.objetos, path: '/hub/objetos' },
  { id: 'movimientos', label: es.pivots.movimientos, path: '/hub/movimientos' },
  { id: 'mundo', label: es.pivots.mundo, path: '/hub/mundo' },
  { id: 'bayas', label: es.pivots.bayas, path: '/hub/bayas' },
  { id: 'ajustes', label: es.pivots.ajustes, path: '/ajustes' },
];

/** Pivote de una ruta de PivotLayout ('/', '/hub/:pivot', '/ajustes'), o null. */
export function pivotFromPath(pathname: string): PivotId | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PIVOTS.find((x) => x.path === p)?.id ?? null;
}
