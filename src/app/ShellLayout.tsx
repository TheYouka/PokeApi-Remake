// Shell de consola: árbol LITERAL de §8.1. #app-root queda inerte con un overlay abierto o durante
// el arranque; HintBar y Toasts van fuera (se pueden pulsar / nunca inertes). Un único listener
// `click` en captura sobre #app-root y #overlay-root pone el sonido `select` (§12).
import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router';
import { play } from '../audio/sfx';
import { es } from '../i18n/es';
// El componente <FocusEngine/> vive en nav/FocusEngineHost.tsx: en sistemas de archivos sin distinción
// de mayúsculas (Windows, macOS) 'nav/FocusEngine' resolvería a nav/focusEngine.ts.
import { FocusEngine } from '../nav/FocusEngineHost';
import { GamepadBridge } from '../nav/GamepadBridge';
import { BootSequence } from '../screens/boot/BootSequence';
import { bootActive, decideBoot } from '../state/boot';
import { useStore } from '../state/store';
import { parseBootParam } from '../state/validation';
import { Background } from '../ui/Background';
import { GuidePanel } from '../ui/GuidePanel';
import { HintBar } from '../ui/HintBar';
import { NavigationProgress } from '../ui/NavigationProgress';
import { OfflineBanner } from '../ui/OfflineBanner';
import { useOverlayOpen } from '../ui/Overlay';
import { Toasts } from '../ui/Toasts';
import { TopBar } from '../ui/TopBar';
import { RouteAnnouncer } from './RouteAnnouncer';
import styles from './ShellLayout.module.css';

const SELECTABLE = 'a[href], button, [data-nav]';

function onClickCapture(e: MouseEvent): void {
  const target = e.target instanceof Element ? e.target.closest(SELECTABLE) : null;
  if (!target) return;
  if (target.getAttribute('data-sfx') === 'none') return;
  if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return;
  play('select');
}

/** Navegaciones internas con ?boot= (Apagar → '/?boot=1'): se aplican y se quitan de la URL. */
function useBootParam(): void {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('boot')) return;
    decideBoot(parseBootParam(params.get('boot')));
    params.delete('boot');
    const search = params.toString();
    void navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash }, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate]);
}

export function ShellLayout() {
  const booting = useStore(bootActive, (v) => v);
  const overlayOpen = useOverlayOpen();
  const appRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  useBootParam();

  useEffect(() => {
    const roots = [appRef.current, overlayRef.current].filter((x): x is HTMLDivElement => x !== null);
    for (const r of roots) r.addEventListener('click', onClickCapture, true);
    return () => { for (const r of roots) r.removeEventListener('click', onClickCapture, true); };
  }, []);

  return (
    <>
      <BootSequence />
      <div id="app-root" ref={appRef} className={styles.appRoot} inert={overlayOpen || booting}>
        <Background />
        <a className="skip-link" href="#main">{es.app.skipLink}</a>
        <TopBar />
        <OfflineBanner />
        <NavigationProgress />
        <main id="main" tabIndex={-1} className={styles.main}>
          <Outlet />
        </main>
      </div>
      <div id="overlay-root" ref={overlayRef} />
      <HintBar inert={booting} />
      <Toasts />
      <RouteAnnouncer />
      <FocusEngine />
      <GamepadBridge />
      <GuidePanel />
      <ScrollRestoration />
    </>
  );
}
