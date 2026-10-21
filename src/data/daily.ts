// Elemento del día (§10.9): FNV-1a de la fecha local. Puro.

/** FNV-1a de 32 bits (sin signo) sobre las unidades UTF-16 de `str`. */
export function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Fecha local como 'YYYY-MM-DD' (getFullYear/getMonth/getDate). */
export function localDateKey(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Índice estable durante todo el día local; -1 si la lista está vacía. */
export function dailyIndex(date: Date, length: number): number {
  if (!Number.isInteger(length) || length <= 0) return -1;
  return fnv1a32(localDateKey(date)) % length;
}
