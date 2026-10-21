/**
 * Registro de la app (§18). `debug` y `warn` no hacen nada en producción;
 * `error` siempre escribe y solo lo usan los boundaries ante excepciones inesperadas.
 * La capa `src/api/` nunca importa este módulo: no escribe en consola.
 */
const DEV = import.meta.env.DEV;

export const log = {
  debug(...args: unknown[]): void {
    if (DEV) console.debug('[pbx]', ...args);
  },
  warn(...args: unknown[]): void {
    if (DEV) console.warn('[pbx]', ...args);
  },
  error(...args: unknown[]): void {
    console.error('[pbx]', ...args);
  },
};
