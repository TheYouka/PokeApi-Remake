// Conectividad (§9, §18): 'online' | 'offline'. Nada de window/navigator al importar (P-12).
import { es } from '../i18n/es';
import { addNotification } from './notifications';
import { createStore } from './store';

export type Connectivity = 'online' | 'offline';
export const connectivity = createStore<Connectivity>('online');

const FAILURE_WINDOW_MS = 10_000;
let failures: number[] = [];

function goOffline(): void {
  if (connectivity.get() === 'offline') return;
  connectivity.set('offline');
  addNotification({ kind: 'offline', title: es.notif.offline });
}
function goOnline(): void {
  failures = [];
  if (connectivity.get() === 'online') return;
  connectivity.set('online');
  addNotification({ kind: 'online', title: es.notif.online });
}

/** `network-failure` del cliente: 2 fallos en 10 s → offline hasta el siguiente éxito o el evento `online`. */
export function reportNetworkFailure(now: number = Date.now()): void {
  failures = [...failures.filter((t) => now - t < FAILURE_WINDOW_MS), now];
  if (failures.length >= 2) goOffline();
}

/** Una respuesta de red (cualquier estado HTTP) demuestra que hay conexión. */
export function reportSuccess(): void {
  goOnline();
}

/** Registra los eventos `online`/`offline`; lo llama main.tsx. Devuelve la limpieza. */
export function initConnectivity(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (typeof navigator !== 'undefined' && navigator.onLine === false) goOffline();
  const onOnline = () => goOnline();
  const onOffline = () => goOffline();
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
