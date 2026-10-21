// Verificación visual (design.md §22.3, VER-3, AC-43). Usa Playwright SOLO como librería (Chromium
// headless, chromium.launch) contra un servidor local que ya ha arrancado el bloque PowerShell de §1.2.
// Este script NO arranca servidores ni abre puertos: solo se conecta a PBX_BASE_URL, que debe ser
// 127.0.0.1 o [::1] con un puerto de la lista blanca (4173–4199 o 5173–5199). Si no, código 2.
// Salida: capturas y visual-report.json en .agents/tasks/screenshots/; código ≠ 0 si algo falla.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { Browser, BrowserContext, BrowserContextOptions, Download, Locator, Page, Request, Response } from 'playwright';

// ---------------------------------------------------------------- base URL (lista blanca de §1.2)
const RAW_BASE = process.env.PBX_BASE_URL ?? 'http://127.0.0.1:4173';

function allowedBase(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'http:') return null;
  if (u.hostname !== '127.0.0.1' && u.hostname !== '[::1]') return null;
  const port = Number(u.port);
  const inRange = (port >= 4173 && port <= 4199) || (port >= 5173 && port <= 5199);
  return Number.isInteger(port) && inRange ? u : null;
}

const BASE_OR_NULL = allowedBase(RAW_BASE);
if (BASE_OR_NULL === null) {
  console.error(`PBX_BASE_URL no permitida: ${RAW_BASE} (solo http://127.0.0.1 o http://[::1] con puerto 4173–4199 o 5173–5199)`);
  process.exit(2);
}
const BASE: URL = BASE_OR_NULL;

// Watchdog de §1.2: el navegador se cierra en el finally de main(); esto es la red de seguridad.
setTimeout(() => { console.error('visual: watchdog de 12 min'); process.exit(3); }, 12 * 60_000).unref();

// ---------------------------------------------------------------- rutas y constantes
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = join(ROOT, '.agents', 'tasks', 'screenshots');
const REPORT = join(SHOTS, 'visual-report.json');
const API = 'https://pokeapi.co/api/v2/';
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/';
const FHD = { width: 1920, height: 1080 } as const;
const STEP_MS = 15_000;
const NAV_ABORT_WINDOW_MS = 1000;

const GROUP_PAGES: readonly [string, string][] = [
  ['bayas', '/berry/1'],
  ['concursos', '/contest-type/1'],
  ['monedas', '/currency/1'],
  ['encuentros', '/encounter-method/1'],
  ['evolucion', '/evolution-chain/67'],
  ['juegos', '/generation/1'],
  ['objetos', '/item/1'],
  ['lugares', '/region/1'],
  ['maquinas', '/machine/1'],
  ['movimientos', '/move/85'],
  ['pokemon', '/ability/9'],
  ['utilidad', '/language/7'],
];

const EXPECTED_SHOTS: readonly string[] = [
  '01-arranque.png', '02-inicio.png', '03-guia.png', '04-pikachu.png', '05-eevee.png', '06-tipos.png',
  '07-error-404.png', '08-logros-toast.png', '09-pokedex.png',
  ...GROUP_PAGES.map(([g]) => `10-grupo-${g}.png`),
  '11-movil-inicio.png', '12-movil-pikachu.png', '13-movimiento-reducido.png', '14-sin-conexion.png',
  '15-ajustes.png', '16-estadisticas.png', '17-graficas.png', '18-retro.png', '19-comparar.png', '20-idioma-en.png',
];

// ---------------------------------------------------------------- informe
interface ScenarioResult { id: number; name: string; status: 'OK' | 'FALLO'; ms: number; checks: number; failures: string[]; notes: string[] }
interface NetEntry { scenario: number; url: string; detail: string; msAfterNav: number | null }
interface MsgEntry { scenario: number; type: string; text: string; url: string }

const report = {
  baseUrl: BASE.origin,
  startedAt: new Date().toISOString(),
  finishedAt: '',
  browser: '',
  scenarios: [] as ScenarioResult[],
  scenario5: { apiRequests: null as number | null, expectedRange: '17–19', limit: 40, urls: [] as string[] },
  appErrors: [] as MsgEntry[],
  consoleResourceErrors: [] as MsgEntry[],
  expectedFailures: [] as NetEntry[],
  offlineExpected: [] as NetEntry[],
  navigationCancels: [] as NetEntry[],
  unexpectedFailures: [] as NetEntry[],
  otherFailures: [] as NetEntry[],
  settleTimeouts: [] as { scenario: number; label: string }[],
  scriptErrors: [] as string[],
  screenshots: [] as string[],
  missingScreenshots: [] as string[],
  summary: { ok: 0, fail: 0, appErrors: 0, unexpectedFailures: 0, exitCode: 0 },
};

let current = 0;                                           // escenario en curso (para clasificar)
const lastNav = new WeakMap<Page, number>();               // último goto/reload/close de cada página
const offlineAt = new WeakMap<BrowserContext, number>();   // momento de setOffline(true)
const inflight = new WeakMap<Page, Set<Request>>();
const requestLog = new WeakMap<Page, { url: string; t: number }[]>();
const apiCounter = { active: false, urls: [] as string[] };

const sinceNav = (page: Page): number | null => {
  const t = lastNav.get(page);
  return t === undefined ? null : Date.now() - t;
};

function onResponse(page: Page, res: Response): void {
  const status = res.status();
  if (status < 400) return;
  const url = res.url();
  const entry: NetEntry = { scenario: current, url, detail: `HTTP ${status}`, msAfterNav: sinceNav(page) };
  if (url.startsWith(API)) {
    // Único 404 provocado hacia la API: el del escenario 8 (`pruebamon` no se pide nunca).
    if (current === 8 && status === 404 && /\/api\/v2\/pokemon\/no-existe-xyz\/?$/.test(url)) {
      report.expectedFailures.push({ ...entry, detail: `${entry.detail} (404 provocado)` });
    } else report.unexpectedFailures.push(entry);
  } else if (url.startsWith(SPRITES)) {
    report.expectedFailures.push({ ...entry, detail: `${entry.detail} (sprite inexistente)` });
  } else {
    report.unexpectedFailures.push(entry);
  }
}

function onRequestFailed(page: Page, req: Request): void {
  const url = req.url();
  const errorText = req.failure()?.errorText ?? '';
  const since = sinceNav(page);
  const entry: NetEntry = { scenario: current, url, detail: errorText, msAfterNav: since };
  const off = offlineAt.get(page.context());
  if (off !== undefined && Date.now() >= off) report.offlineExpected.push({ ...entry, detail: `${errorText} (esperado: sin conexión)` });
  else if (errorText === 'net::ERR_ABORTED' && since !== null && since <= NAV_ABORT_WINDOW_MS) report.navigationCancels.push(entry);
  else if (url.startsWith(API)) report.unexpectedFailures.push(entry);
  else report.otherFailures.push(entry);
}

function attach(page: Page): void {
  const live = new Set<Request>();
  const log: { url: string; t: number }[] = [];
  inflight.set(page, live);
  requestLog.set(page, log);
  page.setDefaultTimeout(STEP_MS);
  page.on('request', (r) => {
    const url = r.url();
    if (!/^https?:/.test(url)) return;
    live.add(r);
    log.push({ url, t: Date.now() });
    if (apiCounter.active && url.startsWith(API)) apiCounter.urls.push(url);
  });
  page.on('requestfinished', (r) => { live.delete(r); });
  page.on('requestfailed', (r) => { live.delete(r); onRequestFailed(page, r); });
  page.on('response', (res) => onResponse(page, res));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const entry: MsgEntry = { scenario: current, type: 'console.error', text: msg.text(), url: page.url() };
    if (entry.text.startsWith('Failed to load resource')) report.consoleResourceErrors.push(entry);
    else report.appErrors.push(entry);
  });
  page.on('pageerror', (err) => {
    report.appErrors.push({ scenario: current, type: 'pageerror', text: `${err.name}: ${err.message}`, url: page.url() });
  });
  page.on('crash', () => {
    report.appErrors.push({ scenario: current, type: 'crash', text: 'la página se bloqueó', url: page.url() });
  });
}

// ---------------------------------------------------------------- utilidades de navegación
const urlOf = (path: string) => new URL(path, BASE).href;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Sin peticiones en vuelo durante 500 ms (máx. 15 s). Complementa a networkidle tras navegaciones SPA. */
async function quiet(page: Page, label: string): Promise<void> {
  const live = inflight.get(page);
  if (!live) return;
  const until = Date.now() + 15_000;
  let idleSince = live.size === 0 ? Date.now() : 0;
  while (Date.now() < until) {
    await sleep(100);
    if (live.size === 0) {
      if (idleSince === 0) idleSince = Date.now();
      if (Date.now() - idleSince >= 500) return;
    } else idleSince = 0;
  }
  report.settleTimeouts.push({ scenario: current, label: `${label} (peticiones en vuelo: ${live.size})` });
}

