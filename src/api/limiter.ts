import { createAbortError } from './errors';

export type Priority = 'high' | 'low';
export type AttemptOutcome<T> = { ok: T } | { retryInMs: number } | { fail: unknown };
/** Un intento de red (`n` empieza en 1). Decide él si reintentar, devolviendo `retryInMs`. */
export type Attempt<T> = (n: number) => Promise<AttemptOutcome<T>>;

export interface LimitedTask<T> {
  /** Suma un interesado y devuelve SU promesa (su `signal` solo le afecta a él, §4.4). */
  join(o: { priority: Priority; signal?: AbortSignal }): Promise<T>;
  /** Prioridad actual de la tarea (con la subida ya aplicada). */
  readonly priority: Priority;
  /** Se resuelve (nunca rechaza) cuando la tarea termina de cualquier forma. */
  readonly settled: Promise<void>;
}

export interface Limiter {
  enqueue<T>(attempt: Attempt<T>, priority: Priority): LimitedTask<T>;
  stats(): { active: number; high: number; low: number };                 // para tests
}

type State = 'queued' | 'running' | 'backoff' | 'done';

interface Task {
  attempt: Attempt<unknown>;
  priority: Priority;
  state: State;
  refs: number;
  /** Algún interesado abortó (distingue "nadie se unió" de "todos abortaron"). */
  everAborted: boolean;
  attempts: number;
  timer: ReturnType<typeof setTimeout> | null;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  shared: Promise<unknown>;
}

/** Une la promesa compartida con el `signal` de un llamador (Promise.race que quita el listener). */
function withSignal<T>(shared: Promise<T>, signal: AbortSignal | undefined, onAbort: () => void): Promise<T> {
  if (!signal) return shared;
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject(createAbortError());
      onAbort();
    };
    signal.addEventListener('abort', abort);
    shared.then(
      (v) => { signal.removeEventListener('abort', abort); resolve(v); },
      (e: unknown) => { signal.removeEventListener('abort', abort); reject(e); },
    );
  });
}

/** Semáforo de `max` tareas activas con colas FIFO `high` y `low` y cancelación en cola (§4.4). */
export function createLimiter(max: number): Limiter {
  const high: Task[] = [];
  const low: Task[] = [];
  let active = 0;

  const removeFromQueue = (t: Task) => {
    const q = t.priority === 'high' ? high : low;
    const i = q.indexOf(t);
    if (i >= 0) q.splice(i, 1);
  };

  const finish = (t: Task) => {
    t.state = 'done';
    t.timer = null;
  };

  const pump = () => {
    while (active < max) {
      const t = high.shift() ?? low.shift();
      if (!t) return;
      run(t);
    }
  };

  const run = (t: Task) => {
    active++;
    t.state = 'running';
    const n = ++t.attempts;
    Promise.resolve()
      .then(() => t.attempt(n))
      .then(
        (outcome) => settleAttempt(t, outcome),
        (e: unknown) => settleAttempt(t, { fail: e }),
      );
  };

  const settleAttempt = (t: Task, outcome: AttemptOutcome<unknown>) => {
    active--;
    if ('ok' in outcome) {
      finish(t);
      t.resolve(outcome.ok);
    } else if ('fail' in outcome) {
      finish(t);
      t.reject(outcome.fail);
    } else if (t.refs === 0 && t.everAborted) {
      // Todos los interesados abortaron durante el intento: no se reintenta.
      finish(t);
      t.reject(createAbortError());
    } else {
      // Backoff: el hueco se libera y el reintento vuelve a la cola con la prioridad actual.
      t.state = 'backoff';
      t.timer = setTimeout(() => {
        t.timer = null;
        if (t.state !== 'backoff') return;
        t.state = 'queued';
        (t.priority === 'high' ? high : low).push(t);
        pump();
      }, Math.max(0, outcome.retryInMs));
    }
    pump();
  };

  const dropInterest = (t: Task) => {
    t.refs--;
    t.everAborted = true;
    if (t.refs > 0) return;
    if (t.state === 'queued') {
      removeFromQueue(t);
    } else if (t.state === 'backoff') {
      if (t.timer !== null) clearTimeout(t.timer);
    } else {
      return; // en vuelo (o ya terminada): nunca se aborta
    }
    finish(t);
    t.reject(createAbortError());
  };

  return {
    enqueue<T>(attempt: Attempt<T>, priority: Priority): LimitedTask<T> {
      let resolve!: (v: unknown) => void;
      let reject!: (e: unknown) => void;
      const shared = new Promise<unknown>((res, rej) => { resolve = res; reject = rej; });
      const settled = shared.then(() => undefined, () => undefined);
      const t: Task = {
        attempt, priority, state: 'queued', refs: 0, attempts: 0, timer: null,
        resolve, reject, shared, everAborted: false,
      };
      (priority === 'high' ? high : low).push(t);
      pump();
      return {
        get priority() { return t.priority; },
        settled,
        join({ priority: p, signal }) {
          if (signal?.aborted) return Promise.reject(createAbortError());
          if (t.state !== 'done') {
            t.refs++;
            if (p === 'high' && t.priority === 'low') {
              if (t.state === 'queued') {
                removeFromQueue(t);
                t.priority = 'high';
                high.push(t);              // al FINAL de la cola high
              } else {
                t.priority = 'high';       // en vuelo o en backoff: solo cambia la prioridad registrada
              }
            }
          }
          return withSignal(shared as Promise<T>, signal, () => dropInterest(t));
        },
      };
    },
    stats: () => ({ active, high: high.length, low: low.length }),
  };
}
