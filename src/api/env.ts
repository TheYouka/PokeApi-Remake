// Acceso protegido al entorno: nada se lee al importar, solo al llamar (RF-API-7, AC-9).

/** true solo si el navegador dice explícitamente que no hay conexión. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Ejecuta `fn` cuando el hilo esté libre (`requestIdleCallback`, o `setTimeout(0)` si no existe). */
export function scheduleIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn());
  } else {
    setTimeout(fn, 0);
  }
}

/** Registra `fn` en `pagehide`; no hace nada fuera del navegador. */
export function onPageHide(fn: () => void): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('pagehide', () => fn());
}