/** §22.3 "Navegación entre pasos": networkidle (15 s) antes de cada goto, reload o close. */
async function settle(page: Page, label: string): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  } catch {
    report.settleTimeouts.push({ scenario: current, label: `${label} (networkidle)` });
  }
  await quiet(page, label);
}

async function nav(page: Page, path: string): Promise<void> {
  await settle(page, `antes de goto ${path}`);
  lastNav.set(page, Date.now());
  await page.goto(urlOf(path), { waitUntil: 'domcontentloaded' });
}

async function reload(page: Page): Promise<void> {
  await settle(page, `antes de reload ${page.url()}`);
  lastNav.set(page, Date.now());
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function closeContext(ctx: BrowserContext): Promise<void> {
  for (const p of ctx.pages()) {
    await settle(p, 'antes de close');
    lastNav.set(p, Date.now());
  }
  await ctx.close();
}

async function newContext(browser: Browser, opts: BrowserContextOptions, booted: boolean): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: FHD, locale: 'es-ES', acceptDownloads: true, ...opts });
  if (booted) {
    // Valor EN CRUDO '1' (sin sobre): isBooted() lo compara tal cual (§9). Sin arranque ni "Primer encendido".
    await ctx.addInitScript(() => { try { sessionStorage.setItem('pbx1:booted', '1'); } catch { /* sin almacenamiento */ } });
  }
  ctx.on('page', (p) => { if (!inflight.has(p)) attach(p); });
  const page = await ctx.newPage();
  if (!inflight.has(page)) attach(page);
  return { ctx, page };
}

interface ShotOptions {
  /** false: captura ya, sin esperar a que acaben las animaciones (el arranque, antes de su fundido). */
  settle?: boolean;
  /** Captura solo este elemento (completo aunque supere el viewport), sin las barras fijas ni los toasts. */
  element?: Locator;
}

async function shot(page: Page, name: string, { settle = true, element }: ShotOptions = {}): Promise<void> {
  // Antes de capturar, que terminen las animaciones finitas (View Transitions, entrada de la Guía…), máx. 2 s:
  // una captura a mitad de una View Transition solo muestra las capas con nombre (barras) sobre negro.
  if (settle) {
    await page.waitForFunction(() => document.getAnimations().every((a) =>
      a.playState !== 'running' || a.effect?.getComputedTiming().endTime === Infinity), null, { timeout: 2000 }).catch(() => undefined);
  }
  if (element) {
    await element.screenshot({ path: join(SHOTS, name), style: '.topbar, [data-hintbar], [role="status"] { visibility: hidden !important; }' });
  } else {
    await page.screenshot({ path: join(SHOTS, name) });
  }
  report.screenshots.push(name);
}

const activeId = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute('data-focus-id') ?? null);
const pathname = (page: Page) => new URL(page.url()).pathname;

/** Espera hasta que `fn` devuelva true (sondeo cada 100 ms). */
async function until(fn: () => Promise<boolean>, timeout: number): Promise<boolean> {
  const end = Date.now() + timeout;
  for (;;) {
    try { if (await fn()) return true; } catch { /* reintento */ }
    if (Date.now() >= end) return false;
    await sleep(100);
  }
}

