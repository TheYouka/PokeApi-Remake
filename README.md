# PokéBox One

PokéBox One es una Pokédex completa con aspecto de consola de videojuegos: arranque animado, dashboard de tiles, pivotes, Guía lateral, barra de pistas, logros, sonidos sintetizados y navegación con teclado, mando, ratón o toque. Es una SPA (Vite + React + TypeScript) sin backend que consume directamente la [PokeAPI v2](https://pokeapi.co/docs/v2) y cubre sus 50 recursos navegables, cada uno con su lista y su detalle.

Es el remake "con esteroides" de un proyecto universitario.

**Pruébala en línea:** <https://theyouka.github.io/PokeApi-Remake/>

## Créditos

- Proyecto original: [PokeApi-UI-](https://github.com/TheYouka/PokeApi-UI-), de **TheYouka**, **PeekoDan** y **Janrna**. La pantalla Retro rinde homenaje a su diseño.
- Datos e imágenes: [PokeAPI](https://pokeapi.co/) (los sprites y gritos se sirven desde `raw.githubusercontent.com/PokeAPI`).
- Tipografía: Inter, a través del paquete `@fontsource-variable/inter`.

## Requisitos

- Node.js ≥ 22.12 (lo exige Vite 8).
- En Windows PowerShell, usa siempre `npm.cmd` y `npx.cmd` en lugar de `npm` y `npx`: la directiva de ejecución suele bloquear `npm.ps1`.

## Instalación

```powershell
npm.cmd install
```

Todas las dependencias están fijadas a una versión exacta (sin `^` ni `~`).

## Scripts

> **El servidor solo escucha en 127.0.0.1. Nunca lo abras a la red ni a todas las interfaces, nunca uses `--host` y nunca uses el puerto 8000. Abre siempre `http://127.0.0.1:<puerto>` y para el servidor (Ctrl+C) cuando termines.**

`vite.config.ts` ya fija la dirección de loopback y `strictPort`, así que no hace falta pasar nada más que, si acaso, `--port`.

| Script | Qué hace |
|---|---|
| `npm.cmd run dev` | Servidor de desarrollo en `http://127.0.0.1:5173`. |
| `npm.cmd run preview` | Sirve el build de `dist/` en `http://127.0.0.1:4173`. |
| `npm.cmd run build` | Comprueba tipos y genera `dist/`. |
| `npm.cmd run typecheck` | Solo la comprobación de tipos (`tsc --noEmit`). |
| `npm.cmd run unit` | Tests unitarios (`node:test` con `tsx`). |
| `npm.cmd run smoke` | Smoke contra la PokeAPI en vivo: índice, los 50 recursos (lista y detalle) y casos especiales. No abre ningún puerto. |
| `npm.cmd run visual` | Verificación visual con Playwright (Chromium headless). |

### `dev`

1. Comprueba antes que el puerto esté libre:

   ```powershell
   Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
   ```

2. Si no sale ninguna fila, arranca con `npm.cmd run dev` y abre `http://127.0.0.1:5173`.
3. Si sale alguna fila, en cualquier dirección, usa otro puerto libre entre 5173 y 5199, por ejemplo `npm.cmd run dev -- --port 5174`, y abre `http://127.0.0.1:5174`.

Abre siempre `127.0.0.1` y nunca `localhost`: `localhost` puede resolver a la dirección IPv6 de loopback, donde puede haber otra aplicación escuchando en el mismo puerto (en el equipo del autor, otro proyecto ya usa el 5173 en IPv6).

### `preview`

Igual que `dev`, pero sobre el build (`npm.cmd run build` antes): comprueba el puerto 4173 con `Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue`, abre `http://127.0.0.1:4173` y, si está ocupado, usa `npm.cmd run preview -- --port 4174` y abre `http://127.0.0.1:4174`.

### `visual`

Solo funciona con un servidor local **ya arrancado** (normalmente `preview`) y con la variable `PBX_BASE_URL` apuntando a él:

```powershell
$env:PBX_BASE_URL = 'http://127.0.0.1:4173'
npm.cmd run visual
```

El script rechaza cualquier dirección que no sea de loopback o un puerto fuera de la lista blanca. Antes hay que instalar Chromium una vez con `npx.cmd playwright install chromium`, y al terminar hay que parar el preview.

## Publicación en GitHub Pages

El workflow `.github/workflows/deploy.yml` compila y publica el sitio en cada push a `main` (también se puede lanzar a mano desde la pestaña **Actions**).

- **Configuración del repo (una sola vez):** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
- **Ruta base:** el sitio vive en `https://theyouka.github.io/PokeApi-Remake/`. El workflow compila con `PBX_BASE_PATH=/<nombre-del-repo>/`, y Vite y el router usan esa subcarpeta. En local no hace falta: la ruta base es `/`.
- **Rutas internas:** GitHub Pages no reescribe rutas, así que el workflow copia `index.html` como `404.html`. Así, una recarga o un enlace directo como `/PokeApi-Remake/pokemon/25` abre la app. Esas páginas responden con código 404 aunque se vean bien.
- Para probar en local el mismo build que se publica, en la misma terminal (la variable tiene que estar puesta también al arrancar el preview):

  ```powershell
  $env:PBX_BASE_PATH = '/PokeApi-Remake/'
  npm.cmd run build
  npm.cmd run preview   # abre http://127.0.0.1:4173/PokeApi-Remake/
  # Al terminar: Ctrl+C y luego
  Remove-Item Env:PBX_BASE_PATH
  ```

## Controles

| Acción | Teclado | Mando |
|---|---|---|
| Moverse | Flechas o WASD | D-pad o stick izquierdo |
| Seleccionar | Enter | A |
| Atrás | Esc o Retroceso | B |
| Cambiar de pivote o de pestaña | Q / E | LB / RB |
| Anterior / siguiente | `[` / `]` | LT / RT |
| Abrir la Guía | G o Inicio | Menú |
| Buscar | `/` | Y |
| Shiny (en la ficha) | X | X |

- **Ratón:** clic en tiles, enlaces y pistas de la barra inferior; la rueda desplaza las filas.
- **Toque:** toca cualquier elemento (objetivos de 44 px como mínimo) y desliza las filas de tiles en horizontal.
- La barra de pistas se adapta al último dispositivo usado (glifos de mando, teclas o solo texto).

## Funciones

- Arranque animado (se salta con cualquier tecla) y apagado.
- Dashboard con 8 pivotes (Inicio, Pokédex, Juegos, Objetos, Movimientos, Mundo, Bayas y Ajustes) y live tiles ("Pokémon del día", "Baya del día", "Último logro").
- Pokédex virtualizada con búsqueda y filtros cruzados (tipos, generación, color, hábitat, forma, grupo huevo).
- Ficha de Pokémon con ilustración, shiny, sprites, gritos, estadísticas, efectividad defensiva, evolución, movimientos, encuentros y formas.
- Tabla de tipos 18×18, Comparar, Partida rápida, Crear Pokémon (se guardan en el navegador).
- Lista y detalle de los 50 recursos de la PokeAPI, Explorador de la API y JSON sin procesar.
- Estadísticas y gráficas con exportación a CSV, SVG y PNG.
- Logros con gamerscore, notificaciones, perfil de Entrenador, temas claro y oscuro, colores de acento, sonido y movimiento reducido.
- Pantalla Retro con el diseño del proyecto original.

## Caché y modo sin conexión

- Todas las peticiones a la API pasan por un único cliente con 6 peticiones simultáneas como máximo, deduplicación, timeout de 15 s y 2 reintentos.
- Hay tres niveles de caché: memoria (LRU de 64 entradas), React Query (datos frescos durante 24 h, en memoria durante 1 h) y `localStorage` (claves `pbx1:c1:`).
- La caché persistente tiene un presupuesto de 2 500 000 caracteres (≈ 5 MB) y como máximo 400 000 por entrada; lo que no cabe vive solo en memoria. Caben unas 6 fichas completas más las listas e índices. Al llenarse se desaloja por antigüedad de uso; si el navegador agota la cuota, la persistencia se desactiva durante la sesión y la app sigue en memoria.
- Las etiquetas de baja prioridad de más de 20 000 caracteres (por ejemplo, las especies que pide la Pokédex para los nombres) no se persisten: sin conexión y tras recargar se muestran con el nombre técnico formateado.
- Sin conexión, todo lo visitado en la sesión sigue disponible; tras recargar, solo las páginas recientes que estén en `localStorage`. Si `localStorage` no está disponible (modo privado), solo funciona la caché en memoria.
- Ajustes permite borrar la caché o actualizarla.
- **Idioma de los datos:** solo se ofrecen los 14 idiomas conocidos (`KNOWN_LANGS` en `src/state/settings.ts`). Si la API añade uno nuevo, no aparecerá hasta actualizar esa constante.
- **Búsqueda:** compara nombres técnicos en ASCII. Con un idioma de datos de nombres distintos (por ejemplo, alemán), esos nombres solo se encuentran si ya están en caché.

## Aviso legal

PokéBox One es un proyecto de fans sin ánimo de lucro. No está afiliado ni respaldado por Nintendo, Game Freak, The Pokémon Company ni Microsoft. Pokémon y sus nombres son marcas de sus respectivos propietarios. Los datos y las imágenes provienen de la PokeAPI.

## Estructura del proyecto

```
index.html, vite.config.ts, tsconfig.json, package.json
.github/workflows/ deploy.yml (publicación en GitHub Pages)
public/            favicon.svg
scripts/           smoke.ts (API en vivo) y visual.ts (Playwright)
tests/unit/        tests de node:test
tests/fixtures/    respuestas reales reducidas de la PokeAPI
src/
  main.tsx         arranque: tema, movimiento, entrada y router
  api/             cliente tipado de la PokeAPI (único camino a la red, sin React)
  data/            React Query, consultas y derivaciones puras (búsqueda, filtros, evolución…)
  registry/        registro declarativo de los 50 recursos y de los pivotes
  state/           stores persistidos (ajustes, logros, creados, recientes…)
  nav/             bus de acciones, motor de foco espacial, teclado y mando
  audio/           sonidos sintetizados con Web Audio y gritos
  i18n/            todos los textos de la interfaz (es.ts)
  ui/              sistema de diseño: shell, tiles, barras, overlays, gráficas
  screens/         una carpeta por pantalla (cada una es un chunk lazy)
  app/             router, layouts, precarga de rutas y efectos de navegación
```
