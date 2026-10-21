// Destino de las referencias (§7.2). Puro: solo depende de api/ (ui/ lo puede importar).
import { RESOURCES } from '../api/resources';
import type { APIResource, NamedAPIResource } from '../api/types/common';
import { parseResourceUrl } from '../api/urls';

export type RefContext = 'grid' | 'chip';

const SLUG_RE = /^[a-z0-9-]{1,100}$/;

/**
 * - especie dentro de una cuadrícula de Pokémon o del árbol evolutivo (`grid`) → `/pokemon/{idDeLaURL}`
 *   (el slug no sirve: `deoxys` → 404, el Pokémon es `deoxys-normal`);
 * - `pokemon` → `/pokemon/{name}`;
 * - el resto → `/{recurso}/{name}` (con nombre) o `/{recurso}/{id}` (sin nombre).
 * URL inválida → null (ResourceLink pinta un <span> sin enlace).
 */
export function refHref(ref: NamedAPIResource | APIResource, context: RefContext): string | null {
  const p = parseResourceUrl(ref.url);
  if (!p) return null;
  const raw = 'name' in ref ? ref.name : null;
  const name = typeof raw === 'string' && SLUG_RE.test(raw) ? raw : null;
  if (p.resource === 'pokemon-species' && context === 'grid') return `/pokemon/${p.id}`;
  if (p.resource === 'pokemon') return `/pokemon/${name ?? p.id}`;
  return `/${p.resource}/${RESOURCES[p.resource].named && name ? name : p.id}`;
}