/** Toast con el NOMBRE EXACTO del logro (o el texto del aviso) dentro de [role=status]. */
async function toast(page: Page, text: string, timeout = 20_000): Promise<boolean> {
  try {
    await page.locator('[role="status"]').getByText(text, { exact: true }).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

const errorPanel = (page: Page) => page.locator('[role="alert"]', { hasText: 'Algo salió mal.' });

// ---------------------------------------------------------------- escenarios
class Check {
  readonly failures: string[] = [];
  readonly notes: string[] = [];
  count = 0;
  ok(cond: boolean, msg: string): boolean {
    this.count++;
    if (!cond) this.failures.push(msg);
    return cond;
  }
  note(msg: string): void { this.notes.push(msg); }
}

async function scenario(id: number, name: string, fn: (c: Check) => Promise<void>): Promise<void> {
  current = id;
  const c = new Check();
  const t0 = Date.now();
  process.stdout.write(`[${id}] ${name} … `);
  try {
    await fn(c);
  } catch (e) {
    c.failures.push(`excepción: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`);
  }
  const res: ScenarioResult = {
    id, name, status: c.failures.length === 0 ? 'OK' : 'FALLO', ms: Date.now() - t0, checks: c.count, failures: c.failures, notes: c.notes,
  };
  report.scenarios.push(res);
  console.log(`${res.status} (${res.ms} ms, ${res.checks} comprobaciones)${res.failures.length ? `\n    - ${res.failures.join('\n    - ')}` : ''}`);
}

/** Escenarios 1–4: una sola sesión (arranque → Inicio → teclado → Guía), sin el init script de arranque. */
async function sessionScenarios(browser: Browser): Promise<void> {
  const { ctx, page } = await newContext(browser, {}, false);
  const boot = page.locator('[role="dialog"][aria-label="PokéBox One, iniciando"]');
  try {
    await scenario(1, 'Arranque forzado con /?boot=1', async (c) => {
      await nav(page, '/?boot=1');
      await page.waitForTimeout(1200);
      c.ok(await boot.isVisible(), 'el overlay de arranque no es visible a los 1,2 s');
      // Captura con la Pokébola rellena y la palabra visibles y ANTES del fundido boot-out (2,6–3,6 s):
      // se espera a los ≈ 2,5 s de la línea de tiempo, se congelan las animaciones, se captura y se reanudan.
      const t = await page.waitForFunction(() => {
        const out = document.getAnimations().find((a) => a instanceof CSSAnimation && a.animationName.includes('boot-out'));
        const now = Number(out?.currentTime ?? 0);
        if (!out || now < 2500) return false;
        for (const a of document.getAnimations()) a.pause();
        return now;
      }, null, { timeout: 5000, polling: 'raf' }).then(async (h) => Number(await h.jsonValue())).catch(() => null);
      c.ok(t !== null && t < 2600, `la captura del arranque no cae antes del fundido (t = ${t === null ? 'N/D' : `${Math.round(t)} ms`})`);
      await shot(page, '01-arranque.png', { settle: false });
      await page.evaluate(() => { for (const a of document.getAnimations()) if (a.playState === 'paused') a.play(); });
    });

    await scenario(2, 'Saltar arranque e Inicio', async (c) => {
      await page.keyboard.press('Enter');
      await boot.waitFor({ state: 'detached', timeout: 5000 });
      await settle(page, 'tras el arranque');
      c.ok(await toast(page, 'Primer encendido'), 'no aparece el toast "Primer encendido"');
      c.ok(await page.locator('[data-focus-group="pivots"] a').count() === 8, 'Inicio no tiene 8 enlaces de pivote');
      const tiles = await page.locator('main [data-size]').evaluateAll((els) =>
        els.map((e) => ({ size: e.getAttribute('data-size') ?? '', label: (e.getAttribute('aria-label') ?? '').trim() })));
      c.ok(new Set(tiles.map((t) => t.size)).size >= 3, `tiles con menos de 3 tamaños (${[...new Set(tiles.map((t) => t.size))].join(', ')})`);
      c.ok(tiles.length > 0 && tiles.every((t) => t.label !== ''), 'hay tiles sin aria-label');
      const profile = page.locator('.topbar [data-focus-id="topbar:profile"]');
      c.ok(await profile.locator('svg, img').count() > 0, 'la barra superior no muestra avatar');
      c.ok((await page.locator('.topbar .gamertag').innerText()).trim() !== '', 'la barra superior no muestra gamertag');
      c.ok(/◆ \d+ G/.test(await page.locator('.topbar').innerText()), 'la barra superior no muestra el gamerscore "◆ … G"');
      c.ok(/^\d{2}:\d{2}$/.test((await page.locator('.topbar .clock').innerText()).trim()), 'el reloj no tiene formato hh:mm');
      c.ok(await page.locator('[data-focus-id="topbar:bell"]').isVisible(), 'no se ve la campana');
      c.ok(await page.locator('.hintbar').isVisible(), '.hintbar no es visible');
      c.ok(await page.locator('.hintbar [data-core]').count() === 3, '.hintbar no tiene las 3 pistas [data-core]');
      const daily = page.locator('[data-focus-id="tile:pokemon-del-dia"]');
      const dailyHref = async () => (await daily.getAttribute('href')) ?? '';
      const hasDaily = await until(async () => /^\/pokemon\/\d+$/.test(await dailyHref()), 15_000);
      c.ok(hasDaily, '"Pokémon del día" no llegó a enlazar a /pokemon/{id}');
      const before = await dailyHref();
      await shot(page, '02-inicio.png');
      await reload(page);
      await page.waitForSelector('[data-autofocus]');
      await page.waitForTimeout(500);
      c.ok(await boot.count() === 0, 'recargar / sin parámetro vuelve a mostrar el arranque (AC-22)');
      await until(async () => /^\/pokemon\/\d+$/.test(await dailyHref()), 15_000);
      c.ok((await dailyHref()) === before, `el "Pokémon del día" cambió al recargar (${before} → ${await dailyHref()})`);
    });

    await scenario(3, 'Teclado y ratón en Inicio', async (c) => {
      const onTile = () => until(async () => ((await activeId(page)) ?? '').startsWith('tile:'), 3000);
      c.ok(await onTile(), 'el foco no está en un tile de Inicio');
      // ArrowUp (sin aserción) devuelve el foco a la parte alta para que KeyS tenga un tile debajo.
      for (const key of ['ArrowRight', 'ArrowDown', 'ArrowUp', 'KeyD', 'KeyS']) {
        const before = await activeId(page);
        await page.keyboard.press(key);
        const moved = await until(async () => (await activeId(page)) !== before, 1500);
        if (key !== 'ArrowUp') c.ok(moved, `${key} no cambia el foco (sigue en ${before})`);
      }
      const shadow = await page.evaluate(() => (document.activeElement ? getComputedStyle(document.activeElement).boxShadow : 'none'));
      c.ok(shadow !== 'none' && shadow !== '', 'el box-shadow del enfocado es none');
      await page.waitForTimeout(200);
      const transform = await page.evaluate(() => (document.activeElement ? getComputedStyle(document.activeElement).transform : 'none'));
      c.ok(transform !== 'none', 'el transform del enfocado es none tras 200 ms (sin escala 1.05)');
      const focused = await activeId(page);
      const target = focused === 'tile:retro' ? 'tile:logros' : 'tile:retro';
      await page.locator(`[data-focus-id="${target}"]`).hover();
      c.ok(await until(async () => (await activeId(page)) === target, 1500), `hover() sobre ${target} no lo enfoca`);
      let before = page.url();
      await page.keyboard.press('KeyE');
      c.ok(await until(async () => page.url() !== before, 3000), 'KeyE no cambia de pivote');
      c.ok(pathname(page) === '/hub/pokedex', `KeyE llevó a ${pathname(page)} y no a /hub/pokedex`);
      const hub = page.url();
      c.ok(await onTile(), 'tras cambiar de pivote el foco no está en un tile');
      before = page.url();
      await page.keyboard.press('Enter');
      c.ok(await until(async () => page.url() !== before, 5000), 'Enter no abre el tile');
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      c.ok(await until(async () => page.url() === hub, 5000), 'Escape no vuelve al pivote');
      c.ok(await onTile(), 'al volver el foco no está en un tile');
      before = page.url();
      await page.keyboard.press('Enter');
      c.ok(await until(async () => page.url() !== before, 5000), 'Enter (segunda vez) no abre el tile');
      await page.waitForTimeout(300);
      await page.locator('[data-hintbar] button[aria-label^="Atrás"]').click();
      c.ok(await until(async () => page.url() === hub, 5000), 'clic en la pista "Atrás" no vuelve (AC-26)');
    });

    await scenario(4, 'Guía: abrir, foco atrapado y cerrar', async (c) => {
      const dialog = page.locator('[role="dialog"]');
      const inDialog = () => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
      await until(async () => ((await activeId(page)) ?? '').startsWith('tile:'), 3000);
      const tile = await activeId(page);
      c.ok(tile !== null && tile.startsWith('tile:'), `el foco de partida no es un tile (${tile})`);
      await page.keyboard.press('KeyG');
      await dialog.first().waitFor({ state: 'visible', timeout: 5000 });
      c.ok(await until(inDialog, 1500), 'al abrir la Guía el foco no está dentro del diálogo');
      await shot(page, '03-guia.png');
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        if (!c.ok(await inDialog(), `Tab n.º ${i + 1} saca el foco del diálogo`)) break;
      }
      await page.keyboard.press('Escape');
      c.ok(await until(async () => (await dialog.count()) === 0, 3000), 'Escape no cierra la Guía');
      c.ok(await until(async () => (await activeId(page)) === tile, 1500), `tras Escape el foco no vuelve a ${tile} (está en ${await activeId(page)})`);
      await page.keyboard.press('KeyG');
      c.ok(await until(async () => dialog.first().isVisible(), 3000), 'G no vuelve a abrir la Guía');
      await page.keyboard.press('KeyG');
      c.ok(await until(async () => (await dialog.count()) === 0, 3000), 'G no cierra la Guía');
      c.ok(await until(async () => (await activeId(page)) === tile, 1500), `tras G el foco no vuelve a ${tile}`);
      await page.keyboard.press('Home');
      c.ok(await until(async () => dialog.first().isVisible(), 3000), 'Inicio (Home) no abre la Guía');
      await page.keyboard.press('Escape');
      c.ok(await until(async () => (await dialog.count()) === 0, 3000), 'Escape no cierra la Guía abierta con Home');
    });
  } finally {
    await closeContext(ctx);
  }
}

/** Un escenario con su propio contexto nuevo (caché y localStorage limpios). */
async function isolated(
  browser: Browser, id: number, name: string, opts: BrowserContextOptions, booted: boolean,
  fn: (c: Check, page: Page, ctx: BrowserContext) => Promise<void>,
): Promise<void> {
  const { ctx, page } = await newContext(browser, opts, booted);
  try {
    await scenario(id, name, (c) => fn(c, page, ctx));
  } finally {
    current = id;
    await closeContext(ctx).catch(() => undefined);
  }
}

async function s5(browser: Browser): Promise<void> {
  await isolated(browser, 5, 'Ficha /pokemon/25 y recuento de peticiones', {}, true, async (c, page) => {
    apiCounter.urls = [];
    apiCounter.active = true;
    lastNav.set(page, Date.now());
    await page.goto(urlOf('/pokemon/25'), { waitUntil: 'domcontentloaded' });
    try { await page.waitForLoadState('networkidle', { timeout: 15_000 }); } catch { c.note('networkidle venció a los 15 s'); }
    await page.waitForTimeout(1500);
    apiCounter.active = false;                                     // recuento cerrado antes de capturar o interactuar
    const n = apiCounter.urls.length;
    report.scenario5.apiRequests = n;
    report.scenario5.urls = [...apiCounter.urls];
    c.ok(n <= 40, `${n} peticiones a pokeapi.co/api/v2 (> 40, AC-18)`);
    if (n < 17 || n > 19) c.note(`recuento ${n} fuera del rango esperado 17–19 (no es fallo: el límite es 40)`);

    const hero = page.locator('section[aria-labelledby="pokemon-title"]');
    const img = hero.locator('img').first();
    c.ok(((await img.getAttribute('alt')) ?? '').endsWith('ilustración oficial'), 'no se ve el artwork oficial');
    c.ok(await page.locator('button[aria-label="Reproducir grito"]').isVisible(), 'no hay botón de grito');
    const bars = page.locator('[role="list"][aria-label="Estadísticas base"]').first();
    c.ok(await bars.locator('[data-stat]').count() === 7 && await bars.locator('[data-stat="total"]').count() === 1, 'no hay 6 barras + total');
    const section = (title: string) => page.locator('section').filter({ has: page.locator('h2', { hasText: new RegExp(`^${title}$`) }) });
    c.ok(await section('Habilidades').locator('li').count() >= 1, 'no hay habilidades');
    for (const label of ['Género', 'Grupos huevo', 'Ritmo de crecimiento', 'Color', 'Hábitat']) {
      c.ok(await page.locator('dt', { hasText: new RegExp(`^${label}$`) }).count() === 1, `falta el dato "${label}"`);
    }
    const flavor = section('Descripción');
    c.ok(await flavor.locator('[aria-haspopup="listbox"]').count() >= 1, 'el flavor text no tiene selector de versión');
    c.ok((await flavor.innerText()).trim().length > 20, 'el flavor text está vacío');
    c.ok((await section('Efectividad defensiva').innerText()).includes('×'), 'no se muestra la efectividad defensiva');
    await shot(page, '04-pikachu.png');

    // Grupo ×1 (R2-5): sus 14 badges piden la etiqueta al ser visibles; tras hacer scroll llegan en español.
    const defense = section('Efectividad defensiva');
    await defense.scrollIntoViewIfNeeded();
    const neutral = defense.locator('[data-multiplier="1"] [data-type]');
    c.ok(await neutral.count() === 14, `el grupo ×1 tiene ${await neutral.count()} badges (se esperan 14)`);
    const neutralText = () => defense.locator('[data-multiplier="1"]').innerText();
    c.ok(await until(async () => {
      const t = await neutralText();
      return t.includes('Lucha') && !t.includes('Fighting');
    }, 15_000), `el grupo ×1 no llega en español ("${(await neutralText()).replace(/\s+/g, ' ').trim()}")`);

    const srcBefore = await img.getAttribute('src');
    await page.locator('[data-focus-id="hero:shiny"]').click();
    c.ok(await until(async () => (await hero.locator('img').first().getAttribute('src')) !== srcBefore, 3000), 'Shiny no cambia el src');

    await page.locator('[data-focus-id="tab:encuentros"]').click();
    const encRows = page.locator('[role="region"] table tbody tr');
    c.ok(await until(async () => (await encRows.count()) > 0, 20_000), 'la pestaña Encuentros no tiene filas');

    await page.locator('[data-focus-id="tab:movimientos"]').click();
    const table = page.locator('table[data-move-rows]');
    await table.waitFor({ state: 'visible', timeout: 20_000 });
    const signature = async () => `${await table.getAttribute('data-move-rows')}|${(await table.locator('tbody tr').first().innerText()).trim()}`;
    const sigBefore = await signature();
    // §22.3: "cambiar el grupo de versiones o el método". Si el grupo por defecto solo tiene un método,
    // se cambia el grupo de versiones.
    await page.getByRole('button', { name: /^Método de aprendizaje/ }).click();
    await page.locator('[role="option"]').first().waitFor({ state: 'visible' });
    let other = page.locator('[role="option"][aria-selected="false"]').first();
    let changed = 'el método';
    if ((await other.count()) === 0) {
      await page.keyboard.press('Escape');
      await page.locator('[role="option"]').first().waitFor({ state: 'detached' });
      await page.getByRole('button', { name: /^Grupo de versiones/ }).click();
      other = page.locator('[role="option"][aria-selected="false"]').first();
      await other.waitFor({ state: 'visible' });
      changed = 'el grupo de versiones';
    }
    c.note(`Movimientos: se cambió ${changed}`);
    await other.click();
    c.ok(await until(async () => (await signature()) !== sigBefore, 10_000), `cambiar ${changed} no cambia las filas de Movimientos`);
  });
}

async function s6(browser: Browser): Promise<void> {
  await isolated(browser, 6, 'Evolución de Eevee', {}, true, async (c, page) => {
    await nav(page, '/pokemon/133/evolucion');
    const children = page.locator('[data-evo-node="eevee"] > ol > li[data-evo-node]');
    await page.locator('[data-evo-node="eevee"]').waitFor({ state: 'visible', timeout: 20_000 });
    await settle(page, 'árbol de Eevee');
    c.ok(await children.count() === 8, `Eevee tiene ${await children.count()} nodos hijos (se esperan 8)`);
    const texts = await children.evaluateAll((lis) => lis.map((li) => {
      const step = li.firstElementChild;
      if (!step || step.children.length < 2) return '';
      return (step.firstElementChild?.textContent ?? '').trim();
    }));
    const spanish = /Subir de nivel|Usar |Amistad|Afecto|Conoce|Intercambio|Equipado|En |Cerca de|de día|de noche|al atardecer|Belleza/;
    texts.forEach((t, i) => { c.ok(t !== '' && spanish.test(t), `el nodo hijo ${i + 1} no tiene condición en español ("${t}")`); });
    c.ok(await toast(page, 'Eeveelución'), 'no aparece el toast "Eeveelución"');
    // Evidencia del árbol completo (Eevee y sus 8 ramas con sus condiciones): se espera a que se vaya el
    // toast y se captura solo la región de la pestaña, entera aunque supere el viewport.
    await page.locator('[role="status"] [data-kind]').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
    const region = page.locator('[role="region"][aria-label="Evolución"]');
    // Las etiquetas del árbol se piden tras 150 ms visibles: se hace visible cada arista (≥ 300 ms) para que
    // las de las ramas de abajo no salgan con el slug en inglés en la captura (R2-1).
    const steps = children.locator(':scope > div');
    for (let i = 0; i < await steps.count(); i++) {
      await steps.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);
    }
    await region.scrollIntoViewIfNeeded();
    await settle(page, 'etiquetas del árbol de Eevee');
    const slugs = ['Fairy', 'Sword Shield', 'Sun Moon'];
    const regionText = () => region.innerText();
    const localized = await until(async () => {
      const t = await regionText();
      return t.includes('Hada') && slugs.every((s) => !t.includes(s));
    }, 15_000);
    const finalText = await regionText();
    c.ok(localized, `el árbol de Eevee conserva etiquetas sin localizar (Hada: ${finalText.includes('Hada')}; ${slugs.filter((s) => finalText.includes(s)).join(', ') || 'ningún slug'})`);
    const sylveon = await page.locator('[data-evo-node="sylveon"]').innerText().catch(() => '');
    c.ok(sylveon.includes('Hada'), `la arista de Sylveon no dice "Hada" ("${sylveon.replace(/\s+/g, ' ').trim()}")`);
    await shot(page, '05-eevee.png', { element: region });
  });
}

