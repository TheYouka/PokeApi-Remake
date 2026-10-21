// Árbol evolutivo (§13.3). Puro: el componente EvolutionTree pinta las partes con ResourceLink.
import { formatSlug } from '../api/localize';
import type { NamedAPIResource } from '../api/types/common';
import type { ChainLink, EvolutionDetail } from '../api/types/evolution';
import { parseResourceUrl } from '../api/urls';
import { es } from '../i18n/es';

export interface EvoNode {
  speciesId: number;
  slug: string;
  species: NamedAPIResource<'pokemon-species'>;
  isBaby: boolean;
  details: EvolutionDetail[];
  children: EvoNode[];
}

export function buildTree(link: ChainLink): EvoNode {
  return {
    speciesId: parseResourceUrl(link.species.url)?.id ?? 0,
    slug: link.species.name,
    species: link.species,
    isBaby: link.is_baby,
    details: link.evolution_details,
    children: link.evolves_to.map(buildTree),
  };
}

/** Logro Eeveelución: algún nodo con 2 o más hijos. */
export const hasBranch = (n: EvoNode): boolean => n.children.length >= 2 || n.children.some(hasBranch);

/** Regla única de vacío: el campo no aplica (valores en vivo cuando no hay condición). */
export const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === false || v === '' || (Array.isArray(v) && v.length === 0);

/** Parte de texto o referencia (`template` con `{}` donde va la referencia; `fallback` si no hay etiqueta localizada). */
export type Part = { text: string } | { ref: NamedAPIResource; template: string; fallback?: string };

const isRef = (v: unknown): v is NamedAPIResource =>
  typeof v === 'object' && v !== null && typeof (v as { name?: unknown }).name === 'string'
  && typeof (v as { url?: unknown }).url === 'string';

const valueText = (v: unknown): string => {
  if (isRef(v)) return formatSlug(v.name);
  if (Array.isArray(v)) return v.map(valueText).join(', ');
  if (typeof v === 'object' && v !== null) return JSON.stringify(v);
  return String(v);
};
const fieldLabel = (k: string): string => formatSlug(k.replace(/_/g, '-'));

/** Campos con correspondencia propia (o que no se pintan como condición). */
const KNOWN = new Set([
  'trigger', 'min_level', 'item', 'held_item', 'known_move', 'known_move_type', 'location', 'region',
  'min_happiness', 'min_beauty', 'min_affection', 'time_of_day', 'gender', 'needs_overworld_rain',
  'turn_upside_down', 'party_species', 'party_type', 'relative_physical_stats', 'trade_species',
  'needs_multiplayer', 'near_special_rock', 'required_pokemon_form', 'evolved_pokemon_form', 'used_move',
  'min_move_count', 'min_steps', 'min_damage_taken', 'allowed_natures', 'condition_expression',
  'version_group', 'is_default',
]);

export interface DescribeContext {
  /** Slug de la especie de origen: `required_pokemon_form` igual a él se omite. */
  fromSlug?: string;
  /** Slug de la especie de destino: `evolved_pokemon_form` igual a él se omite. */
  toSlug?: string;
  /** Sin la parte de `location` (la agrupación la trata aparte). */
  omitLocation?: boolean;
}

/** Partes de un detalle de evolución, en español (§13.3). Nunca descarta un campo no vacío. */
export function describeEvolutionDetail(d: EvolutionDetail, ctx: DescribeContext = {}): Part[] {
  const e = es.evo;
  const raw = d as unknown as Record<string, unknown>;
  const has = (k: string) => !isEmpty(raw[k]);
  const parts: Part[] = [];
  const generic = (k: string) => parts.push({ text: e.generic(fieldLabel(k), valueText(raw[k])) });
  const ref = (k: string, template: string) => {
    const v = raw[k];
    if (isRef(v)) parts.push({ ref: v, template });
    else generic(k);
  };

  // Disparador (se omite si es redundante: "Usar {objeto}" y "Nivel N" ya lo dicen).
  const trigger = d.trigger;
  if (isRef(trigger)) {
    const redundant = (trigger.name === 'use-item' && has('item')) || (trigger.name === 'level-up' && has('min_level'));
    if (!redundant) parts.push({ ref: trigger, template: e.ref, fallback: e.triggers[trigger.name] ?? formatSlug(trigger.name) });
  }
  if (has('min_level')) parts.push({ text: e.minLevel(Number(d.min_level)) });
  if (has('item')) ref('item', e.item);
  if (has('held_item')) ref('held_item', e.heldItem);
  if (has('known_move')) ref('known_move', e.knownMove);
  if (has('known_move_type')) ref('known_move_type', e.knownMoveType);
  if (has('location') && !ctx.omitLocation) ref('location', e.location);
  if (has('region')) ref('region', e.region);
  if (has('min_happiness')) parts.push({ text: e.minHappiness(Number(d.min_happiness)) });
  if (has('min_beauty')) parts.push({ text: e.minBeauty(Number(d.min_beauty)) });
  if (has('min_affection')) parts.push({ text: e.minAffection(Number(d.min_affection)) });
  if (has('time_of_day')) {
    const t = String(d.time_of_day);
    parts.push({ text: e.timeOfDay[t] ?? e.timeOfDayOther(t) });
  }
  if (has('gender')) {
    const g = e.gender[Number(d.gender)];
    if (g) parts.push({ text: g }); else generic('gender');
  }
  if (d.needs_overworld_rain === true) parts.push({ text: e.rain });
  else if (has('needs_overworld_rain')) generic('needs_overworld_rain');
  if (d.turn_upside_down === true) parts.push({ text: e.upsideDown });
  else if (has('turn_upside_down')) generic('turn_upside_down');
  if (has('party_species')) ref('party_species', e.partySpecies);
  if (has('party_type')) ref('party_type', e.partyType);
  if (has('relative_physical_stats')) {
    const s = e.relativeStats[String(d.relative_physical_stats)];
    if (s) parts.push({ text: s }); else generic('relative_physical_stats');
  }
  if (has('trade_species')) ref('trade_species', e.tradeSpecies);
  if (d.needs_multiplayer === true) parts.push({ text: e.multiplayer });
  else if (has('needs_multiplayer')) generic('needs_multiplayer');
  if (d.near_special_rock === true) parts.push({ text: e.specialRock });
  else if (has('near_special_rock')) generic('near_special_rock');
  if (has('required_pokemon_form') && !(isRef(d.required_pokemon_form) && d.required_pokemon_form.name === ctx.fromSlug)) {
    ref('required_pokemon_form', e.requiredForm);
  }
  if (has('evolved_pokemon_form') && !(isRef(d.evolved_pokemon_form) && d.evolved_pokemon_form.name === ctx.toSlug)) {
    ref('evolved_pokemon_form', e.evolvedForm);
  }
  if (has('used_move')) {
    const template = has('min_move_count') ? e.usedMoveTimes(Number(d.min_move_count)) : e.usedMove;
    ref('used_move', template);
  } else if (has('min_move_count')) generic('min_move_count');
  if (has('min_steps')) parts.push({ text: e.minSteps(Number(d.min_steps)) });
  if (has('min_damage_taken')) parts.push({ text: e.minDamage(Number(d.min_damage_taken)) });
  if (has('allowed_natures')) parts.push({ text: e.natures(valueText(d.allowed_natures)) });
  if (has('condition_expression')) parts.push({ text: e.condition(String(d.condition_expression)) });

  // Cualquier otro campo no vacío: etiqueta genérica (RF-POK-8).
  for (const k of Object.keys(raw)) {
    if (!KNOWN.has(k) && has(k)) generic(k);
  }
  return parts;
}

