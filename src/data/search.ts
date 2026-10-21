// Normalización y ranking de búsqueda (§13.1). Puro.

export const MAX_QUERY = 50;

/**
 * NFD sin diacríticos, minúsculas, espacios y `_` → `-`, solo `[a-z0-9-]`, guiones colapsados,
 * sin guiones en los extremos, máximo 50 caracteres. "Mr. Mimé" → "mr-mime"; "'-'" → "".
 */
export function normalizeQuery(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_QUERY)
    .replace(/-+$/, '');
}

export interface SearchEntry { id: number; slug: string }

export interface RankOptions<E extends SearchEntry> {
  /** Máximo de sugerencias (8 por defecto). */
  limit?: number;
  /** Nombre localizado YA en caché (o null); se normaliza igual que la consulta. */
  localizedName?: (e: E) => string | null;
}

/**
 * Orden de §13.1: número exacto, slug exacto, prefijo del slug, subcadena del slug y, por último,
 * coincidencia con el nombre localizado en caché. Dentro de cada grupo se respeta el orden de entrada.
 * `q` se normaliza aquí; con una consulta vacía no hay sugerencias.
 */
export function rankSuggestions<E extends SearchEntry>(entries: readonly E[], q: string, opts: RankOptions<E> = {}): E[] {
  const query = normalizeQuery(q);
  const limit = opts.limit ?? 8;
  if (query === '' || limit <= 0) return [];
  const asNumber = /^\d{1,6}$/.test(query) ? Number(query) : null;
  const buckets: E[][] = [[], [], [], [], []];
  for (const e of entries) {
    let b = -1;
    if (asNumber !== null && e.id === asNumber) b = 0;
    else if (e.slug === query) b = 1;
    else if (e.slug.startsWith(query)) b = 2;
    else if (e.slug.includes(query)) b = 3;
    else if (opts.localizedName) {
      const name = opts.localizedName(e);
      if (name && normalizeQuery(name).includes(query)) b = 4;
    }
    if (b >= 0) buckets[b]!.push(e);
  }
  return buckets.flat().slice(0, limit);
}
