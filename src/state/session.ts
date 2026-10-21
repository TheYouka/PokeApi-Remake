// Indicador de arranque (§9): valor en crudo '1' en sessionStorage, sin sobre.
// Solo se accede a sessionStorage al llamar, nunca al importar.
const KEY = 'pbx1:booted';
export const isBooted = (): boolean => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
export const markBooted = (): void => { try { sessionStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento: el arranque volverá a salir al recargar */ } };
