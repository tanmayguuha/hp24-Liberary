import { describe, expect, it, vi } from 'vitest';
import { createIdempotentFetch } from '../src/fetch.js';
import { memoryKeyStore } from '../src/key.js';

const fast = { minDelayMs: 1, maxDelayMs: 2 };

function ok(body = '{}', status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': 'application/json' } });
}

describe('@hp24/idemkit-client createIdempotentFetch', () => {
  it('attaches a generated Idempotency-Key for POST', async () => {
    const fetchImpl = vi.fn(async () => ok());
    const ifetch = createIdempotentFetch({ fetch: fetchImpl, generateKey: () => 'fixed-key' });
    await ifetch('/api', { method: 'POST', body: '{}' });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get('Idempotency-Key')).toBe('fixed-key');
  });

  it('does not attach a key for GET', async () => {
    const fetchImpl = vi.fn(async () => ok());
    const ifetch = createIdempotentFetch({ fetch: fetchImpl });
    await ifetch('/api', { method: 'GET' });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBeNull();
  });

  it('uses an explicit idempotencyKey when provided', async () => {
    const fetchImpl = vi.fn(async () => ok());
    const ifetch = createIdempotentFetch({ fetch: fetchImpl });
    await ifetch('/api', { method: 'POST', idempotencyKey: 'caller-key' });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get('Idempotency-Key')).toBe('caller-key');
  });

  it('reuses the SAME key across retries', async () => {
    const seenKeys: (string | null)[] = [];
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      seenKeys.push(new Headers(init?.headers).get('Idempotency-Key'));
      return seenKeys.length < 3 ? ok('', 503) : ok('done', 200);
    });
    const ifetch = createIdempotentFetch({ fetch: fetchImpl, retry: { ...fast, retries: 3 } });
    const res = await ifetch('/api', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(seenKeys).toHaveLength(3);
    expect(new Set(seenKeys).size).toBe(1); // identical key every attempt
  });

  it('retries on network error then succeeds', async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => {
      n++;
      if (n === 1) throw new TypeError('network down');
      return ok('recovered');
    });
    const ifetch = createIdempotentFetch({ fetch: fetchImpl, retry: fast });
    const res = await ifetch('/api', { method: 'POST' });
    expect(await res.text()).toBe('recovered');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry when retry: false', async () => {
    const fetchImpl = vi.fn(async () => ok('', 500));
    const ifetch = createIdempotentFetch({ fetch: fetchImpl, retry: false });
    const res = await ifetch('/api', { method: 'POST' });
    expect(res.status).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('persists and reuses a key via keyStore + idempotencyId', async () => {
    const store = memoryKeyStore();
    let keyDuringFlight: string | null = null;
    const fetchImpl = vi.fn(async (_i: RequestInfo | URL, init?: RequestInit) => {
      keyDuringFlight = new Headers(init?.headers).get('Idempotency-Key');
      // Mid-flight the key must be persisted (survives a reload).
      expect(store.get('order-42')).toBe(keyDuringFlight);
      return ok();
    });
    const ifetch = createIdempotentFetch({ fetch: fetchImpl, keyStore: store });
    await ifetch('/api', { method: 'POST', idempotencyId: 'order-42' });
    // Cleared after a definitive response.
    expect(store.get('order-42')).toBeNull();
  });

  it('stops immediately if the signal is already aborted', async () => {
    const fetchImpl = vi.fn(async () => ok());
    const ifetch = createIdempotentFetch({ fetch: fetchImpl });
    const controller = new AbortController();
    controller.abort();
    await expect(
      ifetch('/api', { method: 'POST', signal: controller.signal }),
    ).rejects.toBeTruthy();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
