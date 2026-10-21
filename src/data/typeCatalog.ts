// Catálogo de tipos (§5.5): listAll('type') + los 18 tipos de combate (high). Deriva los tipos de
// todos los Pokémon (sin un detalle por tarjeta), la matriz de efectividad y los nombres en orden de ID.
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { NamedAPIResource } from '../api/types/common';
import type { Type, TypeRelations } from '../api/types/pokemon';
import { parseResourceUrl } from '../api/urls';
import { useListAll } from './hooks';
import { refQuery } from './queries';

/** Tipos sin relaciones de daño o sin Pokémon: fuera de la matriz y de los filtros. */
const NON_BATTLE = new Set(['stellar', 'unknown', 'shadow']);
const MAX_BATTLE_ID = 10000;

export type TypeMatrix = Record<string, Record<string, number>>;

const idOf = (ref: { url: string }): number => parseResourceUrl(ref.url)?.id ?? Number.POSITIVE_INFINITY;

/** Los 18 tipos de combate de la lista, en orden de ID. */
export function battleTypeRefs(list: readonly NamedAPIResource<'type'>[]): NamedAPIResource<'type'>[] {
  return list
    .filter((t) => !NON_BATTLE.has(t.name) && idOf(t) < MAX_BATTLE_ID)
    .sort((a, b) => idOf(a) - idOf(b));
}

/** `type.pokemon[].slot` → id de Pokémon → tipos ordenados por slot. Puro. */
export function buildTypesByPokemon(types: readonly Pick<Type, 'name' | 'pokemon'>[]): Map<number, string[]> {
  const slots = new Map<number, { slot: number; name: string }[]>();
  for (const t of types) {
    for (const p of t.pokemon) {
      const id = parseResourceUrl(p.pokemon.url)?.id;
      if (id === undefined) continue;
      const list = slots.get(id) ?? [];
      list.push({ slot: p.slot, name: t.name });
      slots.set(id, list);
    }
  }
  const out = new Map<number, string[]>();
  for (const [id, list] of slots) out.set(id, list.sort((a, b) => a.slot - b.slot).map((x) => x.name));
  return out;
}

/** matrix[atacante][defensor] desde `damage_relations` (×2, ×½, ×0; el resto ×1). Puro. */
export function buildMatrix(types: readonly { name: string; damage_relations: TypeRelations }[]): TypeMatrix {
  const names = types.map((t) => t.name);
  const matrix: TypeMatrix = {};
  for (const atk of types) {
    const row: Record<string, number> = {};
    for (const def of names) row[def] = 1;
    for (const r of atk.damage_relations.double_damage_to) row[r.name] = 2;
    for (const r of atk.damage_relations.half_damage_to) row[r.name] = 0.5;
    for (const r of atk.damage_relations.no_damage_to) row[r.name] = 0;
    matrix[atk.name] = row;
  }
  return matrix;
}

export type TypeCatalogStatus = 'loading' | 'ready' | 'partial' | 'error';

export interface TypeCatalog {
  status: TypeCatalogStatus;
  /** Tipos que fallaron (`'type'` si falló la lista). */
  failed: string[];
  /** Primer error (para el código de ErrorPanel). */
  error: unknown;
  retry: () => void;
  /** Solo con `ready` (un catálogo incompleto daría tipos o multiplicadores falsos). */
  typesByPokemonId: Map<number, string[]> | null;
  matrix: TypeMatrix | null;
  battleTypeNames: string[];
  /** Referencias de los 18 tipos de combate (en orden de ID) y de todos los de la lista. */
  battleTypes: NamedAPIResource<'type'>[];
  allTypes: NamedAPIResource<'type'>[];
  refOf: (name: string) => NamedAPIResource<'type'> | null;
  /** Detalles cargados por nombre (también con `partial`). */
  details: Map<string, Type>;
}

export function useTypeCatalog(): TypeCatalog {
  const list = useListAll('type');
  const battleTypes = useMemo(() => (list.data ? battleTypeRefs(list.data.results) : []), [list.data]);
  const queries = useQueries({ queries: battleTypes.map((t) => ({ ...refQuery(t, 'high') })) });

  const stamp = queries.map((q) => `${q.status}:${q.dataUpdatedAt}`).join('|');
  const derived = useMemo(() => {
    const details = new Map<string, Type>();
    queries.forEach((q, i) => { if (q.data) details.set(battleTypes[i]!.name, q.data); });
    const complete = battleTypes.length > 0 && details.size === battleTypes.length;
    const ordered = battleTypes.map((t) => details.get(t.name)).filter((t): t is Type => t !== undefined);
    return {
      details,
      typesByPokemonId: complete ? buildTypesByPokemon(ordered) : null,
      matrix: complete ? buildMatrix(ordered) : null,
    };
    // `stamp` resume el estado de las 18 consultas (useQueries devuelve un array nuevo en cada render).
  }, [stamp, battleTypes]);

  const failedIdx = queries.map((q, i) => (q.isError ? i : -1)).filter((i) => i >= 0);
  let status: TypeCatalogStatus;
  if (list.isError) status = 'error';
  else if (list.isPending) status = 'loading';
  else if (failedIdx.length > 0) status = 'partial';
  else if (queries.some((q) => q.isPending)) status = 'loading';
  else status = 'ready';

  const failed = list.isError ? ['type'] : failedIdx.map((i) => battleTypes[i]!.name);
  const error = list.isError ? list.error : failedIdx.length > 0 ? queries[failedIdx[0]!]!.error : null;
  const allTypes = list.data?.results ?? [];

  return {
    status,
    failed,
    error,
    retry: () => {
      if (list.isError) { void list.refetch(); return; }
      for (const i of failedIdx) void queries[i]!.refetch();
    },
    typesByPokemonId: status === 'ready' ? derived.typesByPokemonId : null,
    matrix: status === 'ready' ? derived.matrix : null,
    battleTypeNames: battleTypes.map((t) => t.name),
    battleTypes,
    allTypes,
    refOf: (name) => allTypes.find((t) => t.name === name) ?? null,
    details: derived.details,
  };
}
