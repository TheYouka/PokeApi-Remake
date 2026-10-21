// Modo de movimiento efectivo ('full' | 'reduced'): ajuste propio o prefers-reduced-motion.
// Lo calcula y lo refleja en html[data-motion] main.tsx; aquí solo vive el valor (sin DOM al importar).
import { createStore, useStore } from './store';

export type MotionMode = 'full' | 'reduced';
export const motion = createStore<MotionMode>('full');

export const useReducedMotion = (): boolean => useStore(motion, (m) => m === 'reduced');
export const isReducedMotion = (): boolean => motion.get() === 'reduced';

// prefers-reduced-motion del sistema (Ajustes muestra el interruptor activado y deshabilitado).
export const systemReducedMotion = createStore<boolean>(false);
export const useSystemReducedMotion = (): boolean => useStore(systemReducedMotion, (v) => v);
