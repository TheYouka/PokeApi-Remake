// Componente sin UI que conecta gamepad.ts al bus de acciones (decisión P-7).
import { useEffect } from 'react';
import { startGamepad } from './gamepad';

export function GamepadBridge(): null {
  useEffect(() => startGamepad(), []);
  return null;
}
