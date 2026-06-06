import { MemoryStore } from 'hp24-idemkit-core';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import idempotency, { type FastifyIdempotencyOptions } from '../src/index.js';

async function makeApp(
  opts: Partial<FastifyIdempotencyOptions> = {},
  handler?: () => unknown,
): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(idempotency, { store: new MemoryStore(), ...opts });
  let n = 0;
  app.post('/charges', async () => (handler ? handler() : { id: `ch_${n++}` }));
  await app.ready();
  return app;
}

function inject(app: FastifyInstance, key: string | undefined, payload: unknown) {
  return app.inject({
    method: 'POST',
    url: '/charges',
    headers: key ? { 'idempotency-key': key } : {},
    payload,
  });
}

describe('hp24-idemkit-fastify', () => {
  it('executes the handler on first request', async () => {
    const app = await makeApp();
    const res = await inject(app, 'k1', { amt: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'ch_0' });
    await app.close();
  });

  it('replays the original response on a repeat', async () => {
    const app = await makeApp();
    const first = await inject(app, 'k1', { amt: 1 });
    const second = await inject(app, 'k1', { amt: 1 });
    expect(second.json()).toEqual(first.json());
    expect(second.headers['x-idempotency-replay']).toBe('true');
    await app.close();
  });

  it('rejects a reused key with a different payload (422)', async () => {
    const app = await makeApp();
    await inject(app, 'k1', { amt: 1 });
    const res = await inject(app, 'k1', { amt: 2 });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it('runs the handler once for concurrent identical requests', async () => {
    const handler = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 40));
      return { id: 'once' };
    });
    const app = await makeApp({}, handler);
    const [a, b] = await Promise.all([inject(app, 'dup', { a: 1 }), inject(app, 'dup', { a: 1 })]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409]);
    await app.close();
  });

  it('requires a key when missingKey: "require"', async () => {
    const app = await makeApp({ missingKey: 'require' });
    const res = await inject(app, undefined, { amt: 1 });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
