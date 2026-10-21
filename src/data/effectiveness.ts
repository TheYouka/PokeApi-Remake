// Efectividad de tipos (RF-POK-10, RF-TYPE). Puro.
import type { NamedAPIResource } from '../api/types/common';
import { BASE_URL } from '../api/urls';
import type { TypeRelations } from '../api/types/pokemon';
import type { TypeMatrix } from './typeCatalog';

type DefTypeDetail = { name: string; damage_relations: TypeRelations };

/**
 * Multiplicador defensivo por tipo atacante (×4, ×2, ×1, ×½, ×¼, ×0) para un Pokémon con esos tipos.
 * Solo aparecen los atacantes mencionados en las relaciones; los que falten valen ×1.
 */
export function defensiveMultipliers(typeDetails: readonly DefTypeDetail[]): Map<string, number> {
  const out = new Map<string, number>();
  const apply = (refs: readonly NamedAPIResource[], factor: number) => {
    for (const r of refs) out.set(r.name, (out.get(r.name) ?? 1) * factor);
  };
  for (const t of typeDetails) {
    apply(t.damage_relations.double_damage_from, 2);
    apply(t.damage_relations.half_damage_from, 0.5);
    apply(t.damage_relations.no_damage_from, 0);
  }
  return out;
}

export interface DefensiveGroup { multiplier: number; types: NamedAPIResource<'type'>[] }
const GROUP_ORDER = [4, 2, 1, 0.5, 0.25, 0] as const;

/** Los 18 tipos de combate en orden de ID (type/1 … type/18): base del grupo ×1 sin pedir listAll('type'). */
export const BATTLE_TYPES = [
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel',
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy',
] as const;
const battleRef = (name: string, i: number): NamedAPIResource<'type'> => ({ name, url: `${BASE_URL}type/${i + 1}/` });

/**
 * Grupos ×4, ×2, ×1, ×½, ×¼ y ×0 (RF-POK-10). Las referencias salen de las propias relaciones; los
 * tipos de combate que no aparecen en ellas, o cuyos factores se anulan (×2·×½), forman el grupo ×1.
 */
export function defensiveGroups(typeDetails: readonly DefTypeDetail[]): DefensiveGroup[] {
  const mult = defensiveMultipliers(typeDetails);
  const refs = new Map<string, NamedAPIResource<'type'>>();
  BATTLE_TYPES.forEach((name, i) => refs.set(name, battleRef(name, i)));
  for (const t of typeDetails) {
    const r = t.damage_relations;
    for (const ref of [...r.double_damage_from, ...r.half_damage_from, ...r.no_damage_from]) refs.set(ref.name, ref);
  }
  const all = new Map<string, number>(BATTLE_TYPES.map((name) => [name, 1]));
  for (const [name, v] of mult) all.set(name, v);
  return GROUP_ORDER
    .map((m) => ({ multiplier: m, types: [...all].filter(([, v]) => v === m).map(([name]) => refs.get(name)!) }))
    .filter((g) => g.types.length > 0);
}

/** matrix[atacante][defensor] (×1 si falta). */
export const matrixValue = (matrix: TypeMatrix, atk: string, def: string): number => matrix[atk]?.[def] ?? 1;

const SYMBOLS: Record<string, string> = { '4': '×4', '2': '×2', '1': '×1', '0.5': '×½', '0.25': '×¼', '0': '×0' };
/** 2 → "×2", 0.5 → "×½", 0.25 → "×¼". */
export const formatMultiplier = (m: number): string => SYMBOLS[String(m)] ?? `×${m}`;