async function s7(browser: Browser): Promise<void> {
  await isolated(browser, 7, 'Tabla de tipos y logro persistente', {}, true, async (c, page) => {
    await nav(page, '/tipos');
    const cells = page.locator('td[data-tc-row]');
    c.ok(await until(async () => (await cells.count()) === 324, 30_000), `la tabla no tiene 18×18 celdas (${await cells.count()})`);
    const label = async (prefix: string) => (await page.locator(`td[aria-label^="${prefix}"]`).first().getAttribute('aria-label')) ?? '';
    c.ok((await label('Fuego contra Planta')).includes('×2'), 'Fuego→Planta no es ×2');
    c.ok((await label('Normal contra Fantasma')).includes('×0'), 'Normal→Fantasma no es ×0');
    c.ok((await label('Agua contra Fuego')).includes('×2'), 'Agua→Fuego no es ×2');
    c.ok(await toast(page, 'Maestro de tipos'), 'no aparece el toast "Maestro de tipos"');
    await shot(page, '06-tipos.png');
    await nav(page, '/logros');
    await reload(page);
    const card = page.locator('[data-ach-id="maestro-tipos"]');
    await card.waitFor({ state: 'visible' });
    c.ok((await card.getAttribute('data-unlocked')) === 'true', 'maestro-tipos no está desbloqueado tras recargar');
    c.ok(await page.getByText('40 / 1000 G', { exact: true }).isVisible(), 'la cabecera de Logros no muestra "40 / 1000 G"');
    c.ok((await page.locator('.topbar').innerText()).includes('40 G'), 'la barra superior no muestra "40 G"');
  });
}

async function s8(browser: Browser): Promise<void> {
  await isolated(browser, 8, 'Errores 404', {}, true, async (c, page) => {
    for (const path of ['/pokemon/no-existe-xyz', '/ruta-inexistente']) {
      await nav(page, path);
      const panel = errorPanel(page);
      await panel.first().waitFor({ state: 'visible', timeout: 20_000 });
      const text = await panel.first().innerText();
      c.ok(text.includes('Algo salió mal.') && text.includes('Código: 404'), `${path}: falta "Algo salió mal." o "Código: 404"`);
      for (const b of ['Reintentar', 'Atrás', 'Ir a Inicio']) {
        c.ok(await panel.first().getByText(b, { exact: true }).isVisible(), `${path}: falta "${b}"`);
      }
      // Sobre el error solo quedan las tres pistas base (sin Pestañas, Anterior/Siguiente ni Shiny).
      const hints = await page.locator('[data-hintbar] button').count();
      const core = await page.locator('[data-hintbar] button[data-core]').count();
      c.ok(hints === 3 && core === 3, `${path}: la barra de pistas tiene ${hints} pistas (${core} base); se esperan solo las 3 base`);
      if (path === '/pokemon/no-existe-xyz') {
        await page.keyboard.press('KeyE');                          // RB: no debe cambiar de pestaña sobre el error
        await page.waitForTimeout(300);
        c.ok(await pathname(page) === path, `${path}: E (RB) cambia la URL sobre el error (${await pathname(page)})`);
        await shot(page, '07-error-404.png');
      }
    }
  });
}

