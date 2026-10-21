// Visitas recientes (§9): store 'pbx1:recent' v1, las últimas 12, la más reciente primero.
import { persistedStore } from './persist';

export const SPRITE_PREFIX = 'https://raw.githubusercontent.com/PokeAPI/';
export const MAX_RECENT = 12;

export interface RecentEntry {
  path: string;
  title: string;
  kind: 'pokemon' | 'resource' | 'screen';
  image?: string;
}

function validateEntry(raw: unknown): RecentEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.path !== 'string' || !r.path.startsWith('/') || r.path.startsWith('//') || r.path.length > 300) return null;
  if (typeof r.title !== 'string' || r.title === '' || r.title.length > 200) return null;
  if (r.kind !== 'pokemon' && r.kind !== 'resource' && r.kind !== 'screen') return null;
  const entry: RecentEntry = { path: r.path, title: r.title, kind: r.kind };
  if (typeof r.image === 'string' && r.image.startsWith(SPRITE_PREFIX)) entry.image = r.image;
  return entry;
}

export function validateRecent(raw: unknown): RecentEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const out: RecentEntry[] = [];
  for (const item of raw) {
    const e = validateEntry(item);
    if (e && !out.some((x) => x.path === e.path) && out.length < MAX_RECENT) out.push(e);
  }
  return out;
}

export const recent = persistedStore<RecentEntry[]>({
  key: 'pbx1:recent',
  version: 1,
  defaults: [],
  validate: validateRecent,
});

/** Añade (o sube al principio) una visita; una imagen fuera del prefijo de sprites se descarta. */
export function addRecent(entry: RecentEntry): void {
  const e = validateEntry(entry);
  if (!e) return;
  recent.set((list) => {
    const first = list[0];
    if (first && first.path === e.path && first.title === e.title && first.image === e.image) return list;
    return [e, ...list.filter((x) => x.path !== e.path)].slice(0, MAX_RECENT);
  });
}

export function clearRecent(): void {
  recent.set([]);
}
