// Store persistido en localStorage con sobre {v, d}, validado y tolerante (§9, RF-SET-3).
import { browserLocalStorage, type KeyValueStorage } from '../api/storage';
import { es } from '../i18n/es';
import { notifyOnce } from './notifications';
import { createStore, type Store } from './store';

export interface PersistedStore<T> extends Store<T> {
  /** Vuelve a `defaults` y borra la clave (la siguiente escritura vuelve a crear el sobre). */
  reset(): void;
}

export interface PersistOptions<T> {
  key: string;
  version: number;
  defaults: T;
  validate: (raw: unknown) => T | null;
  /** Por defecto browserLocalStorage(): null en Node → solo memoria. */
  storage?: KeyValueStorage | null;
}

/** Lee el sobre; cualquier problema → null (se usan los valores por defecto sin escribir). */
function readEnvelope<T>(storage: KeyValueStorage | null, key: string, version: number, validate: (raw: unknown) => T | null): T | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    const p: unknown = JSON.parse(raw);
    return typeof p === 'object' && p !== null && (p as { v?: unknown }).v === version
      ? validate((p as { d?: unknown }).d)
      : null;
  } catch {
    return null;
  }
}

export function persistedStore<T>(o: PersistOptions<T>): PersistedStore<T> {
  const storage = o.storage === undefined ? browserLocalStorage() : o.storage;
  const inner = createStore<T>(readEnvelope(storage, o.key, o.version, o.validate) ?? o.defaults);

  const write = (value: T) => {
    if (!storage) return;
    try {
      storage.setItem(o.key, JSON.stringify({ v: o.version, d: value }));
    } catch {
      // El estado sigue en memoria; un único aviso por sesión para todos los stores.
      notifyOnce('storage-write', { kind: 'storage', title: es.notif.storageFailed });
    }
  };

  return {
    get: inner.get,
    subscribe: inner.subscribe,
    set(next) {
      const prev = inner.get();
      inner.set(next);
      const value = inner.get();
      if (!Object.is(prev, value)) write(value);
    },
    reset() {
      inner.set(o.defaults);
      if (!storage) return;
      try { storage.removeItem(o.key); } catch { /* sin almacenamiento: solo memoria */ }
    },
  };
}
