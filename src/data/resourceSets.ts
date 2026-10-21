// Conjuntos completos de un recurso (todos los colores, grupos huevo, hábitats…) para Estadísticas y
// Gráficas (§13.8, §13.9): listAll + el detalle de cada elemento con prioridad high. Comparten las
// claves de refQuery, así que las dos pantallas y las fichas reutilizan la misma caché (deduplicado).
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ResourceKey } from '../api/resources';
import type { NamedAPIResource, ResourceMap } from '../api/types/index';
import { parseResourceUrl } from '../api/urls';
import { useListAll } from './hooks';
import { refQuery } from './queries';

export interface ResourceSet<K extends ResourceKey> {
  refs: NamedAPIResource<K>[];
  /** Detalles en el orden de `refs` (undefined mientras carga o si falló). */
  items: (ResourceMap[K] | undefined)[];
  loaded: number;
  /** null mientras no se conoce la lista. */
  total: number | null;
  done: boolean;
  error: unknown;
  retry: () => void;
}

export function useResourceSet<K extends ResourceKey>(r: K): ResourceSet<K> {
  const list = useListAll(r);
  const refs = useMemo(
    () => ((list.data?.results ?? []) as NamedAPIResource<K>[]).filter((x) => parseResourceUrl(x.url) !== null),
    [list.data],
  );
  const queries = useQueries({ queries: refs.map((ref) => ({ ...refQuery<K>(ref, 'high') })) });
  const items = queries.map((q) => q.data as ResourceMap[K] | undefined);
  const loaded = items.filter((x) => x !== undefined).length;
  const failed = queries.filter((q) => q.isError);
  return {
    refs,
    items,
    loaded,
    total: list.data ? refs.length : null,
    done: list.data !== undefined && loaded === refs.length,
    error: list.isError ? list.error : (failed[0]?.error ?? null),
    retry: () => {
      if (list.isError) { void list.refetch(); return; }
      for (const q of failed) void q.refetch();
    },
  };
}

/** IDs de las especies (o Pokémon) de una lista de referencias. Puro. */
export function idsOf(refs: readonly { url: string }[]): number[] {
  const out: number[] = [];
  for (const r of refs) {
    const p = parseResourceUrl(r.url);
    if (p) out.push(p.id);
  }
  return out;
}
