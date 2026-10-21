import type { Description, Effect, FlavorText, Name, NamedAPIResource, VersionGroupFlavorText } from './types/common';

/** Texto elegido y código de idioma de la PokeAPI usado (null si es el slug formateado). */
export interface Localized { text: string; lang: string | null }
export interface LocalizedFlavor extends Localized {
  /** Versión (o grupo de versiones) de la entrada elegida. */
  version: string | null;
  /** true si se pidió una versión sin entradas en la cadena de idiomas y se usó la más reciente. */
  versionFallback: boolean;
}
export interface LocalizedEffect extends Localized {
  /** `short_effect` con `$effect_chance` sustituido, si la entrada lo trae. */
  short: string | null;
}

/** `'mr-mime'` → `'Mr Mime'`: separa por `-` y pone mayúscula inicial a cada palabra (§14). */
export function formatSlug(slug: string): string {
  return slug
    .split('-')
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** `[lang, ('es' si lang === 'es-419'), 'en']` sin duplicados. */
export function languageChain(lang: string): string[] {
  const chain = [lang];
  if (lang === 'es-419') chain.push('es');
  chain.push('en');
  return [...new Set(chain)];
}

interface WithLanguage { language: NamedAPIResource<'language'> }

/** Primera entrada de la cadena de idiomas (en orden de la cadena), o null. */
function pickByChain<T extends WithLanguage>(entries: readonly T[] | undefined, lang: string): T | null {
  if (!entries || entries.length === 0) return null;
  for (const code of languageChain(lang)) {
    const hit = entries.find((e) => e.language.name === code);
    if (hit) return hit;
  }
  return null;
}

export function pickName(names: Name[] | undefined, lang: string, slug: string): Localized {
  const hit = pickByChain(names, lang);
  if (!hit || hit.name.trim() === '') return { text: formatSlug(slug), lang: null };
  // Algunos nombres de respaldo de la API vienen como identificadores ("Usable_in_battle"): '_' → espacio.
  const text = hit.language.name === lang ? hit.name : hit.name.replace(/_+/g, ' ').trim();
  return { text, lang: hit.language.name };
}

export function pickDescription(entries: Description[] | undefined, lang: string): Localized | null {
  const hit = pickByChain(entries, lang);
  return hit ? { text: hit.description, lang: hit.language.name } : null;
}

export function pickGenus(
  entries: { genus: string; language: NamedAPIResource<'language'> }[] | undefined,
  lang: string,
): Localized | null {
  const hit = pickByChain(entries, lang);
  return hit ? { text: hit.genus, lang: hit.language.name } : null;
}

/** Entradas de flavor text de cualquier recurso (por versión o por grupo de versiones). */
export type FlavorEntry =
  | FlavorText
  | VersionGroupFlavorText
  | { flavor_text: string; language: NamedAPIResource<'language'>; version_group: NamedAPIResource<'version-group'> };

const flavorText = (e: FlavorEntry): string => ('flavor_text' in e ? e.flavor_text : e.text);
const flavorVersion = (e: FlavorEntry): string | null => {
  if ('version' in e && e.version) return e.version.name;
  if ('version_group' in e) return e.version_group.name;
  return null;
};

/**
 * Filtra primero por versión si se pide y después aplica la cadena de idiomas. Si la versión
 * pedida no tiene ninguna entrada en la cadena, devuelve la más reciente con `versionFallback`.
 */
export function pickFlavor(
  entries: readonly FlavorEntry[] | undefined,
  lang: string,
  opts: { version?: string } = {},
): LocalizedFlavor | null {
  if (!entries || entries.length === 0) return null;
  const chain = languageChain(lang);
  const latestIn = (list: readonly FlavorEntry[]): FlavorEntry | null => {
    for (const code of chain) {
      const inLang = list.filter((e) => e.language.name === code);
      const last = inLang[inLang.length - 1];
      if (last) return last;
    }
    return null;
  };
  let hit: FlavorEntry | null = null;
  let versionFallback = false;
  if (opts.version !== undefined) {
    hit = latestIn(entries.filter((e) => flavorVersion(e) === opts.version));
    if (!hit) versionFallback = true;
  }
  hit ??= latestIn(entries);
  if (!hit) return null;
  return {
    text: cleanFlavor(flavorText(hit)),
    lang: hit.language.name,
    version: flavorVersion(hit),
    versionFallback,
  };
}

export function pickEffect(
  entries: readonly (Effect & { short_effect?: string })[] | undefined,
  lang: string,
  effectChance?: number | null,
): LocalizedEffect | null {
  const hit = pickByChain(entries, lang);
  if (!hit) return null;
  const chance = effectChance ?? null;
  return {
    text: substituteEffectChance(hit.effect, chance),
    lang: hit.language.name,
    short: hit.short_effect === undefined ? null : substituteEffectChance(hit.short_effect, chance),
  };
}

/** `\n`, `\f`, `\u00ad` y espacios múltiples → un espacio; trim. */
export function cleanFlavor(s: string): string {
  return s.replace(/[\s\f\u00ad]+/g, ' ').trim();
}

/**
 * Sintaxis de lista de definición de algunos efectos (objetos): "Término\n:   Definición" →
 * "Término: Definición", y sin la sangría de las líneas siguientes.
 */
export function normalizeEffectText(s: string): string {
  return s.replace(/\n:\s+/g, ': ').replace(/\n[ \t]+/g, '\n');
}

/** `$effect_chance` → `"30"`, o `"—"` si la probabilidad es null. */
export function substituteEffectChance(s: string, chance: number | null): string {
  return s.replace(/\$effect_chance/g, chance === null ? '—' : String(chance));
}

const BCP47: Record<string, string> = {
  'ja-hrkt': 'ja',
  'ja-roma': 'ja-Latn',
  'zh-hant': 'zh-Hant',
  'zh-hans': 'zh-Hans',
  'pt-br': 'pt-BR',
};
/** Código de idioma de la PokeAPI → etiqueta BCP 47 para el atributo `lang`. */
export function toBcp47(pokeapiLang: string): string {
  return Object.hasOwn(BCP47, pokeapiLang) ? BCP47[pokeapiLang]! : pokeapiLang;
}
