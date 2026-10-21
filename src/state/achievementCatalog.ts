// Catálogo de logros (§10.10): 22 logros, 1000 G en total. Nombres y textos en i18n/es.ts.
import { es } from '../i18n/es';

export const ACHIEVEMENTS = [
  { id: 'primer-encendido', points: 10 },
  { id: 'entrenador-novato', points: 10 },
  { id: 'investigador', points: 30 },
  { id: 'profesor', points: 80 },
  { id: 'maestro-tipos', points: 40 },
  { id: 'trotamundos', points: 80 },
  { id: 'rivales', points: 30 },
  { id: 'golpe-suerte', points: 40 },
  { id: 'brillante', points: 20 },
  { id: 'melomano', points: 20 },
  { id: 'eeveelucion', points: 40 },
  { id: 'botanico', points: 50 },
  { id: 'coleccionista', points: 50 },
  { id: 'enciclopedia', points: 50 },
  { id: 'poliglota', points: 30 },
  { id: 'a-mi-estilo', points: 20 },
  { id: 'mando-en-mano', points: 50 },
  { id: 'nostalgia', points: 50 },
  { id: 'explorador-total', points: 200 },
  { id: 'creador', points: 50 },
  { id: 'analista', points: 40 },
  { id: 'guia-bolsillo', points: 10 },
] as const;

export type AchId = (typeof ACHIEVEMENTS)[number]['id'];
export const ACH_IDS: readonly AchId[] = ACHIEVEMENTS.map((a) => a.id);
export const TOTAL_POINTS = ACHIEVEMENTS.reduce((s, a) => s + a.points, 0);

const POINTS = new Map<string, number>(ACHIEVEMENTS.map((a) => [a.id, a.points]));
export const isAchId = (v: unknown): v is AchId => typeof v === 'string' && POINTS.has(v);
export const pointsOf = (id: AchId): number => POINTS.get(id) ?? 0;

export interface AchievementInfo { id: AchId; points: number; name: string; description: string; hint: string }
export function achievementInfo(id: AchId): AchievementInfo {
  const t = es.ach.items[id];
  return { id, points: pointsOf(id), name: t.name, description: t.description, hint: t.hint };
}

/** Objetivo numérico de los logros con contador (para "Investigador 4/10"). */
export const ACH_TARGETS: Partial<Record<AchId, number>> = {
  'investigador': 10,
  'profesor': 50,
  'golpe-suerte': 5,
  'botanico': 10,
  'coleccionista': 10,
  'enciclopedia': 10,
  'explorador-total': 50,
};
