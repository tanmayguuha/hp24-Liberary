import type { SerializedResponse } from '@hp24/idemkit-core';
import { describe, expect, it } from 'vitest';
import { type RedisLike, RedisStore, interpretExisting } from '../src/index.js';

/**
 * In-memory fake that emulates the exact Redis commands RedisStore issues,
 * including the begin Lua script's semantics. Lets us exercise the full store
 * (begin/complete/fail/get + stale-lock reclaim) without a live Redis.
 */
class FakeRedis implements RedisLike {
  private readonly map = new Map<string, { value: string; expireAt: number }>();
  constructor(private clock: { now: number }) {}

  private live(key: string): string | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (this.clock.now >= entry.expireAt) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.live(key));
  }

  set(key: string, value: string, _mode: 'PX', ttlMs: number): Promise<unknown> {
    this.map.set(key, { value, expireAt: this.clock.now + ttlMs });
    return Promise.resolve('OK');
  }

  del(key: string): Promise<unknown> {
    this.map.delete(key);
    return Promise.resolve(1);
  }

  // Emulates BEGIN_SCRIPT.
  eval(_script: string, _numKeys: number, ...args: string[]): Promise<[number, string?]> {
    const [key, recordJson, nowStr, lockTimeoutStr, ttlStr] = args;
    const now = Number(nowStr);
    const lockTimeout = Number(lockTimeoutStr);
    const ttl = Number(ttlStr);
    const raw = this.live(key as string);
    if (raw) {
      const rec = JSON.parse(raw) as { state: string; createdAt: number };
      if (rec.state === 'locked' && now - rec.createdAt >= lockTimeout) {
        this.map.set(key as string, { value: recordJson as string, expireAt: now + ttl });
        return Promise.resolve([0]);
      }
      return Promise.resolve([1, raw]);
    }
    this.map.set(key as string, { value: recordJson as string, expireAt: now + ttl });
    return Promise.resolve([0]);
  }
}

const RESPONSE: SerializedResponse = {
  statusCode: 201,
  headers: { 'content-type': 'application/json' },
  body: Buffer.from('{"id":"ch_1"}').toString('base64'),
  bodyEncoding: 'base64',
};
const OPTS = { ttlMs: 10_000, lockTimeoutMs: 1000 };

function makeStore() {
  const clock = { now: 1_000_000 };
  const store = new RedisStore({ client: new FakeRedis(clock), now: () => clock.now });
  return { store, clock };
}

describe('@hp24/idemkit-redis RedisStore', () => {
  it('acquires a lock for an unseen key', async () => {
    const { store } = makeStore();
    expect(await store.begin('k1', 'fp', OPTS)).toEqual({ kind: 'new' });
  });

  it('reports in_progress while locked', async () => {
    const { store } = makeStore();
    await store.begin('k1', 'fp', OPTS);
    expect((await store.begin('k1', 'fp', OPTS)).kind).toBe('in_progress');
  });

  it('replays completed and detects mismatch', async () => {
    const { store } = makeStore();
    await store.begin('k1', 'fp', OPTS);
    await store.complete('k1', RESPONSE);
    expect(await store.begin('k1', 'fp', OPTS)).toMatchObject({ kind: 'completed' });
    expect((await store.begin('k1', 'other-fp', OPTS)).kind).toBe('mismatch');
  });

  it('releases the lock on fail, keeps completed on fail', async () => {
    const { store } = makeStore();
    await store.begin('k1', 'fp', OPTS);
    await store.fail('k1');
    expect((await store.begin('k1', 'fp', OPTS)).kind).toBe('new');

    await store.complete('k1', RESPONSE);
    await store.fail('k1');
    expect((await store.begin('k1', 'fp', OPTS)).kind).toBe('completed');
  });

  it('reclaims a stale lock past lockTimeoutMs', async () => {
    const { store, clock } = makeStore();
    await store.begin('k1', 'fp', OPTS);
    clock.now += 1500; // exceeds lockTimeoutMs
    expect(await store.begin('k1', 'fp', OPTS)).toEqual({ kind: 'new' });
  });

  it('expires records after ttl', async () => {
    const { store, clock } = makeStore();
    await store.begin('k1', 'fp', OPTS);
    await store.complete('k1', RESPONSE);
    clock.now += 11_000; // past ttl
    expect(await store.begin('k1', 'fp', OPTS)).toEqual({ kind: 'new' });
  });

  it('interpretExisting maps records correctly', () => {
    const base = { key: 'k', fingerprint: 'fp', createdAt: 0, expiresAt: 1 };
    expect(interpretExisting(JSON.stringify({ ...base, state: 'locked' }), 'fp').kind).toBe(
      'in_progress',
    );
    expect(interpretExisting(JSON.stringify({ ...base, state: 'completed' }), 'fp').kind).toBe(
      'completed',
    );
    expect(interpretExisting(JSON.stringify({ ...base, state: 'completed' }), 'nope').kind).toBe(
      'mismatch',
    );
  });
});
