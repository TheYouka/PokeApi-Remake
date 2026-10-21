import { PokeApiError } from './errors';

/** Respuesta correcta: el texto tal cual (para la caché persistente) y su JSON ya parseado. */
export interface HttpOk { text: string; data: unknown }
export type HttpAttemptResult = { ok: HttpOk } | { retryInMs: number } | { fail: PokeApiError };

export interface HttpAttemptOptions {
  fetchImpl: typeof fetch;
  timeoutMs: number;
  maxRetries: number;
  isOffline: () => boolean;
  /** Para tests: fuente del jitter (0–1). */
  random?: () => number;
}

/** `fetch` global envuelto: así nunca se invoca con un `this` distinto de undefined. */
export const defaultFetch: typeof fetch = (input, init) => fetch(input, init);

/** Backoff del reintento `n` (1, 2): 400 ms × 3^(n−1) + jitter de 0 a 200 ms. */
export const backoffMs = (n: number, random: () => number = Math.random) =>
  400 * 3 ** (n - 1) + Math.floor(random() * 201);

/**
 * UN intento de red (§4.6): AbortController propio con timeout, `Accept: application/json` y nada más.
 * Es el único sitio de `src/` que llama a la red. El `signal` de los llamadores no llega aquí (§4.4).
 */
export async function httpAttempt(url: string, path: string, n: number, o: HttpAttemptOptions): Promise<HttpAttemptResult> {
  const retryOr = (err: PokeApiError): HttpAttemptResult =>
    n <= o.maxRetries ? { retryInMs: backoffMs(n, o.random) } : { fail: err };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), o.timeoutMs);
  let status: number;
  let okStatus: boolean;
  let text: string;
  try {
    const doFetch = o.fetchImpl;
    const res = await doFetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    status = res.status;
    okStatus = res.ok;
    text = await res.text();
  } catch (cause) {
    if (controller.signal.aborted) return retryOr(new PokeApiError('TIMEOUT', path, undefined, { cause }));
    const code = o.isOffline() ? 'OFFLINE' : 'NETWORK';
    return retryOr(new PokeApiError(code, path, undefined, { cause }));
  } finally {
    clearTimeout(timer);
  }

  if (status === 404) return { fail: new PokeApiError('NOT_FOUND', path, 404) };
  if (status === 429) return { fail: new PokeApiError('HTTP', path, 429) };
  if (status >= 500) return retryOr(new PokeApiError('HTTP', path, status));
  if (!okStatus) return { fail: new PokeApiError('HTTP', path, status) };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (cause) {
    return { fail: new PokeApiError('PARSE', path, status, { cause }) };
  }
  if (typeof data !== 'object' || data === null) return { fail: new PokeApiError('PARSE', path, status) };
  return { ok: { text, data } };
}
