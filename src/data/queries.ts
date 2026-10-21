// Fábricas de consultas (§5.2). Todas pasan `signal` de React Query al cliente.
import { queryOptions } from '@tanstack/react-query';
import { canonicalIdOrName, parseResourceUrl, type IdOrName } from '../api/urls';
import type { Priority } from '../api/limiter';
import type { ResourceKey } from '../api/resources';
import type { APIResource, NamedAPIResource } from '../api/types/common';
import { pokeApi } from './client';

/** Recibe un IdOrName YA validado: con null la pantalla pinta el 404 sin crear la consulta (§6). */
export const resourceQuery = <K extends ResourceKey>(r: K, id: IdOrName) =>
  queryOptions({
    queryKey: ['pokeapi', r, canonicalIdOrName(id)] as const,
    queryFn: ({ signal }) => pokeApi.get(r, id.value, { signal, priority: 'high' }),
  });

/** Clave de una referencia: ['pokeapi', recurso, String(id)] (vía parseResourceUrl). */
export function refQueryKey(ref: NamedAPIResource | APIResource): readonly unknown[] {
  const p = parseResourceUrl(ref.url);
  return p ? ['pokeapi', p.resource, String(p.id)] : ['pokeapi', 'invalid-ref', ref.url];
}

export const refQuery = <K extends ResourceKey>(ref: NamedAPIResource<K> | APIResource<K>, priority: Priority = 'low') =>
  queryOptions({
    queryKey: refQueryKey(ref),
    queryFn: ({ signal }) => pokeApi.resolve<K>(ref, { signal, priority }),   // URL ajena → INVALID_PARAM sin red
  });

export const listAllQuery = <K extends ResourceKey>(r: K) =>
  queryOptions({
    queryKey: ['pokeapi-list', r, 'all'] as const,
    queryFn: ({ signal }) => pokeApi.listAll(r, { signal, priority: 'high' }),
  });

/** Contadores del Explorador (`limit=1`) y `count` de regiones: prioridad baja. */
export const listPageQuery = <K extends ResourceKey>(r: K, limit: number, offset: number) =>
  queryOptions({
    queryKey: ['pokeapi-list', r, limit, offset] as const,
    queryFn: ({ signal }) => pokeApi.list(r, { limit, offset }, { signal, priority: 'low' }),
  });

export const encountersQuery = (id: number | string) =>
  queryOptions({
    queryKey: ['pokeapi', 'pokemon-encounters', id] as const,
    queryFn: ({ signal }) => pokeApi.getPokemonEncounters(id, { signal, priority: 'high' }),
  });

export const metaQuery = () =>
  queryOptions({
    queryKey: ['pokeapi', 'meta'] as const,
    queryFn: ({ signal }) => pokeApi.getMeta({ signal, priority: 'low' }),
  });