async function s9(browser: Browser): Promise<void> {
  await isolated(browser, 9, 'Logros: toast, tarjetas y borrado', {}, true, async (c, page) => {
    await nav(page, '/logros');
    await page.locator('[data-ach-id]').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyG');
    await page.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.keyboard.press('Escape');
    c.ok(await toast(page, 'Guía de bolsillo'), 'no aparece el toast "Guía de bolsillo"');
    await shot(page, '08-logros-toast.png');
    const states = await page.locator('[data-ach-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-unlocked')));
    c.ok(states.length >= 15, `solo hay ${states.length} tarjetas de logro`);
    c.ok(states.every((s) => s === 'true' || s === 'false'), 'hay tarjetas sin estado');
    c.ok(/\d+ \/ 1000 G/.test(await page.locator('main').innerText()), 'la cabecera no muestra el total de G');
    await page.locator('[data-focus-id="ach:reset"]').click();
    const alert = page.locator('[role="alertdialog"]');
    await alert.waitFor({ state: 'visible' });
    c.ok(await until(async () => (await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '')) === 'Cancelar', 1500),
      'el foco inicial del diálogo no está en "Cancelar"');
    await alert.locator('button', { hasText: /^Borrar logros$/ }).click();
    const empty = async () => (await page.getByText('0 / 1000 G', { exact: true }).isVisible())
      && (await page.getByText('0 / 22 logros', { exact: true }).isVisible())
      && (await page.locator('[data-unlocked="true"]').count()) === 0;
    c.ok(await until(empty, 3000), 'tras confirmar no queda "0 / 1000 G", "0 / 22 logros" y ninguna tarjeta desbloqueada');
    await reload(page);
    await page.locator('[data-ach-id]').first().waitFor({ state: 'visible' });
    c.ok(await until(empty, 3000), 'el borrado de logros no persiste al recargar (AC-33)');
  });
}

async function nodeCount(resource: string): Promise<number> {
  const res = await fetch(`${API}${resource}?limit=1`, { signal: AbortSignal.timeout(15_000) });
  const body = await res.json() as { count?: unknown };
  return typeof body.count === 'number' ? body.count : NaN;
}

async function s10(browser: Browser): Promise<void> {
  await isolated(browser, 10, 'Pokédex y listas', {}, true, async (c, page) => {
    // (a) sugerencias
    await nav(page, '/pokemon');
    const box = page.locator('[role="combobox"]');
    await box.waitFor({ state: 'visible' });
    await box.fill('pika');
    c.ok(await until(async () => (await page.locator('[role="option"]', { hasText: 'Pikachu' }).count()) > 0, 20_000),
      '(a) no hay sugerencia con "Pikachu"');
    // (b) número + Enter
    await box.fill('25');
    await box.press('Enter');
    c.ok(await until(async () => pathname(page) === '/pokemon/25', 5000), `(b) Enter con "25" no lleva a /pokemon/25 (${pathname(page)})`);
    // (c) filtros en la URL
    await nav(page, '/pokemon?type=electric&gen=1');
    c.ok(await until(async () => (await page.locator('[data-focus-id="card:25"]').count()) === 1, 30_000), '(c) falta la tarjeta 25');
    c.ok(await page.locator('[data-focus-id="card:152"]').count() === 0, '(c) aparece la tarjeta 152');
    const params = new URL(page.url()).searchParams;
    c.ok(params.get('type') === 'electric' && params.get('gen') === '1', `(c) la URL no conserva type y gen (${page.url()})`);
    // (d) virtualización en /pokemon y /item
    for (const [path, resource, detail] of [['/pokemon', 'pokemon', 'pokemon-species'], ['/item', 'item', 'item']] as const) {
      const total = await nodeCount(resource);
      await nav(page, path);
      const mark = Date.now();
      const rows = page.locator('[data-focus-id^="row:"], [data-focus-id^="card:"]');
      await until(async () => (await rows.count()) > 0, 30_000);
      await settle(page, `lista ${path}`);
      const count = await rows.count();
      const re = new RegExp(`^${API.replace(/[.]/g, '\\.')}${detail}/[^/?]+/?$`);
      const detailRequests = (requestLog.get(page) ?? []).filter((r) => r.t >= mark && re.test(r.url)).length;
      c.ok(count >= Math.min(10, total), `(d) ${path}: solo ${count} elementos pintados`);
      c.ok(count <= 300, `(d) ${path}: ${count} elementos pintados (> 300)`);
      c.ok(count < total, `(d) ${path}: ${count} pintados no es menor que el total ${total} (sin virtualización)`);
      c.ok(detailRequests <= count, `(d) ${path}: ${detailRequests} peticiones a ${detail}/{x} > ${count} pintados`);
      c.note(`(d) ${path}: ${count} pintados de ${total}; ${detailRequests} peticiones a ${detail}/{x}`);
      if (path === '/pokemon') await shot(page, '09-pokedex.png');
    }
    // (e) sin resultados
    await nav(page, '/pokemon?q=zzzzzz');
    c.ok(await until(async () => page.getByText('No se encontró ningún Pokémon', { exact: true }).isVisible(), 20_000),
      '(e) no aparece "No se encontró ningún Pokémon"');
  });
}

async function s11(browser: Browser): Promise<void> {
  await isolated(browser, 11, 'Detalles por grupo, Explorador y "Ver todos"', {}, true, async (c, page) => {
    for (const [group, path] of GROUP_PAGES) {
      await nav(page, path);
      const h1 = page.locator('main h1');
      const shown = await until(async () => h1.first().isVisible(), 20_000);
      await settle(page, path);
      c.ok(shown, `(a) ${path}: no se ve el h1`);
      c.ok(await errorPanel(page).count() === 0, `(a) ${path}: aparece un ErrorPanel`);
      if (path === '/evolution-chain/67') c.ok(await toast(page, 'Eeveelución'), '(a) /evolution-chain/67: no aparece el toast "Eeveelución"');
      await shot(page, `10-grupo-${group}.png`);
    }
    await nav(page, '/api');
    c.ok(await until(async () => (await page.locator('[data-resource-tile]').count()) === 50, 15_000),
      `(b) /api no tiene 50 [data-resource-tile] (${await page.locator('[data-resource-tile]').count()})`);
    await nav(page, '/move-ailment/none');
    const more = page.getByRole('button', { name: /^Ver todos \(\d+\)$/ });
    await more.first().waitFor({ state: 'visible', timeout: 20_000 });
    const label = (await more.first().innerText()).trim();
    const m = /^Ver todos \((\d+)\)$/.exec(label);
    c.ok(m !== null && Number(m[1]) > 100, `(c) el botón "${label}" no cumple N > 100`);
    await more.first().click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible' });
    const maxPos = () => dialog.locator('[aria-posinset]').evaluateAll((els) => Math.max(0, ...els.map((e) => Number(e.getAttribute('aria-posinset')))));
    await until(async () => (await maxPos()) > 0, 5000);
    c.ok((await maxPos()) <= 100, '(c) antes del scroll ya hay filas con aria-posinset > 100');
    await page.locator('[role=dialog] [data-virtual-scroll]').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    c.ok(await until(async () => (await maxPos()) > 100, 5000), '(c) tras el scroll no aparece ninguna fila con aria-posinset > 100');
    await page.keyboard.press('Escape');
    c.ok(await until(async () => (await dialog.count()) === 0, 3000), '(c) Escape no cierra el diálogo');
  });
}

async function s12(browser: Browser): Promise<void> {
  await isolated(browser, 12, 'Móvil 390×844 con toque', { viewport: { width: 390, height: 844 }, hasTouch: true }, true, async (c, page) => {
    const noHScroll = async (where: string) => {
      // Sin funciones con nombre dentro de evaluate: tsx (esbuild keepNames) inyectaría __name, que no existe en la página.
      const r = await page.evaluate(() => ['html', '.topbar', '.hintbar'].map((sel) => {
        const el = document.querySelector(sel);
        return el ? el.scrollWidth <= el.clientWidth : false;
      })).then(([html, topbar, hintbar]) => ({ html: html === true, topbar: topbar === true, hintbar: hintbar === true }));
      c.ok(r.html, `${where}: el documento tiene scroll horizontal`);
      c.ok(r.topbar, `${where}: .topbar desborda en horizontal`);
      c.ok(r.hintbar, `${where}: .hintbar desborda en horizontal`);
    };
    await nav(page, '/');
    await page.waitForSelector('[data-autofocus]');
    await settle(page, 'Inicio móvil');
    await noHScroll('/');
    const hints = await page.locator('.hintbar .hint').evaluateAll((els) => els
      .filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none')
      .map((e) => e.hasAttribute('data-core')));
    c.ok(hints.length === 3 && hints.every(Boolean), `en la barra de pistas se ven ${hints.length} pistas (solo deben verse las 3 [data-core])`);
    c.ok(!(await page.locator('.topbar .gamertag').isVisible()), 'el gamertag de la barra superior es visible en móvil');
    c.ok(!(await page.locator('.topbar .clock').isVisible()), 'el reloj de la barra superior es visible en móvil');
    c.ok(((await page.locator('[data-focus-id="topbar:profile"]').getAttribute('aria-label')) ?? '').includes('Entrenador'),
      'el botón de perfil no incluye el gamertag en su aria-label');
    c.ok(await page.locator('.tileRow').first().evaluate((el) => el.scrollWidth > el.clientWidth), 'la primera TileRow no hace scroll horizontal');
    await shot(page, '11-movil-inicio.png');
    const before = page.url();
    await page.locator('[data-focus-id="tile:pokedex"]').tap();
    c.ok(await until(async () => page.url() !== before, 5000), 'un toque en un tile no navega');
    await nav(page, '/pokemon/25');
    await page.locator('#pokemon-title').waitFor({ state: 'visible', timeout: 20_000 });
    await settle(page, 'ficha móvil');
    await noHScroll('/pokemon/25');
    await shot(page, '12-movil-pikachu.png');
  });
}

