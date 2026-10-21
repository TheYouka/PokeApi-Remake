// Smoke contra la PokeAPI en vivo (design.md §22.2, VER-2). Node puro: no abre ningún puerto.
// Uso: npm.cmd run smoke                 → "105 OK · 0 FALLO · 1 N/D" (más los AVISO que haya)
//      npm.cmd run smoke -- --force-fail → añade una comprobación que falla a propósito (AC-8)
import { createPokeApiClient, RESOURCE_KEYS } from '../src/api/index';
import {
  BASE_URL, RESOURCES, displayCode, parseResourceUrl,
  type APIResource, type NamedAPIResource, type ResourceKey,
} from '../src/api/index';

type Result = 'OK' | 'FALLO' | 'AVISO' | 'N/D';
interface Row { order: number; check: string; result: Result; ms: number; detail: string }
interface Outcome { result: Result; detail: string }
type AnyRef = NamedAPIResource<ResourceKey> | APIResource<ResourceKey>;

const forceFail = process.argv.includes('--force-fail');
const client = createPokeApiClient({ maxConcurrency: 4, persistent: null });
const rows: Row[] = [];

const errorDetail = (e: unknown) => `${displayCode(e)}: ${e instanceof Error ? e.message : String(e)}`;
const ok = (detail: string): Outcome => ({ result: 'OK', detail });
const fail = (detail: string): Outcome => ({ result: 'FALLO', detail });

/** Ejecuta una comprobación, mide su tiempo y la registra (`order` fija su fila). Una excepción es FALLO. */
async function check(order: number, name: string, fn: () => Promise<Outcome>): Promise<Outcome> {
  const t0 = performance.now();
  let out: Outcome;
  try {
    out = await fn();
  } catch (e) {
    out = fail(errorDetail(e));
  }
  rows.push({ order, check: name, result: out.result, ms: Math.round(performance.now() - t0), detail: out.detail });
  return out;
}

/** Pool propio: como mucho `size` trabajos a la vez. */
async function runPool(jobs: (() => Promise<unknown>)[], size: number): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++]!;
      await job();
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, jobs.length) }, worker));
}

// 1. Índice en vivo: toda clave de RESOURCES debe existir; las extra (salvo meta) son AVISO.
async function indexCheck(): Promise<void> {
  let extra: string[] = [];
  await check(0, 'índice /api/v2/: contiene los 50 recursos', async () => {
    const idx = await client.getIndex();
    const missing = RESOURCE_KEYS.filter((k) => !Object.hasOwn(idx, k));
    extra = Object.keys(idx).filter((k) => k !== 'meta' && !Object.hasOwn(RESOURCES, k));
    return missing.length > 0 ? fail(`faltan: ${missing.join(', ')}`) : ok(`${Object.keys(idx).length} claves`);
  });
  for (const k of extra) {
    await check(0.5, `índice: clave extra '${k}'`, async () => ({ result: 'AVISO', detail: 'no está en RESOURCES' }));
  }
}

// 2. Por cada recurso: list(r, {limit: 5}) y resolve(results[0]).
async function resourceCheck(r: ResourceKey, i: number): Promise<void> {
  let ref: AnyRef | undefined;
  const listed = await check(1 + i * 2, `${r}: list(limit 5)`, async () => {
    const list = await client.list(r, { limit: 5 });
    ref = list.results[0];
    if (!(list.count > 0) || !ref) return fail(`count=${list.count} results=${list.results.length}`);
    const parsed = parseResourceUrl(ref.url);
    if (!parsed || parsed.resource !== r) return fail(`URL no válida: ${ref.url}`);
    return ok(`count=${list.count} · ${ref.url.slice(BASE_URL.length)}`);
  });
  await check(2 + i * 2, `${r}: resolve(results[0])`, async () => {
    const target = ref;
    if (listed.result !== 'OK' || !target) return fail('sin referencia (falló la lista)');
    const parsed = parseResourceUrl(target.url);
    if (!parsed) return fail(`URL no válida: ${target.url}`);
    const detail = await client.resolve<ResourceKey>(target);
    if (detail.id !== parsed.id) return fail(`id ${detail.id} ≠ ${parsed.id}`);
    if ('name' in target) {
      const name = 'name' in detail ? detail.name : undefined;
      if (name !== target.name) return fail(`name ${String(name)} ≠ ${target.name}`);
      return ok(`id=${detail.id} · ${name}`);
    }
    return ok(`id=${detail.id}`);
  });
}

