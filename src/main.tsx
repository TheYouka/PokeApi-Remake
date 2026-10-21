// Punto de entrada definitivo (§6, §10.1, decisión P-12).
// ANTES del primer render: data-theme, data-motion, data-input y --accent/--on-accent en <html>
// (sin parpadeo), ?boot= leído y quitado de la URL, e init*() de conectividad, audio y entrada.
import '@fontsource-variable/inter';
import './ui/styles/tokens.css';
import './ui/styles/themes.css';
import './ui/styles/base.css';
import './ui/styles/motion.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { scheduleIdle } from './api/env';
import { App } from './app/App';
import { preloadRoute } from './app/preload';
import { initAudioUnlock } from './audio/sfx';
import { decideBoot } from './state/boot';
import { initConnectivity } from './state/connectivity';
import { initInputTracking } from './state/input';
import { motion, systemReducedMotion } from './state/motion';
import { onAccent, settings } from './state/settings';
import { parseBootParam } from './state/validation';

// ---------------------------------------------------------------- tema, movimiento y acento
const html = document.documentElement;
const reducedQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

function applySettings(): void {
  const s = settings.get();
  const systemReduced = reducedQuery?.matches ?? false;
  const mode = s.reduceMotion || systemReduced ? 'reduced' : 'full';
  html.dataset.theme = s.theme;
  html.dataset.motion = mode;
  html.style.setProperty('--accent', s.accent);
  html.style.setProperty('--on-accent', onAccent(s.accent));
  systemReducedMotion.set(systemReduced);
  motion.set(mode);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.accent);
}
applySettings();
settings.subscribe(applySettings);
reducedQuery?.addEventListener('change', applySettings);

// ---------------------------------------------------------------- ?boot= (§6)
const url = new URL(window.location.href);
if (url.searchParams.has('boot')) {
  decideBoot(parseBootParam(url.searchParams.get('boot')));
  url.searchParams.delete('boot');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
} else {
  decideBoot(null);
}

// ---------------------------------------------------------------- inicializaciones (P-12)
initInputTracking();
initConnectivity();
initAudioUnlock();

// React Router salta (skipTransition) la View Transition en curso cuando llega otra navegación antes de
// que termine; el navegador notifica esa AbortError como promesa sin atender. Es una interrupción
// esperada de la animación (la navegación sí se completa), no un fallo: se marca como atendida.
window.addEventListener('unhandledrejection', (e) => {
  const r: unknown = e.reason;
  if (typeof r === 'object' && r !== null && (r as { name?: unknown }).name === 'AbortError'
    && /transition/i.test(String((r as { message?: unknown }).message))) e.preventDefault();
});

// Inicio es el destino de "Atrás" e "Ir a Inicio": su chunk se precarga en cuanto el hilo queda libre
// para que siga disponible si después se pierde la conexión (AC-38, §16).
scheduleIdle(() => preloadRoute('/'));

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
