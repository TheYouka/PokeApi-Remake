import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// CSP solo en build (en dev, React Refresh necesita un script inline).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://raw.githubusercontent.com/PokeAPI/",
  "media-src 'self' https://raw.githubusercontent.com/PokeAPI/",
  "connect-src 'self' https://pokeapi.co",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'pokebox-csp',
    apply: 'build',
    // Descriptor de etiqueta: no depende del texto exacto de <head> en index.html.
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  };
}

// Ruta base del sitio. En local (dev, preview y verificación) es '/'. El workflow de GitHub Pages
// compila con PBX_BASE_PATH=/PokeApi-Remake/ porque el sitio vive en esa subcarpeta de github.io.
const BASE_PATH = process.env.PBX_BASE_PATH || '/';
if (!/^\/(?:[\w.-]+\/)*$/.test(BASE_PATH)) {
  throw new Error(`PBX_BASE_PATH no válido: "${BASE_PATH}". Debe empezar y terminar en '/', p. ej. /PokeApi-Remake/`);
}

export default defineConfig({
  base: BASE_PATH,
  plugins: [react(), cspPlugin()],
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0') },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: false },
});
