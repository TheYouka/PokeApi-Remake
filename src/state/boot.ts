// ¿Se muestra la secuencia de arranque? (§6, §10.5). Lo decide main.tsx con ?boot= e isBooted(), y
// también ShellLayout cuando una navegación interna llega con ?boot= (Apagar → '/?boot=1').
// `boot-complete` NO se dispara aquí: su único punto de disparo es BootSequence.
import { isBooted, markBooted } from './session';
import { createStore } from './store';

export const bootActive = createStore<boolean>(false);

/** '1' fuerza el arranque; '0' marca la sesión sin mostrarlo; null → solo si !isBooted(). */
export function decideBoot(param: '1' | '0' | null): void {
  if (param === '1') bootActive.set(true);
  else if (param === '0') { markBooted(); bootActive.set(false); }
  else bootActive.set(!isBooted());
}
