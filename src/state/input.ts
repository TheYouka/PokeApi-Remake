// Último dispositivo de entrada (§9), reflejado en html[data-input] por initInputTracking().
import { createStore } from './store';

export type InputDevice = 'keyboard' | 'pointer' | 'touch' | 'gamepad';
export const input = createStore<InputDevice>('keyboard');

export function setInput(device: InputDevice): void {
  input.set(device);
}

/** Refleja el store en `<html data-input>`; lo llama main.tsx. Devuelve la limpieza. */
export function initInputTracking(): () => void {
  if (typeof document === 'undefined') return () => {};
  const apply = () => { document.documentElement.dataset.input = input.get(); };
  apply();
  return input.subscribe(apply);
}
