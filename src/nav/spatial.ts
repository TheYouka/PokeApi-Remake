// Algoritmo espacial puro (§11.3).
export type Dir = 'up' | 'down' | 'left' | 'right';
export interface R { left: number; top: number; right: number; bottom: number }

const cx = (r: R) => (r.left + r.right) / 2;
const cy = (r: R) => (r.top + r.bottom) / 2;

/** Distancia entre bordes en un eje (0 si se solapan). */
const axisGap = (a1: number, a2: number, b1: number, b2: number) => Math.max(0, b1 - a2, a1 - b2);

/**
 * Elige el vecino en la dirección `dir`. Válido: su centro está más allá que el de origen por
 * más de 1 px. score = primaryGap + 2·orthoGap; empate → distancia euclídea entre centros →
 * orden del array (orden del DOM). Sin candidatos válidos → null.
 */
export function pickNext(from: R, candidates: { id: string; rect: R }[], dir: Dir): string | null {
  const fx = cx(from);
  const fy = cy(from);
  let best: { id: string; score: number; dist: number } | null = null;
  for (const c of candidates) {
    const r = c.rect;
    const x = cx(r);
    const y = cy(r);
    let valid: boolean;
    let primary: number;
    let ortho: number;
    switch (dir) {
      case 'right':
        valid = x - fx > 1; primary = Math.max(0, r.left - from.right); ortho = axisGap(from.top, from.bottom, r.top, r.bottom); break;
      case 'left':
        valid = fx - x > 1; primary = Math.max(0, from.left - r.right); ortho = axisGap(from.top, from.bottom, r.top, r.bottom); break;
      case 'down':
        valid = y - fy > 1; primary = Math.max(0, r.top - from.bottom); ortho = axisGap(from.left, from.right, r.left, r.right); break;
      case 'up':
        valid = fy - y > 1; primary = Math.max(0, from.top - r.bottom); ortho = axisGap(from.left, from.right, r.left, r.right); break;
    }
    if (!valid) continue;
    const score = primary + 2 * ortho;
    const dist = Math.hypot(x - fx, y - fy);
    if (!best || score < best.score || (score === best.score && dist < best.dist)) best = { id: c.id, score, dist };
  }
  return best ? best.id : null;
}
