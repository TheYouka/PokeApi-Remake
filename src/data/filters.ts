// Intersección de filtros de la Pokédex (§13.1). Puro.
import type { DexEntry } from './dexIndex';
import { normalizeQuery } from './search';

/** Un conjunto por filtro activo: tipos → IDs de Pokémon; generación, color, hábitat, forma y huevo → especies. */
export interface FilterSets { typePokemonIds: Set<number>[]; speciesSets: Set<number>[] }

/** Datos propios de los creados y valores activos de cada filtro (los creados se filtran con sus campos). */
export interface CreatedFilterMeta {
  byId: ReadonlyMap<number, { types: readonly string[]; color: string; habitat: string; eggGroups: readonly string[] }>;
  active: {
    types: readonly string[];
    color: string | null;
    habitat: string | null;
    egg: string | null;
    gen: number | null;
    shape: string | null;
  };
}

export interface ApplyFilterOptions {
  /** Incluir formas alternativas (`isDefault: false`). Desactivado por defecto (RF-DEX-4). */
  includeForms: boolean;
  /** Consulta de la cuadrícula (se normaliza aquí): subcadena del slug o número exacto. */
  q: string;
  createdMeta: CreatedFilterMeta | null;
}

function createdPasses(e: DexEntry, meta: CreatedFilterMeta | null): boolean {
  if (!meta) return true;
  const { active } = meta;
  const anyActive = active.types.length > 0 || active.color !== null || active.habitat !== null
    || active.egg !== null || active.gen !== null || active.shape !== null;
  if (!anyActive) return true;
  // Sin generación ni forma corporal: con esos filtros quedan fuera.
  if (active.gen !== null || active.shape !== null) return false;
  const c = meta.byId.get(e.id);
  if (!c) return false;
  if (!active.types.every((t) => c.types.includes(t))) return false;
  if (active.color !== null && c.color !== active.color) return false;
  if (active.habitat !== null && c.habitat !== active.habitat) return false;
  if (active.egg !== null && !c.eggGroups.includes(active.egg)) return false;
  return true;
}

export function applyFilters(entries: readonly DexEntry[], f: FilterSets, opts: ApplyFilterOptions): DexEntry[] {
  const q = normalizeQuery(opts.q);
  const qNumber = /^\d{1,6}$/.test(q) ? Number(q) : null;
  return entries.filter((e) => {
    if (!opts.includeForms && !e.isDefault) return false;
    if (q !== '' && !(e.slug.includes(q) || e.id === qNumber)) return false;
    if (e.created) return createdPasses(e, opts.createdMeta);
    if (!f.typePokemonIds.every((set) => set.has(e.id))) return false;
    if (f.speciesSets.length > 0) {
      if (e.speciesId === null) return false;            // forma sin especie deducida: no pasa
      if (!f.speciesSets.every((set) => set.has(e.speciesId!))) return false;
    }
    return true;
  });
}
