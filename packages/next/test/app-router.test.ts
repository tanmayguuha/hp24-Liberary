import { MemoryStore } from 'hp24-idemkit-core';
import { describe, expect, it, vi } from 'vitest';
import { withIdempotency } from '../src/app-router.js';

function post(key: string | undefined, body: unknown): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (key) headers.set('Idempotency-Key', key);
  return new Request('https://x.test/api/charges', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('hp24-idemkit-next withIdempotency (App Router)', () => {
  it('executes the handler on first request and replays on repeat', async () => {
    const store = new MemoryStore();
    let n = 0;
    const handler = withIdempotency(
      async () => Response.json({ id: `ch_${n++}` }, { status: 201 }),
      { store },
    );

    const first = await handler(post('k1', { amt: 1 }), {});
    const second = await handler(post('k1', { amt: 1 }), {});

    expect(first.status).toBe(201);
    expect(await first.clone().json()).toEqual({ id: 'ch_0' });
    expect(await second.json()).toEqual({ id: 'ch_0' });
    expect(second.headers.get('x-idempotency-replay')).toBe('true');
  });

  it('returns 422 when the key is reused with a different payload', async () => {
    const store = new MemoryStore();
    const handler = withIdempotency(async () => Response.json({ ok: true }), { store });
    await handler(post('k1', { amt: 1 }), {});
    const res = await handler(post('k1', { amt: 2 }), {});
    expect(res.status).toBe(422);
  });

  it('runs the handler once for concurrent identical requests', async () => {
    const store = new MemoryStore();
    const spy = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return Response.json({ id: 'once' }, { status: 201 });
    });
    const handler = withIdempotency(spy, { store });

    const [a, b] = await Promise.all([
      handler(post('dup', { a: 1 }), {}),
      handler(post('dup', { a: 1 }), {}),
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });
});