async function s13(browser: Browser): Promise<void> {
  await isolated(browser, 13, 'Movimiento reducido', { reducedMotion: 'reduce' }, false, async (c, page, ctx) => {
    // Medición dentro de la página (sin latencia de IPC): instante en que el overlay entra en el DOM
    // (antes o a la vez que es visible) y en que sale. No toca el estado de la app.
    await ctx.addInitScript({
      content: `(() => {
        const SEL = '[role="dialog"][aria-label="PokéBox One, iniciando"]';
        const t = { shown: null, gone: null };
        window.__bootTimes = t;
        new MutationObserver(() => {
          const el = document.querySelector(SEL);
          if (el && t.shown === null) t.shown = performance.now();
          if (!el && t.shown !== null && t.gone === null) t.gone = performance.now();
        }).observe(document, { childList: true, subtree: true });
      })();`,
    });
    const boot = page.locator('[role="dialog"][aria-label="PokéBox One, iniciando"]');
    await nav(page, '/?boot=1');
    await boot.waitFor({ state: 'visible', timeout: 10_000 });
    const t0 = Date.now();
    await boot.waitFor({ state: 'detached', timeout: 5000 });
    const outside = Date.now() - t0;
    const times = await page.evaluate(() => (window as unknown as { __bootTimes: { shown: number | null; gone: number | null } }).__bootTimes);
    const ms = times.shown !== null && times.gone !== null ? Math.round(times.gone - times.shown) : null;
    c.ok(ms !== null && ms <= 1000, `el arranque reducido duró ${ms ?? '?'} ms en la página (> 1 s)`);
    c.note(`arranque reducido: ${ms ?? '?'} ms en la página (inserción → retirada); ${outside} ms medidos desde Node con IPC`);
    c.ok(await page.locator('html[data-motion="reduced"]').count() === 1, 'html no tiene data-motion="reduced"');
    await settle(page, 'Inicio reducido');
    const faces = () => page.locator('[data-live]').evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    const before = await faces();
    c.ok(before.length > 0, 'no hay live tiles en Inicio');
    await page.waitForTimeout(7000);
    c.ok(JSON.stringify(await faces()) === JSON.stringify(before), 'la cara de algún live tile cambió en 7 s con movimiento reducido');
    await until(async () => ((await activeId(page)) ?? '').startsWith('tile:'), 3000);
    const from = await activeId(page);
    await page.keyboard.press('ArrowRight');
    c.ok(await until(async () => {
      const id = await activeId(page);
      return id !== from && (id ?? '').startsWith('tile:');
    }, 1500), 'ArrowRight no enfoca otro tile');
    await page.waitForTimeout(250);
    const style = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { shadow: getComputedStyle(el).boxShadow, transform: getComputedStyle(el).transform } : { shadow: 'none', transform: 'x' };
    });
    c.ok(style.shadow !== 'none' && style.shadow !== '', 'con movimiento reducido el anillo de foco desaparece');
    c.ok(style.transform === 'none', `con movimiento reducido el tile enfocado tiene transform ${style.transform}`);
    await shot(page, '13-movimiento-reducido.png');
  });
}

async function s14(browser: Browser): Promise<void> {
  await isolated(browser, 14, 'Sin conexión', {}, true, async (c, page, ctx) => {
    await nav(page, '/pokemon/25');
    await page.locator('#pokemon-title').waitFor({ state: 'visible', timeout: 20_000 });
    await settle(page, 'ficha antes de desconectar');
    offlineAt.set(ctx, Date.now());
    await ctx.setOffline(true);
    await page.locator('[data-hintbar] button[aria-label^="Atrás"]').click();         // a Inicio desde la app
    c.ok(await until(async () => pathname(page) === '/', 5000), 'la pista "Atrás" no lleva a Inicio');
    const banner = page.locator('[role="status"] p', { hasText: 'Sin conexión' }).first();
    c.ok(await until(async () => banner.isVisible(), 5000), 'no se ve el banner "Sin conexión"');
    for (const id of ['tile:pokemon-del-dia', 'tile:baya-del-dia']) {
      const tile = page.locator(`[data-focus-id="${id}"]`).first();
      const ok = c.ok(await until(async () => (await tile.count()) === 1 && (await tile.getAttribute('data-live')) === null, 20_000),
        `${id} no queda en cara estática sin conexión`);
      if (!ok) c.note(`Inicio sin conexión (${id}): ${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 200)}`);
    }
    c.ok(await errorPanel(page).count() === 0, 'Inicio sin conexión muestra un ErrorPanel');
    await page.evaluate(() => { history.back(); });
    c.ok(await until(async () => pathname(page) === '/pokemon/25', 5000), 'no se vuelve a /pokemon/25');
    c.ok(await until(async () => page.locator('#pokemon-title').isVisible(), 10_000), 'la ficha no se ve desde la caché');
    c.ok(await errorPanel(page).count() === 0, 'la ficha sin conexión muestra un ErrorPanel');
    c.ok(await banner.isVisible(), 'el banner "Sin conexión" no sigue visible en la ficha');
    await shot(page, '14-sin-conexion.png');
  });
}

async function s15(browser: Browser): Promise<void> {
  await isolated(browser, 15, 'Mando simulado', {}, true, async (c, page, ctx) => {
    // El init script SOLO instala el mando falso; gamepadconnected se despacha después (§22.3).
    // Como texto: así tsx no le añade helpers (__name) que no existen en la página.
    await ctx.addInitScript({
      content: `(() => {
        const pad = { index: 0, id: 'fake', connected: true, mapping: 'standard', timestamp: 0,
          axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
        window.__pad = pad;
        navigator.getGamepads = () => [pad];
      })();`,
    });
    // Diagnóstico (solo lectura): altas y bajas de [role=dialog] con su instante, para el informe.
    await ctx.addInitScript({
      content: `(() => {
        const log = []; window.__dialogLog = log; let n = 0;
        new MutationObserver(() => {
          const m = document.querySelectorAll('[role="dialog"]').length;
          if (m !== n) { log.push(Math.round(performance.now()) + ':' + n + '→' + m + ' ' + location.pathname); n = m; }
        }).observe(document, { childList: true, subtree: true });
      })();`,
    });
    const dialogLog = () => page.evaluate(() => ((window as unknown as { __dialogLog?: string[] }).__dialogLog ?? []).join(', '));
    const press = async (i: number) => {
      // El bucle del mando va con requestAnimationFrame (§11.5). Mientras una View Transition espera su
      // actualización, Chromium suspende los fotogramas: se espera a que vuelvan a correr (2 rAF) para que
      // los 100 ms de pulsación caigan sobre fotogramas reales, como supone §22.3.
      // Además, tras los 100 ms de cada fase se esperan 2 fotogramas: si el hilo estuvo ocupado (p. ej.
      // montando la Guía), el bucle llega a ver el flanco igualmente.
      const frames = () => page.evaluate(() => new Promise<void>((r) => { requestAnimationFrame(() => { requestAnimationFrame(() => r()); }); }));
      await frames();
      await page.evaluate((n) => { (window as unknown as { __pad: { buttons: unknown[] } }).__pad.buttons[n] = { pressed: true, touched: true, value: 1 }; }, i);
      await page.waitForTimeout(100);
      await frames();
      await page.evaluate((n) => { (window as unknown as { __pad: { buttons: unknown[] } }).__pad.buttons[n] = { pressed: false, touched: false, value: 0 }; }, i);
      await page.waitForTimeout(100);
      await frames();
    };
    await nav(page, '/');
    await page.waitForSelector('[data-autofocus]');
    await page.evaluate(() => { dispatchEvent(new Event('gamepadconnected')); });
    c.ok(await toast(page, 'Mando conectado', 5000), 'no aparece el toast "Mando conectado"');
    await until(async () => ((await activeId(page)) ?? '').startsWith('tile:'), 3000);
    const before = await activeId(page);
    await press(15);
    c.ok(await until(async () => (await activeId(page)) !== before, 1500), `D-pad derecha no cambia el foco (${before})`);
    let url = page.url();
    await press(0);
    c.ok(await until(async () => page.url() !== url, 5000), 'A no cambia la URL');
    c.ok(await page.locator('html[data-input="gamepad"]').count() === 1, 'html no tiene data-input="gamepad"');
    await nav(page, '/');
    await page.waitForSelector('[data-autofocus]');
    await page.waitForTimeout(300);
    await press(5);
    c.ok(await until(async () => pathname(page) === '/hub/pokedex', 5000), `RB no lleva a /hub/pokedex (${pathname(page)})`);
    const dialog = page.locator('[role="dialog"]');
    const tPress = await page.evaluate(() => Math.round(performance.now()));
    await press(9);
    const opened = c.ok(await until(async () => dialog.first().isVisible(), 3000), 'Menú no abre [role=dialog]');
    if (!opened) c.note(`diagnóstico Menú: pulsado en t=${tPress}; diálogos: ${await dialogLog()}; activo=${await activeId(page)}`);
    await press(1);
    c.ok(await until(async () => (await dialog.count()) === 0, 3000), 'B no cierra el diálogo');
    await nav(page, '/pokemon');
    await page.waitForSelector('[data-autofocus]', { timeout: 30_000 });
    await page.waitForTimeout(300);
    await press(3);
    c.ok(await until(async () => page.evaluate(() => document.activeElement?.getAttribute('role') === 'combobox'), 3000),
      'Y no pone el foco en el buscador');
    url = page.url();
    await press(1);
    c.ok(await until(async () => page.evaluate(() => {
      const a = document.activeElement;
      return !(a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement);
    }), 3000), 'B no saca el foco del campo de texto');
    c.ok(pathname(page) === '/pokemon' && page.url() === url, `B en el buscador cambió la URL (${page.url()})`);
  });
}

