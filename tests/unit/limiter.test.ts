import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter, type AttemptOutcome } from '../../src/api/limiter';

interface Deferred<T> { promise: Promise<T>; resolve: (v: T) => void }
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
const tick = () => new Promise<void>((r) => setImmediate(r));
const isAbort = (e: unknown) => (e as { name?: unknown }).name === 'AbortError';

/** Tarea controlable: registra cuándo arranca y se resuelve a mano. */
function controllable(log: string[], name: string) {
  const d = deferred<AttemptOutcome<string>>();
  return {
    attempt: () => { log.push(name); return d.promise; },
    finish: () => d.resolve({ ok: name }),
  };
}

test('nunca hay más de N tareas activas', async () => {
  const lim = createLimiter(2);
  let active = 0;
  let peak = 0;
  const jobs = Array.from({ length: 8 }, (_, i) =>
    lim.enqueue(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return { ok: i };
    }, 'low').join({ priority: 'low' }));
  assert.deepEqual(await Promise.all(jobs), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(peak, 2);
});

test('high va antes que low', async () => {
  const lim = createLimiter(1);
  const log: string[] = [];
  const blocker = controllable(log, 'blocker');
  const l1 = controllable(log, 'low1');
  const h1 = controllable(log, 'high1');
  const pb = lim.enqueue(blocker.attempt, 'low').join({ priority: 'low' });
  const pl = lim.enqueue(l1.attempt, 'low').join({ priority: 'low' });
  const ph = lim.enqueue(h1.attempt, 'high').join({ priority: 'high' });
  await tick();
  assert.deepEqual(lim.stats(), { active: 1, high: 1, low: 1 });
  blocker.finish(); await pb; await tick();
  assert.deepEqual(log, ['blocker', 'high1']);
  h1.finish(); await ph; await tick();
  l1.finish(); await pl;
  assert.deepEqual(log, ['blocker', 'high1', 'low1']);
});

test('en cola solo se cancela cuando abortan todos los interesados', async () => {
  const lim = createLimiter(1);
  const log: string[] = [];
  const blocker = controllable(log, 'blocker');
  const queued = controllable(log, 'queued');
  const pb = lim.enqueue(blocker.attempt, 'high').join({ priority: 'high' });
  const task = lim.enqueue(queued.attempt, 'low');
  const a = new AbortController();
  const b = new AbortController();
  const pa = task.join({ priority: 'low', signal: a.signal });
  const pbb = task.join({ priority: 'low', signal: b.signal });
  a.abort();
  await assert.rejects(pa, isAbort);
  assert.equal(lim.stats().low, 1, 'con un interesado vivo sigue en cola');
  b.abort();
  await assert.rejects(pbb, isAbort);
  assert.equal(lim.stats().low, 0, 'sin interesados sale de la cola');
  blocker.finish(); await pb; await tick();
  assert.deepEqual(log, ['blocker'], 'la tarea cancelada nunca arranca');
});

test('subida de prioridad: un join high a la tercera low la hace la siguiente', async () => {
  const lim = createLimiter(1);
  const log: string[] = [];
  const active = controllable(log, 'active');
  const lows = [1, 2, 3].map((i) => controllable(log, `low${i}`));
  const pActive = lim.enqueue(active.attempt, 'low').join({ priority: 'low' });
  const tasks = lows.map((l) => lim.enqueue(l.attempt, 'low'));
  const ps = tasks.map((t) => t.join({ priority: 'low' }));
  await tick();
  assert.deepEqual(lim.stats(), { active: 1, high: 0, low: 3 });
  const pUp = tasks[2]!.join({ priority: 'high' });
  assert.equal(tasks[2]!.priority, 'high');
  assert.deepEqual(lim.stats(), { active: 1, high: 1, low: 2 });
  active.finish(); await pActive; await tick();
  assert.deepEqual(log, ['active', 'low3']);
  lows[2]!.finish(); await pUp; await tick();
  lows[0]!.finish(); await tick(); lows[1]!.finish();
  await Promise.all(ps);
  assert.deepEqual(log, ['active', 'low3', 'low1', 'low2']);
});

test('durante el backoff, si abortan todos, la tarea no vuelve a arrancar', async () => {
  const lim = createLimiter(1);
  let attempts = 0;
  const task = lim.enqueue<string>(async () => {
    attempts++;
    return { retryInMs: 50 };
  }, 'high');
  const a = new AbortController();
  const p = task.join({ priority: 'high', signal: a.signal });
  await tick();
  assert.equal(attempts, 1);
  assert.deepEqual(lim.stats(), { active: 0, high: 0, low: 0 }, 'el hueco se libera durante el backoff');
  a.abort();
  await assert.rejects(p, isAbort);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(attempts, 1);
  assert.deepEqual(lim.stats(), { active: 0, high: 0, low: 0 });
});

test('el backoff libera el hueco y el reintento vuelve a la cola', async () => {
  const lim = createLimiter(1);
  const order: string[] = [];
  let n = 0;
  const retrying = lim.enqueue<string>(async () => {
    order.push(`retrying#${++n}`);
    return n === 1 ? { retryInMs: 20 } : { ok: 'r' };
  }, 'low').join({ priority: 'low' });
  const other = lim.enqueue<string>(async () => { order.push('other'); return { ok: 'o' }; }, 'low')
    .join({ priority: 'low' });
  assert.deepEqual(await Promise.all([retrying, other]), ['r', 'o']);
  assert.deepEqual(order, ['retrying#1', 'other', 'retrying#2']);
});
