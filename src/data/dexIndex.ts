// Índice de la Pokédex (§5.4): listAll('pokemon') + listAll('pokemon-species') + creados.
import { useMemo } from 'react';
import type { NamedAPIResource } from '../api/types/common';
import { parseResourceUrl } from '../api/urls';
import type { CreatedPokemon } from '../state/created';
import { created as createdStore } from '../state/created';
import { useStore } from '../state/store';
import { useListAll } from './hooks';

export interface DexEntry { id: number; slug: string; speciesId: number | null; isDefault: boolean; created: boolean }

/** Último ID de la forma por defecto: ≤ 10000 → speciesId = id. */
const DEFAULT_MAX_ID = 10000;

/** Prefijo más largo en límite de guion que sea un slug de especie (`charizard-mega-x` → `charizard`). */
export function speciesPrefix(slug: string, speciesBySlug: ReadonlyMap<string, number>): number | null {
  let cut = slug.lastIndexOf('-');
  while (cut > 0) {
    const hit = speciesBySlug.get(slug.slice(0, cut));
    if (hit !== undefined) return hit;
    cut = slug.lastIndexOf('-', cut - 1);
  }
  return null;
}

/**
 * Puro. Con `speciesList` null (la lista de especies falló) las formas alternativas quedan con
 * `speciesId: null`. Resultado ordenado por ID.
 */
export function buildDexIndex(
  pokemonList: readonly NamedAPIResource[],
  speciesList: readonly NamedAPIResource[] | null,
  created: readonly Pick<CreatedPokemon, 'id' | 'slug'>[],
): DexEntry[] {
  const speciesBySlug = new Map<string, number>();
  for (const s of speciesList ?? []) {
    const p = parseResourceUrl(s.url);
    if (p) speciesBySlug.set(s.name, p.id);
  }
  const out: DexEntry[] = [];
  const ids = new Set<number>();
  for (const ref of pokemonList) {
    const p = parseResourceUrl(ref.url);
    if (!p || p.id < 1 || ids.has(p.id)) continue;
    ids.add(p.id);
    if (p.id <= DEFAULT_MAX_ID) {
      out.push({ id: p.id, slug: ref.name, speciesId: p.id, isDefault: true, created: false });
    } else {
      out.push({ id: p.id, slug: ref.name, speciesId: speciesPrefix(ref.name, speciesBySlug), isDefault: false, created: false });
    }
  }
  for (const c of created) {
    if (ids.has(c.id)) continue;
    ids.add(c.id);
    out.push({ id: c.id, slug: c.slug, speciesId: null, isDefault: true, created: true });
  }
  return out.sort((a, b) => a.id - b.id);
}

/** Índice combinado (2 peticiones de lista, cacheadas) + estado de cada lista. */
export function useDexIndex() {
  const pokemon = useListAll('pokemon');
  const species = useListAll('pokemon-species');
  const createdList = useStore(createdStore, (s) => s);
  const entries = useMemo(
    () => (pokemon.data ? buildDexIndex(pokemon.data.results, species.data?.results ?? null, createdList) : null),
    [pokemon.data, species.data, createdList],
  );
  return { entries, pokemon, species, createdList };
}