async function s16(browser: Browser): Promise<void> {
  await isolated(browser, 16, 'Ajustes: acento, perfil, tema y sonido', {}, true, async (c, page) => {
    const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase());
    const gamertag = () => page.locator('.topbar .gamertag').innerText().then((t) => t.trim());
    const MSG = 'Usa de 1 a 15 letras, números, espacios, _ o -';
    // (a) acento
    await nav(page, '/ajustes?seccion=personalizacion');
    const swatches = page.locator('main [role="radiogroup"] [role="radio"][aria-checked="false"][aria-label]');
    await swatches.first().waitFor({ state: 'visible' });
    const a0 = await accent();
    await page.locator('main [role="radio"][aria-label="Cobalto"]').click();
    c.ok(await until(async () => (await accent()) !== a0, 500), '(a) --accent no cambia al instante');
    const a1 = await accent();
    c.ok(await toast(page, 'A mi estilo'), '(a) no aparece el toast "A mi estilo"');
    await reload(page);
    await page.locator('main h2').first().waitFor({ state: 'visible' });
    c.ok((await accent()) === a1, '(a) el acento no persiste al recargar');
    // (b)–(d) gamertag
    await nav(page, '/ajustes?seccion=perfil');
    const input = page.locator('input[autocomplete="nickname"]');
    const save = page.getByRole('button', { name: 'Guardar', exact: true }).first();
    const invalid = async (step: string) => {
      c.ok(await until(async () => page.getByText(MSG, { exact: true }).isVisible(), 3000), `${step} no aparece "${MSG}"`);
      c.ok((await input.getAttribute('aria-invalid')) === 'true', `${step} el campo no tiene aria-invalid="true"`);
    };
    await input.fill('');
    await save.click();
    await invalid('(b)');
    await input.fill('A'.repeat(16));
    await save.click();
    await invalid('(c)');
    await reload(page);
    await input.waitFor({ state: 'visible' });
    c.ok((await gamertag()) === 'Entrenador', `(c) tras recargar el gamertag es "${await gamertag()}" y no "Entrenador"`);
    await input.fill('Ash_01');
    await save.click();
    c.ok(await until(async () => (await gamertag()) === 'Ash_01', 3000), '(d) la barra superior no muestra "Ash_01"');
    await reload(page);
    await input.waitFor({ state: 'visible' });
    c.ok((await gamertag()) === 'Ash_01', '(d) "Ash_01" no persiste al recargar');
    // (e) tema claro y efectos desactivados
    await nav(page, '/ajustes?seccion=personalizacion');
    await page.locator('main [role="radio"]', { hasText: 'Claro' }).click();
    await nav(page, '/ajustes?seccion=sonido');
    const sw = page.getByRole('switch', { name: 'Efectos de sonido' });
    await sw.waitFor({ state: 'visible' });
    if ((await sw.getAttribute('aria-checked')) === 'true') await sw.click();
    c.ok(await until(async () => (await sw.getAttribute('aria-checked')) === 'false', 2000), '(e) el interruptor de efectos no se desactiva');
    await reload(page);
    await sw.waitFor({ state: 'visible' });
    c.ok(await page.locator('html[data-theme="light"]').count() === 1, '(e) tras recargar no hay html[data-theme=light]');
    c.ok((await sw.getAttribute('aria-checked')) === 'false', '(e) el silencio no persiste al recargar (AC-34)');
    await shot(page, '15-ajustes.png');
  });
}

async function download(page: Page, click: () => Promise<void>): Promise<Download> {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 15_000 }), click()]);
  return d;
}

const pick = async (page: Page, id: string, value: string) => {
  await page.locator(`#${id}`).click();
  const option = page.locator(`[role="option"][data-value="${value}"]`);
  await option.waitFor({ state: 'visible' });
  await option.click();
  await option.waitFor({ state: 'detached' });
};

async function s17(browser: Browser): Promise<void> {
  await isolated(browser, 17, 'Estadísticas, gráficas, creados y Retro', {}, true, async (c, page) => {
    // (a) estadísticas
    await nav(page, '/estadisticas');
    const habitats = page.locator('[data-stats-table="habitats"] tbody tr');
    c.ok(await until(async () => (await habitats.count()) > 0, 40_000), '(a) la tabla de hábitats no carga');
    for (const id of ['colores', 'grupos-huevo']) {
      c.ok(await until(async () => (await page.locator(`[data-stats-table="${id}"]`).innerText()).includes('Más común:'), 20_000),
        `(a) ${id}: falta "Más común:"`);
    }
    const pct = await habitats.evaluateAll((rows) => rows.map((r) => (r.lastElementChild?.textContent ?? '').trim()));
    const sum = pct.reduce((s, t) => s + Number(t.replace(/\./g, '').replace(',', '.')), 0);
    c.ok(sum >= 99.5 && sum <= 100.5, `(a) los porcentajes de hábitats suman ${sum.toFixed(2)} (AC-35)`);
    await settle(page, 'estadísticas');
    await shot(page, '16-estadisticas.png');
    // (b) gráficas y descargas
    await nav(page, '/graficas');
    const svgs = page.locator('section[data-chart] svg[role="img"]');
    c.ok(await until(async () => (await svgs.count()) === 4, 40_000), `(b) hay ${await svgs.count()} SVG de gráfica (se esperan 4)`);
    const first = page.locator('section[data-chart]').first();
    for (const [button, ext] of [['Exportar SVG', '.svg'], ['CSV', '.csv'], ['JSON', '.json']] as const) {
      const d = await download(page, () => first.getByRole('button', { name: button, exact: true }).click());
      c.ok(d.suggestedFilename().endsWith(ext), `(b) "${button}" descarga "${d.suggestedFilename()}" (se espera ${ext})`);
      if (ext === '.svg') {
        const path = await d.path();
        const svg = readFileSync(path, 'utf8');
        c.ok(svg.includes('<svg'), '(b) el SVG descargado no contiene <svg');
        c.ok(!svg.includes('var('), '(b) el SVG descargado contiene var( (AC-36)');
      }
    }
    await settle(page, 'gráficas');
    await shot(page, '17-graficas.png');
    // (c) crear
    await nav(page, '/crear');
    const submit = page.locator('form button[type="submit"]');
    c.ok(await until(async () => submit.isEnabled(), 40_000), '(c) el botón Crear no llega a habilitarse');
    await submit.click();
    c.ok(await until(async () => page.locator('#create-name-error').getByText('Revise su ortografía', { exact: true }).isVisible(), 3000),
      '(c) el nombre vacío no muestra "Revise su ortografía"');
    c.ok((await page.locator('#create-name').getAttribute('aria-invalid')) === 'true', '(c) el nombre vacío no tiene aria-invalid="true"');
    await page.locator('#create-name').fill('Pruebamon');
    await pick(page, 'create-color', 'green');
    await pick(page, 'create-type1', 'grass');
    await pick(page, 'create-egg1', 'plant');
    await pick(page, 'create-habitat', 'grassland');
    await submit.click();
    c.ok(await until(async () => /^\/pokemon\/\d+$/.test(pathname(page)), 5000), `(c) Crear no lleva a la ficha (${pathname(page)})`);
    const createdId = Number(pathname(page).split('/')[2]);
    c.ok(createdId >= 1026 && createdId <= 9999, `(c) ID creado ${createdId} fuera de 1026–9999`);
    const card = page.locator('[data-created]');
    const checkCard = async (step: string) => {
      c.ok(await until(async () => (await card.count()) === 1, 30_000), `${step} el creado no aparece en /pokemon?q=pruebamon`);
      if ((await card.count()) !== 1) return;
      c.ok((await card.innerText()).includes('Creado'), `${step} la tarjeta no lleva la insignia "Creado"`);
      const id = Number(((await card.getAttribute('data-focus-id')) ?? '').replace('card:', ''));
      c.ok(id >= 1026 && id <= 9999, `${step} la tarjeta tiene ID ${id}`);
    };
    await nav(page, '/pokemon?q=pruebamon');
    await checkCard('(c)');
    await reload(page);
    await checkCard('(c) tras recargar:');
    // (d) borrar
    await nav(page, '/crear');
    await page.locator('li', { hasText: 'Pruebamon' }).getByRole('button', { name: 'Borrar', exact: true }).click();
    const alert = page.locator('[role="alertdialog"]');
    c.ok(await until(async () => alert.isVisible(), 3000), '(d) "Borrar" no abre el ConfirmDialog');
    await alert.locator('button', { hasText: /^Borrar$/ }).click();
    await alert.waitFor({ state: 'detached' });
    await nav(page, '/pokemon?q=pruebamon');
    c.ok(await until(async () => page.getByText('No se encontró ningún Pokémon', { exact: true }).isVisible(), 20_000),
      '(d) tras borrar no aparece "No se encontró ningún Pokémon"');
    // (e) retro
    await nav(page, '/retro');
    c.ok(await until(async () => page.getByText('################# ¡Bienvenido a la PokéAPI! #################', { exact: true }).isVisible(), 10_000),
      '(e) falta el banner original');
    c.ok(await until(async () => (await page.locator('[data-focus-id^="retro:"]').count()) === 6, 10_000), '(e) no hay 6 opciones en el menú');
    const text = await page.locator('main').innerText();
    for (const who of ['TheYouka', 'PeekoDan', 'Janrna']) c.ok(text.includes(who), `(e) faltan los créditos de ${who}`);
    await page.waitForTimeout(500);
    await shot(page, '18-retro.png');
  });
}

