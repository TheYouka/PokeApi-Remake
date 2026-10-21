// Secuencia de arranque (§10.5, RF-UI-1). 3,6 s: negro → la Pokébola se dibuja con stroke-dasharray →
// estallido de acento → relleno y "PokéBox One" → fundido. Movimiento reducido: marca estática 300 ms
// + fundido 600 ms (900 ms). Cualquier tecla, toque o acción de mando lo salta (fundido de 200 ms).
// Mantiene abierta la capa 5 con un handler 'any'. Al terminar: markBooted() y `boot-complete`
// (ÚNICO punto de disparo). `boot` suena en t = 0,4 s solo con el audio ya en 'running'.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { audioStatus, play } from '../../audio/sfx';
import { es } from '../../i18n/es';
import { openOverlayLayer, registerAction } from '../../nav/actions';
import { focusInitial } from '../../nav/focusEngine';
import { track } from '../../state/achievements';
import { bootActive } from '../../state/boot';
import { isReducedMotion } from '../../state/motion';
import { markBooted } from '../../state/session';
import { useStore } from '../../state/store';
import { PokeballMark } from '../../ui/PokeballMark';
import styles from './BootSequence.module.css';

const FULL_MS = 3600;
const REDUCED_MS = 900;
const SKIP_MS = 200;
const BOOT_SOUND_AT_MS = 400;

export function BootSequence() {
  const active = useStore(bootActive, (v) => v);
  return active ? <BootOverlay /> : null;
}

function BootOverlay() {
  const [reduced] = useState(isReducedMotion);
  const [skipping, setSkipping] = useState(false);
  const done = useRef(false);
  const skipRequested = useRef(false);
  const skipRef = useRef<HTMLButtonElement>(null);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    markBooted();
    track({ type: 'boot-complete' });               // "Primer encendido": único punto de disparo
    bootActive.set(false);
    requestAnimationFrame(() => { focusInitial(); });
  }, []);

  const skip = useCallback(() => {
    if (done.current || skipRequested.current) return;
    skipRequested.current = true;
    setSkipping(true);
    setTimeout(finish, SKIP_MS);
  }, [finish]);

  // Capa 5: el arranque consume todas las acciones (teclado, mando y pistas).
  useLayoutEffect(() => openOverlayLayer(5), []);
  useEffect(() => registerAction('any', () => { skip(); return true; }, 5), [skip]);

  // Cualquier tecla o toque (también las que no se traducen a acciones).
  useEffect(() => {
    const onInput = () => skip();
    window.addEventListener('keydown', onInput, true);
    window.addEventListener('pointerdown', onInput, true);
    return () => {
      window.removeEventListener('keydown', onInput, true);
      window.removeEventListener('pointerdown', onInput, true);
    };
  }, [skip]);

  // Línea de tiempo y sonido.
  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true });
    const end = setTimeout(finish, reduced ? REDUCED_MS : FULL_MS);
    const sound = reduced ? null : setTimeout(() => { if (audioStatus() === 'running') play('boot'); }, BOOT_SOUND_AT_MS);
    return () => {
      clearTimeout(end);
      if (sound !== null) clearTimeout(sound);
    };
  }, [finish, reduced]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={es.app.booting}
      data-reduced={reduced ? '' : undefined}
      data-skipping={skipping ? '' : undefined}
    >
      <div className={styles.stage}>
        <span className={styles.burst} aria-hidden="true" />
        <PokeballMark variant="filled" title={es.app.name} className={styles.mark} size={280} strokeWidth={3.2} />
        <p className={styles.word} aria-hidden="true">{es.app.name}</p>
      </div>
      <button ref={skipRef} type="button" className={styles.skip} data-sfx="none" onClick={skip}>
        {es.app.skipBoot}
      </button>
    </div>
  );
}
