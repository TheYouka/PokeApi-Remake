// Cálculos puros de Estadísticas y Gráficas (§13.8). Sin React ni DOM.

/** Un conjunto (color, grupo huevo, hábitat, tipo…) con los IDs de sus miembros. */
export interface CountSet { key: string; members: readonly number[]; extra?: number }
export interface Count { key: string; count: number }
export interface CountWithPercent extends Count { percent: number }

/**
 * Cuenta los miembros de cada conjunto. Con `filter` solo cuentan los IDs que estén en él (por
 * ejemplo, las especies de una generación). `extra` se suma tal cual (Pokémon creados).
 */
export function countBy(sets: readonly CountSet[], filter?: ReadonlySet<number> | null): Count[] {
  return sets.map((s) => {
    const base = filter ? s.members.reduce((n, id) => (filter.has(id) ? n + 1 : n), 0) : s.members.length;
    return { key: s.key, count: base + (s.extra ?? 0) };
  });
}

/**
 * Máximo de los conteos. Con empate devuelve todas las claves y la etiqueta unida con "y"
 * ("Azul y Rojo"; con tres o más: "Azul, Rojo y Verde"). Sin conteos o todo a 0 → null.
 */
export function mode(
  counts: readonly Count[],
  label: (key: string) => string = (k) => k,
  joiner = ' y ',
): { keys: string[]; label: string; count: number } | null {
  let max = 0;
  for (const c of counts) if (c.count > max) max = c.count;
  if (max <= 0) return null;
  const keys = counts.filter((c) => c.count === max).map((c) => c.key);
  const labels = keys.map(label);
  const text = labels.length <= 1
    ? (labels[0] ?? '')
    : `${labels.slice(0, -1).join(', ')}${joiner}${labels[labels.length - 1]!}`;
  return { keys, label: text, count: max };
}

/** Porcentaje de cada conteo sobre la suma total, redondeado a 1 decimal (la suma da ≈ 100). */
export function percentages(counts: readonly Count[]): CountWithPercent[] {
  const total = counts.reduce((s, c) => s + c.count, 0);
  return counts.map((c) => ({ ...c, percent: total > 0 ? Math.round((c.count / total) * 1000) / 10 : 0 }));
}
