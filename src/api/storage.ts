/** Interfaz mínima compatible con `localStorage` (§4.5). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

/**
 * `localStorage` del navegador, o null si no existe o lanza al acceder (modo privado, SecurityError).
 * Orden fijo: primero `typeof window`, y solo después se lee `window.localStorage` (en Node 26 leer el
 * global `localStorage` ya emite ExperimentalWarning).
 */
export function browserLocalStorage(): KeyValueStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    const ls = window.localStorage;
    return ls ? ls : null;
  } catch {
    return null;
  }
}

/** Almacenamiento en memoria; con `quotaChars` simula `QuotaExceededError` (claves + valores). */
export function memoryStorage(quotaChars: number = Number.POSITIVE_INFINITY): KeyValueStorage {
  const map = new Map<string, string>();
  let used = 0;
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem(k, v) {
      const key = String(k);
      const value = String(v);
      const prev = map.get(key);
      const next = used - (prev === undefined ? 0 : key.length + prev.length) + key.length + value.length;
      if (next > quotaChars) {
        throw new DOMException(`Cuota de ${quotaChars} caracteres superada`, 'QuotaExceededError');
      }
      map.set(key, value);
      used = next;
    },
    removeItem(k) {
      const prev = map.get(k);
      if (prev === undefined) return;
      map.delete(k);
      used -= k.length + prev.length;
    },
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}
