// Cola FIFO de toasts pendientes de mostrar (§9, §10.10).
import type { IconName } from '../ui/icons';
import type { AchId } from './achievementCatalog';
import { createStore } from './store';

export type Toast =
  | { kind: 'achievement'; id: AchId }
  | { kind: 'info'; text: string; icon: IconName };

export const toasts = createStore<Toast[]>([]);

export function enqueueToast(t: Toast): void {
  toasts.set((q) => [...q, t]);
}

/** Saca el primero de la cola (lo llama `Toasts` al empezar a mostrarlo). */
export function dequeueToast(): Toast | null {
  const [first, ...rest] = toasts.get();
  if (!first) return null;
  toasts.set(rest);
  return first;
}

export function clearToasts(): void {
  toasts.set([]);
}
