// Stores externos mínimos (§9). Sin DOM: se prueban en Node.
import { useRef, useSyncExternalStore } from 'react';

export interface Store<T> {
  get(): T;
  set(next: T | ((p: T) => T)): void;
  subscribe(fn: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      const v = typeof next === 'function' ? (next as (p: T) => T)(value) : next;
      if (Object.is(v, value)) return;
      value = v;
      for (const fn of [...listeners]) fn();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
  };
}

/**
 * Suscripción por selector. El resultado se memoriza mientras el estado no cambie, así que un
 * selector que construye un objeto nuevo no provoca bucles de render.
 */
export function useStore<T, S>(store: Store<T>, selector: (s: T) => S): S {
  const memo = useRef<{ state: T; selected: S } | null>(null);
  const getSnapshot = () => {
    const state = store.get();
    const m = memo.current;
    if (m && Object.is(m.state, state)) return m.selected;
    const selected = selector(state);
    if (m && Object.is(m.selected, selected)) {
      memo.current = { state, selected: m.selected };
      return m.selected;
    }
    memo.current = { state, selected };
    return selected;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
