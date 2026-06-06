import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../src/store/memory.js';
import type { SerializedResponse } from '../src/types.js';

const OPTS = { ttlMs: 1000, lockTimeoutMs: 500 };
const RESPONSE: SerializedResponse = {
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: '{"ok":true}',
  bodyEncoding: 'utf8',
};

describe('MemoryStore', () => {
  it('acquires a fresh lock for an unseen key', async () => {
    const store = new MemoryStore();
    expect(await store.begin('k1', 'fp', OPTS)).toEqual({ kind: 'new' });
  });

  it('reports in_progress for a held lock', async () => {
    const store = new MemoryStore();
    await store.begin('k1', 'fp', OPTS);
    const out = await store.begin('k1', 'fp', OPTS);
    expect(out.kind).toBe('in_progress');
  });

  it('reports completed once a response is stored', async () => {
    const store = new MemoryStore();
    await store.begin('k1', 'fp', OPTS);
    await store.complete('k1', RESPONSE);
    const out = await store.begin('k1', 'fp', OPTS);
    expect(out).toMatchObject({ kind: 'completed', record: { response: RESPONSE } });
  });

  it('detects a fingerprint mismatch', async () => {
    const store = new MemoryStore();
    await store.begin('k1', 'fp-a', OPTS);
    await store.complete('k1', RESPONSE);
    const out = await store.begin('k1', 'fp-b', OPTS);
    expect(out.kind).toBe('mismatch');
  });

  it('releases the lock on fail so the key can be retried', async () => {
    const store = new MemoryStore();
    await store.begin('k1', 'fp', OPTS);
    await store.fail('k1');
    expect(await store.begin('k1', 'fp', OPTS)).toEqual({ kind: 'new' });
  });

  it('never erases a completed record on fail', async () => {
    const store = new MemoryStore();
    await store.begin('k1', 'fp', OPTS);
    await store.complete('k1', RESPONSE);
    await store.fail('k1');
    expect((await store.begin('k1', 'fp', OPTS)).kind).toBe('completed');
  });

  it('expires records after the TTL', async () => {
    let clock = 0;
    const store = new MemoryStore({ now: () => clock });
    await store.begin('k1', 'fp', { ttlMs: 100, lockTimeoutMs: 1000 });
    await store.complete('k1', RESPONSE);
    clock = 150;
    expect(await store.begin('k1', 'fp', { ttlMs: 100, lockTimeoutMs: 1000 })).toEqual({
      kind: 'new',
    });
  });

  it('reclaims a stale lock past the lock timeout', async () => {
    let clock = 0;
    const store = new MemoryStore({ now: () => clock });
    await store.begin('k1', 'fp', { ttlMs: 10_000, lockTimeoutMs: 200 });
    clock = 250; // lock has been held longer than lockTimeoutMs
    expect(await store.begin('k1', 'fp', { ttlMs: 10_000, lockTimeoutMs: 200 })).toEqual({
      kind: 'new',
    });
  });

  it('get() returns null for expired records and tracks size', async () => {
    let clock = 0;
    const store = new MemoryStore({ now: () => clock });
    await store.begin('k1', 'fp', { ttlMs: 100, lockTimeoutMs: 100 });
    expect(store.size).toBe(1);
    expect(await store.get('k1')).not.toBeNull();
    clock = 200;
    expect(await store.get('k1')).toBeNull();
    expect(await store.get('missing')).toBeNull();
  });

  it('sweeps expired records on the configured interval and closes cleanly', async () => {
    let clock = 0;
    const store = new MemoryStore({ now: () => clock, sweepIntervalMs: 50 });
    await store.begin('k1', 'fp', { ttlMs: 10, lockTimeoutMs: 10 });
    expect(store.size).toBe(1);
    clock = 100;
    await new Promise((r) => setTimeout(r, 70)); // let one sweep tick fire
    expect(store.size).toBe(0);
    store.close();
  });
});