// 3. Especiales
const S = 1000;
const specials: (() => Promise<unknown>)[] = [
  () => check(S + 1, "get('pokemon', 25): pikachu, eléctrico", async () => {
    const p = await client.get('pokemon', 25);
    const types = p.types.map((t) => t.type.name);
    const d = `${p.name} · ${types.join('/')}`;
    return p.name === 'pikachu' && types.includes('electric') ? ok(d) : fail(d);
  }),
  () => check(S + 2, 'pokemon-species/133 → evolution_chain: 67 con ≥ 8 ramas', async () => {
    const species = await client.get('pokemon-species', 133);
    const chain = await client.resolve(species.evolution_chain);
    const branches = chain.chain.evolves_to.length;
    const d = `id=${chain.id} · ${branches} ramas`;
    return chain.id === 67 && branches >= 8 ? ok(d) : fail(d);
  }),
  () => check(S + 3, 'getPokemonEncounters(25): > 0', async () => {
    const enc = await client.getPokemonEncounters(25);
    return enc.length > 0 ? ok(`${enc.length} áreas`) : fail('0 áreas');
  }),
  () => check(S + 4, 'getMeta(): deploy_date', async () => {
    const meta = await client.getMeta();
    return meta.deploy_date ? ok(`deploy_date=${meta.deploy_date} · ${meta.hash.slice(0, 7)}`) : fail('deploy_date vacío');
  }),
  () => check(S + 5, 'item-price/ (informativo, A-2)', async () => {
    // Petición directa e informativa: el recurso no existe en la API y nunca cuenta como fallo.
    try {
      const res = await fetch(`${BASE_URL}item-price/`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15 * 1000),
      });
      await res.text();
      const is2xx = res.status >= 200 && res.status <= 299;
      return { result: 'N/D', detail: `HTTP ${res.status}${is2xx ? ' (inesperado: 2xx)' : ' (esperado ≠ 2xx)'}` };
    } catch (e) {
      return { result: 'N/D', detail: `sin respuesta: ${e instanceof Error ? e.message : String(e)}` };
    }
  }),
];

// 4. --force-fail: se espera que exista, así que falla a propósito.
if (forceFail) {
  specials.push(() => check(S + 6, "--force-fail: get('pokemon', 'no-existe-xyz') debería existir", async () => {
    const p = await client.get('pokemon', 'no-existe-xyz');
    return ok(p.name);
  }));
}

function printTable(): void {
  const head = ['#', 'Comprobación', 'Resultado (OK/FALLO/AVISO/N/D)', 'ms', 'Detalle'];
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  const body = sorted.map((r, i) => [String(i + 1), r.check, r.result, String(r.ms), r.detail]);
  const widths = head.map((h, c) => Math.max(h.length, ...body.map((row) => row[c]!.length)));
  const line = (cells: string[]) =>
    cells.map((cell, c) => (c === 0 || c === 3 ? cell.padStart(widths[c]!) : cell.padEnd(widths[c]!))).join(' | ').trimEnd();
  console.log(line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('-|-'));
  for (const row of body) console.log(line(row));
}

async function main(): Promise<void> {
  const t0 = performance.now();
  await indexCheck();
  await runPool([...RESOURCE_KEYS.map((r, i) => () => resourceCheck(r, i)), ...specials], 4);
  printTable();
  const count = (r: Result) => rows.filter((x) => x.result === r).length;
  console.log('');
  console.log(
    `Resumen: ${count('OK')} OK · ${count('FALLO')} FALLO · ${count('N/D')} N/D · ${count('AVISO')} AVISO` +
      ` (${rows.length} comprobaciones en ${Math.round(performance.now() - t0)} ms)`,
  );
  if (count('FALLO') > 0) process.exitCode = 1;
}

main().catch((e: unknown) => {
  console.error(`Error inesperado del smoke: ${errorDetail(e)}`);
  process.exitCode = 1;
});
