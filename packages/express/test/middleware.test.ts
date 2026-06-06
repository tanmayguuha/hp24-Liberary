import { MemoryStore } from 'hp24-idemkit-core';
import express, { type Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ExpressIdempotencyOptions, idempotency } from '../src/index.js';

function makeApp(opts: Partial<ExpressIdempotencyOptions> = {}, handler?: express.RequestHandler) {
  const app: Express = express();
  app.use(express.json());
  app.use(idempotency({ store: new MemoryStore(), ...opts }));
  const charge = handler ?? ((_req, res) => res.status(201).json({ id: `ch_${counter++}` }));
  app.post('/charges', charge);
  app.get('/health', (_req, res) => res.json({ ok: true }));
  return app;
}

let counter = 0;
beforeEach(() => {
  counter = 0;
});

describe('hp24-idemkit-express', () => {
  it('executes the handler on the first request', async () => {
    const app = makeApp();
    const res = await request(app).post('/charges').set('Idempotency-Key', 'k1').send({ amt: 10 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'ch_0' });
    expect(res.headers['x-idempotency-replay']).toBeUndefined();
  });

  it('replays the original response for a repeat with the same payload', async () => {
    const app = makeApp();
    const first = await request(app)
      .post('/charges')
      .set('Idempotency-Key', 'k1')
      .send({ amt: 10 });
    const second = await request(app)
      .post('/charges')
      .set('Idempotency-Key', 'k1')
      .send({ amt: 10 });
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body); // same id -> handler ran once
    expect(second.headers['x-idempotency-replay']).toBe('true');
  });

  it('rejects a reused key with a different payload (422)', async () => {
    const app = makeApp();
    await request(app).post('/charges').set('Idempotency-Key', 'k1').send({ amt: 10 });
    const res = await request(app).post('/charges').set('Idempotency-Key', 'k1').send({ amt: 999 });
    expect(res.status).toBe(422);
  });

  it('passes through protected methods without a key by default', async () => {
    const app = makeApp();
    const res = await request(app).post('/charges').send({ amt: 10 });
    expect(res.status).toBe(201);
  });

  it('requires a key when missingKey: "require" (400)', async () => {
    const app = makeApp({ missingKey: 'require' });
    const res = await request(app).post('/charges').send({ amt: 10 });
    expect(res.status).toBe(400);
  });

  it('ignores non-protected methods (GET)', async () => {
    const handler = vi.fn();
    const app = makeApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not cache error responses (5xx) — allows retry', async () => {
    let attempt = 0;
    const app = makeApp({}, (_req, res) => {
      attempt++;
      if (attempt === 1) return res.status(503).json({ error: 'temporary' });
      return res.status(201).json({ id: 'ch_recovered' });
    });
    const first = await request(app)
      .post('/charges')
      .set('Idempotency-Key', 'k1')
      .send({ amt: 10 });
    expect(first.status).toBe(503);
    const retry = await request(app)
      .post('/charges')
      .set('Idempotency-Key', 'k1')
      .send({ amt: 10 });
    expect(retry.status).toBe(201);
    expect(retry.body).toEqual({ id: 'ch_recovered' });
  });

  it('runs the handler once for two concurrent identical requests', async () => {
    const handler = vi.fn((_req: express.Request, res: express.Response) => {
      setTimeout(() => res.status(201).json({ id: 'ch_concurrent' }), 40);
    });
    const app = makeApp({}, handler as express.RequestHandler);

    const [a, b] = await Promise.all([
      request(app).post('/charges').set('Idempotency-Key', 'dup').send({ amt: 10 }),
      request(app).post('/charges').set('Idempotency-Key', 'dup').send({ amt: 10 }),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
    const statuses = [a.status, b.status].sort();
    // One success; the other is an in-flight conflict (409).
    expect(statuses).toEqual([201, 409]);
  });

  it('waits and replays for concurrent requests when onConflict: "wait"', async () => {
    const handler = vi.fn((_req: express.Request, res: express.Response) => {
      setTimeout(() => res.status(201).json({ id: 'ch_wait' }), 40);
    });
    const app = makeApp({ onConflict: 'wait', waitPollMs: 5 }, handler as express.RequestHandler);

    const [a, b] = await Promise.all([
      request(app).post('/charges').set('Idempotency-Key', 'dup2').send({ amt: 10 }),
      request(app).post('/charges').set('Idempotency-Key', 'dup2').send({ amt: 10 }),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body).toEqual(b.body);
  });
});
