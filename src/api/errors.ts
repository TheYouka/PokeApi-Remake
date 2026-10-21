export type ApiErrorCode = 'NOT_FOUND' | 'HTTP' | 'NETWORK' | 'OFFLINE' | 'TIMEOUT' | 'PARSE' | 'INVALID_PARAM';

/** Error tipado de la capa API. `path` es la ruta relativa a BASE_URL. */
export class PokeApiError extends Error {
  override readonly name = 'PokeApiError';
  readonly code: ApiErrorCode;
  readonly path: string;
  readonly status?: number;

  constructor(code: ApiErrorCode, path: string, status?: number, options?: { cause?: unknown }) {
    super(status === undefined ? `${code} ${path}` : `${code} ${status} ${path}`, options);
    this.code = code;
    this.path = path;
    if (status !== undefined) this.status = status;
  }
}

const CHUNK_RE = /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
export const isChunkLoadError = (e: unknown) => e instanceof TypeError && CHUNK_RE.test(e.message);

/** `AbortError` (DOMException) de una cancelación por llamador. */
export const createAbortError = () => new DOMException('Operación cancelada', 'AbortError');
export const isAbortError = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';

/**
 * Código visible de un error. Orden fijo: PokeApiError → fallo de chunk → UI_ERROR.
 * NOT_FOUND→'404' · INVALID_PARAM→'404' · HTTP→`HTTP_${status}` · NETWORK/OFFLINE/TIMEOUT/PARSE tal cual.
 */
export function displayCode(e: unknown): string {
  if (e instanceof PokeApiError) {
    switch (e.code) {
      case 'NOT_FOUND':
      case 'INVALID_PARAM':
        return '404';
      case 'HTTP':
        return `HTTP_${e.status ?? 0}`;
      default:
        return e.code;
    }
  }
  if (isChunkLoadError(e)) return 'CHUNK_LOAD';
  return 'UI_ERROR';
}
