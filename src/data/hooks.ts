// Hooks base de datos (§5.3).
import { useQueries, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState, type RefObject } from 'react';
import { formatSlug, pickName } from '../api/localize';
import type { Priority } from '../api/limiter';
import type { ResourceKey } from '../api/resources';
import type { APIResource, Name, NamedAPIResource } from '../api/types/common';
import { parseResourceUrl, type IdOrName } from '../api/urls';
import { summaryOf, type LabelMode, type SummaryCtx } from '../registry/resources';
import { track } from '../state/achievements';
import { settings, type KnownLang } from '../state/settings';
import { useStore } from '../state/store';
import { listAllQuery, refQuery, resourceQuery } from './queries';

export const useDataLang = (): KnownLang => useStore(settings, (s) => s.dataLang);

/** Recurso por ID o nombre ya validado (high). */
export const useResource = <K extends ResourceKey>(r: K, id: IdOrName) => useQuery(resourceQuery(r, id));

const NO_REF: NamedAPIResource = { name: '', url: '' };

/** Datos de una referencia (low por defecto). Con `ref` null la consulta queda deshabilitada. */
export function useRefData<K extends ResourceKey>(
  ref: NamedAPIResource<K> | APIResource<K> | null,
  { enabled = true, priority = 'low' }: { enabled?: boolean; priority?: Priority } = {},
) {
  return useQuery({ ...refQuery<K>(ref ?? (NO_REF as NamedAPIResource<K>), priority), enabled: enabled && ref !== null });
}

export const useListAll = <K extends ResourceKey>(r: K, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ ...listAllQuery(r), enabled });

/** Una visita a la lista de un recurso (lo llaman ResourceListScreen y PokedexScreen al montar). */
export function useListVisit(key: ResourceKey): void {
  useEffect(() => {
    track({ type: 'resource-list-visited', resource: key });
  }, [key]);
}

/**
 * `true` cuando el elemento lleva `dwellMs` dentro del viewport ampliado por `rootMargin`.
 * Una vez visible se queda en `true`. Sin IntersectionObserver devuelve `true`.
 */
export function useInViewDwell(
  elRef: RefObject<Element | null>,
  { rootMargin = '200px', dwellMs = 150 }: { rootMargin?: string; dwellMs?: number } = {},
): boolean {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen) return;
    const el = elRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      if (visible && timer === null) {
        timer = setTimeout(() => { setSeen(true); io.disconnect(); }, dwellMs);
      } else if (!visible && timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }, { rootMargin });
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer !== null) clearTimeout(timer);
    };
  }, [seen, elRef, rootMargin, dwellMs]);
  return seen;
}

// ------------------------------------------------------------------ etiquetas localizadas

export interface LocalizedLabel { text: string; lang: string | null; loading: boolean }

const namesOf = (d: unknown): Name[] | undefined => {
  const names = (d as { names?: unknown } | undefined)?.names;
  return Array.isArray(names) ? (names as Name[]) : undefined;
};

/**
 * Nombre localizado de una referencia SOLO si ya está en la caché de React Query (por ID o por
 * nombre; para `pokemon` ≤ 10000 también la especie con el mismo ID). Nunca dispara peticiones.
 */
export function cachedLocalizedName(qc: QueryClient, ref: NamedAPIResource | APIResource, lang: string): { text: string; lang: string } | null {
  const p = parseResourceUrl(ref.url);
  if (!p) return null;
  const name = 'name' in ref ? ref.name : null;
  const keys: unknown[][] = [['pokeapi', p.resource, String(p.id)]];
  if (name) keys.push(['pokeapi', p.resource, name]);
  if (p.resource === 'pokemon' && p.id >= 1 && p.id <= 10000) keys.push(['pokeapi', 'pokemon-species', String(p.id)]);
  for (const key of keys) {
    const names = namesOf(qc.getQueryData(key));
    if (names) {
      const l = pickName(names, lang, name ?? '');
      if (l.lang !== null) return { text: l.text, lang: l.lang };
    }
  }
  return null;
}

/** Contexto síncrono de `summary` (§7.1): etiquetas de la caché o slug formateado. */
export function summaryCtx(qc: QueryClient, lang: string): SummaryCtx {
  return { lang, label: (ref) => cachedLocalizedName(qc, ref, lang)?.text ?? formatSlug(ref.name) };
}

/**
 * Etiqueta según la política del registro (§7.1):
 * - `fetch`: pide el recurso (si `enabled`, normalmente "visible") y usa pickName.
 * - `slug`: no pide nada; formatSlug, o el nombre localizado si ya está en caché (oportunista).
 * - `summary`: pide el detalle y aplica `summary(detail, ctx)` del registro.
 * - `versions`: une los nombres localizados de las versiones de un version-group.
 */
export function useLocalizedLabel(
  ref: NamedAPIResource | APIResource | null,
  mode: LabelMode,
  { enabled = true }: { enabled?: boolean } = {},
): LocalizedLabel {
  const lang = useDataLang();
  const qc = useQueryClient();
  const parsed = ref ? parseResourceUrl(ref.url) : null;
  const slug = ref && 'name' in ref ? ref.name : '';
  const fallback = parsed && slug === '' ? `#${parsed.id}` : formatSlug(slug);
  const wantsDetail = mode !== 'slug' && enabled && parsed !== null;

  const detail = useQuery({ ...refQuery(ref ?? NO_REF, 'low'), enabled: wantsDetail });
  const versionRefs = mode === 'versions' && wantsDetail
    ? ((detail.data as { versions?: NamedAPIResource<'version'>[] } | undefined)?.versions ?? [])
    : [];
  const versions = useQueries({
    queries: versionRefs.map((v) => ({ ...refQuery(v, 'low') })),
  });

  if (!ref) return { text: '', lang: null, loading: false };
  if (!parsed) return { text: fallback, lang: null, loading: false };

  switch (mode) {
    case 'slug': {
      const cached = cachedLocalizedName(qc, ref, lang);
      return cached ? { ...cached, loading: false } : { text: fallback, lang: null, loading: false };
    }
    case 'fetch': {
      const names = namesOf(detail.data);
      if (names) {
        const l = pickName(names, lang, slug);
        return { text: l.text, lang: l.lang, loading: false };
      }
      return { text: fallback, lang: null, loading: wantsDetail && detail.isPending };
    }
    case 'summary': {
      const fn = summaryOf(parsed.resource);
      if (detail.data !== undefined && fn) return { text: fn(detail.data, summaryCtx(qc, lang)), lang, loading: false };
      return { text: fallback, lang: null, loading: wantsDetail && detail.isPending };
    }
    case 'versions': {
      if (versionRefs.length === 0 || versions.some((q) => q.isPending)) {
        return { text: fallback, lang: null, loading: wantsDetail && (detail.isPending || versions.some((q) => q.isPending)) };
      }
      const parts = versionRefs.map((v, i) => pickName(namesOf(versions[i]?.data), lang, v.name));
      const used = parts.find((p) => p.lang !== null)?.lang ?? null;
      return { text: parts.map((p) => p.text).join(' / '), lang: used, loading: false };
    }
  }
}