async function s18(browser: Browser): Promise<void> {
  await isolated(browser, 18, 'WASD dentro del buscador', {}, true, async (c, page) => {
    await nav(page, '/pokemon');
    const box = page.locator('[role="combobox"]');
    await box.waitFor({ state: 'visible' });
    await box.focus();
    await page.keyboard.type('wasd');
    await page.waitForTimeout(400);
    c.ok((await box.inputValue()).includes('wasd'), `el campo no contiene "wasd" ("${await box.inputValue()}")`);
    c.ok(await page.evaluate(() => document.activeElement?.getAttribute('role') === 'combobox'), 'el foco salió del combobox');
    c.ok(pathname(page) === '/pokemon', `la ruta cambió a ${pathname(page)} (AC-29)`);
  });
}

async function s19(browser: Browser): Promise<void> {
  await isolated(browser, 19, 'Comparar Pikachu y Raichu', {}, true, async (c, page) => {
    await nav(page, '/comparar?a=pikachu&b=raichu');
    await page.locator('[data-compare-diff]').waitFor({ state: 'visible', timeout: 20_000 });
    c.ok(await page.locator('[data-compare-side="a"]').isVisible() && await page.locator('[data-compare-side="b"]').isVisible(), 'faltan los lados a y b');
    c.ok(await page.locator('[data-compare-side="a"] [data-stat]').count() === 6, 'el lado a no tiene 6 barras');
    c.ok(await page.locator('[data-compare-side="b"] [data-stat]').count() === 6, 'el lado b no tiene 6 barras');
    c.ok(await page.locator('[data-compare-diff] [data-stat]').count() === 6, 'no hay 6 diferencias');
    const p = new URL(page.url()).searchParams;
    c.ok(p.get('a') === 'pikachu' && p.get('b') === 'raichu', `la URL no conserva a=pikachu y b=raichu (${page.url()})`);
    c.ok(await toast(page, 'Rivales'), 'no aparece el toast "Rivales"');
    await settle(page, 'comparar');
    await shot(page, '19-comparar.png');
  });
}

async function s20(browser: Browser): Promise<void> {
  await isolated(browser, 20, 'Partida rápida', {}, true, async (c, page) => {
    const t0 = Date.now();
    await nav(page, '/partida-rapida');
    const reached = await until(async () => /^\/pokemon\/\d+$/.test(pathname(page)), Math.max(0, 10_000 - (Date.now() - t0)));
    c.ok(reached, `en 10 s la ruta es ${pathname(page)} y no /pokemon/{n}`);
    c.ok(await until(async () => page.locator('main h1').first().isVisible(), 15_000), 'no hay h1 visible');
    await settle(page, 'partida rápida');
    c.ok(await errorPanel(page).count() === 0, 'aparece un ErrorPanel');
  });
}

async function s21(browser: Browser): Promise<void> {
  await isolated(browser, 21, 'Idioma de los datos en inglés', {}, true, async (c, page) => {
    const electric = page.locator('[data-type="electric"]').first();
    await nav(page, '/pokemon/25');
    c.ok(await until(async () => (await electric.innerText()).includes('Eléctrico'), 20_000), '(a) [data-type=electric] no contiene "Eléctrico"');
    await nav(page, '/ajustes?seccion=idioma');
    await page.locator('#data-lang-picker').click();
    const en = page.locator('[role="option"][data-value="en"]');
    await en.waitFor({ state: 'visible' });
    await en.click();
    c.ok(await toast(page, 'Políglota'), '(b) no aparece el toast "Políglota"');
    await nav(page, '/pokemon/25');
    c.ok(await until(async () => (await electric.innerText()).includes('Electric'), 20_000), '(c) [data-type=electric] no contiene "Electric"');
    const hints = await page.locator('.hintbar').innerText();
    c.ok(hints.includes('Seleccionar') && hints.includes('Atrás'), '(c) la barra de pistas no sigue en español');
    c.ok((await page.locator('[data-focus-id="tab:resumen"]').innerText()).trim() === 'Resumen', '(c) la pestaña "Resumen" cambió de texto');
    await settle(page, 'ficha en inglés');
    await shot(page, '20-idioma-en.png');
  });
}

// ---------------------------------------------------------------- principal
async function main(): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  for (const name of [...EXPECTED_SHOTS, 'visual-report.json']) rmSync(join(SHOTS, name), { force: true });
  console.log(`visual: ${BASE.origin} (Chromium headless)`);
  const browser = await chromium.launch({ headless: true });
  try {
    report.browser = browser.version();
    await sessionScenarios(browser);
    for (const run of [s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21]) await run(browser);
  } finally {
    await browser.close();
  }
}

function finish(): void {
  report.finishedAt = new Date().toISOString();
  report.missingScreenshots = EXPECTED_SHOTS.filter((n) => !existsSync(join(SHOTS, n)));
  const ok = report.scenarios.filter((s) => s.status === 'OK').length;
  const fail = report.scenarios.length - ok;
  const failed = fail > 0 || report.scenarios.length !== 21 || report.appErrors.length > 0
    || report.unexpectedFailures.length > 0 || report.missingScreenshots.length > 0 || report.scriptErrors.length > 0;
  report.summary = { ok, fail, appErrors: report.appErrors.length, unexpectedFailures: report.unexpectedFailures.length, exitCode: failed ? 1 : 0 };
  mkdirSync(SHOTS, { recursive: true });
  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log('');
  console.log(`Escenarios: ${ok} OK · ${fail} FALLO (de ${report.scenarios.length})`);
  console.log(`Petición del escenario 5: ${report.scenario5.apiRequests ?? 'N/D'} a pokeapi.co/api/v2 (límite 40, esperado 17–19)`);
  console.log(`Errores de la app (pageerror + console.error): ${report.appErrors.length}`);
  for (const e of report.appErrors) console.log(`  [${e.scenario}] ${e.type}: ${e.text}`);
  console.log(`Fallos inesperados: ${report.unexpectedFailures.length}`);
  for (const e of report.unexpectedFailures) console.log(`  [${e.scenario}] ${e.detail} ${e.url}`);
  console.log(`Fallos esperados: ${report.expectedFailures.length} · sin conexión: ${report.offlineExpected.length} · cancelados por navegación: ${report.navigationCancels.length} · otros (no API): ${report.otherFailures.length}`);
  console.log(`Capturas: ${report.screenshots.length}; faltan: ${report.missingScreenshots.length ? report.missingScreenshots.join(', ') : 'ninguna'}`);
  console.log(`Informe: ${REPORT}`);
  process.exitCode = failed ? 1 : 0;
}

main()
  .catch((e: unknown) => {
    report.scriptErrors.push(`escenario ${current}: ${e instanceof Error ? e.message : String(e)}`);
    console.error(e);
  })
  .finally(finish);
