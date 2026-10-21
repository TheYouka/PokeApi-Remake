// Notificaciones en memoria (§9): las últimas 30, la más reciente primero.
import { createStore } from './store';

export type NotificationKind = 'achievement' | 'offline' | 'online' | 'gamepad' | 'storage' | 'info';
export interface AppNotification {
  id: number;
  kind: NotificationKind;
  title: string;
  body?: string;
  /** Fecha ISO. */
  at: string;
  read: boolean;
}

export const MAX_NOTIFICATIONS = 30;
export const notifications = createStore<AppNotification[]>([]);

let nextId = 1;
export function addNotification(n: { kind: NotificationKind; title: string; body?: string }, now: number = Date.now()): number {
  const id = nextId++;
  const entry: AppNotification = { id, kind: n.kind, title: n.title, at: new Date(now).toISOString(), read: false };
  if (n.body !== undefined) entry.body = n.body;
  notifications.set((list) => [entry, ...list].slice(0, MAX_NOTIFICATIONS));
  return id;
}

export function markAllRead(): void {
  notifications.set((list) => (list.some((n) => !n.read) ? list.map((n) => (n.read ? n : { ...n, read: true })) : list));
}

export const unreadCount = (list: readonly AppNotification[]): number => list.filter((n) => !n.read).length;

export function clearNotifications(): void {
  notifications.set([]);
}

/** Notificación que solo aparece una vez por sesión (por clave). */
const onceKeys = new Set<string>();
export function notifyOnce(key: string, n: { kind: NotificationKind; title: string; body?: string }): void {
  if (onceKeys.has(key)) return;
  onceKeys.add(key);
  addNotification(n);
}
