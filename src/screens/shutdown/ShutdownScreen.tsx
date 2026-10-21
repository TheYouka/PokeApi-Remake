// Apagar (§10.12, RF-UI-12): fundido a negro y "Muchas gracias por usar este programa." durante
// 2,5 s; después "Pulsa cualquier botón para encender" y cualquier entrada navega a '/?boot=1'
// (ShellLayout aplica el parámetro y fuerza el arranque).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { es } from '../../i18n/es';
import { useAction } from '../../nav/actions';
import { PokeballMark } from '../../ui/PokeballMark';
import styles from './ShutdownScreen.module.css';

const THANKS_MS = 2500;

export default function ShutdownScreen() {
  useDocumentTitle(es.shutdown.title);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const leaving = useRef(false);

  const powerOn = useCallback(() => {
    if (!ready || leaving.current) return;
    leaving.current = true;
    void navigate('/?boot=1', { replace: true });
  }, [ready, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), THANKS_MS);
    return () => clearTimeout(t);
  }, []);

  // Teclado y puntero: cualquier tecla o toque (también las que no son acciones).
  useEffect(() => {
    if (!ready) return;
    const on = () => powerOn();
    window.addEventListener('keydown', on, true);
    window.addEventListener('pointerdown', on, true);
    return () => {
      window.removeEventListener('keydown', on, true);
      window.removeEventListener('pointerdown', on, true);
    };
  }, [ready, powerOn]);

  // Mando (y teclas traducidas): la capa 1 atiende todo con 'any' mientras la pantalla está montada.
  useAction('any', () => { powerOn(); return true; }, 1);

  return (
    <div className={styles.screen} data-ready={ready ? '' : undefined}>
      <h1 className="sr-only" tabIndex={-1} data-focus-start="">{es.shutdown.title}</h1>
      <PokeballMark variant="outline" size={120} className={styles.mark} strokeWidth={2.5} />
      <p className={styles.thanks} role="status">{ready ? es.shutdown.powerOn : es.shutdown.thanks}</p>
    </div>
  );
}