/** Texto plano de una parte (tests, aria-label); `label` da el nombre de la referencia. */
export function partToString(p: Part, label: (ref: NamedAPIResource) => string = (r) => formatSlug(r.name)): string {
  if ('text' in p) return p.text;
  return p.template.replace('{}', p.fallback ?? label(p.ref));
}

export interface EvoContext {
  location: NamedAPIResource<'location'> | null;
  versionGroup: NamedAPIResource<'version-group'> | null;
}
export interface EvoAlternative {
  parts: Part[];
  contexts: EvoContext[];
  isDefault: boolean;
  /** ID de grupo de versiones más alto de la alternativa (−1 si no hay). */
  topVersionGroupId: number;
}

const vgId = (d: EvolutionDetail): number => (d.version_group ? parseResourceUrl(d.version_group.url)?.id ?? -1 : -1);

/**
 * Agrupa los detalles de una arista por firma (partes sin `version_group`, `is_default` ni `location`).
 * Cada alternativa lleva sus contextos ("{lugar} ({grupo})" o el grupo) en orden de ID de grupo;
 * si todos comparten lugar, este pasa a las partes. Orden: la de `is_default` y después por el grupo más alto.
 */
export function groupEvolutionDetails(details: readonly EvolutionDetail[], fromSlug: string, toSlug: string): EvoAlternative[] {
  const groups = new Map<string, { parts: Part[]; details: EvolutionDetail[] }>();
  for (const d of details) {
    const parts = describeEvolutionDetail(d, { fromSlug, toSlug, omitLocation: true });
    const sig = JSON.stringify(parts);
    const g = groups.get(sig);
    if (g) g.details.push(d);
    else groups.set(sig, { parts, details: [d] });
  }
  const alts: EvoAlternative[] = [];
  for (const { parts, details: list } of groups.values()) {
    const sorted = [...list].sort((a, b) => vgId(a) - vgId(b));
    const first = sorted[0]?.location ?? null;
    const samePlace = first !== null && sorted.every((d) => d.location?.name === first.name);
    const outParts = samePlace ? [...parts, { ref: first, template: es.evo.location } as Part] : parts;
    const contexts: EvoContext[] = [];
    const seen = new Set<string>();
    for (const d of sorted) {
      const c: EvoContext = { location: samePlace ? null : d.location ?? null, versionGroup: d.version_group ?? null };
      const key = `${c.location?.name ?? ''}|${c.versionGroup?.name ?? ''}`;
      if (key === '|' || seen.has(key)) continue;
      seen.add(key);
      contexts.push(c);
    }
    alts.push({
      parts: outParts,
      contexts,
      isDefault: list.some((d) => d.is_default === true),
      topVersionGroupId: Math.max(-1, ...list.map(vgId)),
    });
  }
  return alts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => (Number(y.a.isDefault) - Number(x.a.isDefault)) || (y.a.topVersionGroupId - x.a.topVersionGroupId) || (x.i - y.i))
    .map((x) => x.a);
}

export const MAX_VISIBLE_ALTERNATIVES = 3;

/** Máximo 3 alternativas visibles; el resto tras "+N más". */
export function visibleAlternatives(alts: readonly EvoAlternative[], expanded = false): {
  shown: EvoAlternative[]; hidden: number; moreLabel: string | null;
} {
  if (expanded || alts.length <= MAX_VISIBLE_ALTERNATIVES) return { shown: [...alts], hidden: 0, moreLabel: null };
  const hidden = alts.length - MAX_VISIBLE_ALTERNATIVES;
  return { shown: alts.slice(0, MAX_VISIBLE_ALTERNATIVES), hidden, moreLabel: es.app.moreAlternatives(hidden) };
}
