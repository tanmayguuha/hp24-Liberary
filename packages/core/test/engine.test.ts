import { describe, expect, it, vi } from 'vitest';
import { IdempotencyEngine } from '../src/engine.js';
import { ConflictWaitTimeoutError } from '../src/errors.js';
import { fingerprint } from '../src/fingerprint.js';
import { MemoryStore } from '../src/store/memory.js';
import type { SerializedResponse } from '../src/types.js';

function res(body: string): SerializedResponse {
  return { statusCode: 200, headers: {}, body, bodyEncoding: 'utf8' };
}

describe('IdempotencyEngine', () => {
  it('passes through when no key is provided', async () => {
    const engine = new IdempotencyEngine({ store: new MemoryStore() });
    const execute = vi.fn(async () => res('x'));
    const decision = await engine.run({ key: null, payload: {}, execute });
    expect(decision.action).toBe('passthrough');
    expect(execute).not.toHaveBeenCalled();
  });

  it('executes the handler on the first request for a key', async () => {
    const engine = new IdempotencyEngine({ store: new MemoryStore() });
    const decision = await engine.run({
      key: 'k',
      payload: { a: 1 },
      execute: async () => res('1'),
    });
    expect(decision).toMatchObject({ action: 'executed' });
  });

  it('replays the stored response on a repeat with the same payload', async () => {
    const engine = new IdempotencyEngine({ store: new MemoryStore() });
    const execute = vi.fn(async () => res('first'));
    await engine.run({ key: 'k', payload: { a: 1 }, execute });
    const second = await engine.run({ key: 'k', payload: { a: 1 }, execute });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ action: 'replayed', response: { body: 'first' } });
  });

  it('returns mismatch on same key + different payload', async () => {
    const engine = new IdempotencyEngine({ store: new MemoryStore() });
    await engine.run({ key: 'k', payload: { a: 1 }, execute: async () => res('x') });
    const out = await engine.run({ key: 'k', payload: { a: 2 }, execute: async () => res('y') });
    expect(out.action).toBe('mismatch');
  });

  it('releases the lock when the handler throws, allowing retry', async () => {
    const store = new MemoryStore();
    const engine = new IdempotencyEngine({ store });
    await expect(
      engine.run({
        key: 'k',
        payload: {},
        execute: async () => {
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow('boom');
    // Lock released -> a retry runs the handler instead of being stuck.
    const retry = await engine.run({ key: 'k', payload: {}, execute: async () => res('ok') });
    expect(retry.action).toBe('executed');
  });

  describe('concurrency — the core guarantee', () => {
    it('runs the handler exactly once for N simultaneous same-key requests', async () => {
      const store = new MemoryStore();
      const engine = new IdempotencyEngine({ store });
      let runs = 0;
      const execute = async () => {
        runs++;
        await new Promise((r) => setTimeout(r, 20));
        return res(`run-${runs}`);
      };

      const decisions = await Promise.all(
        Array.from({ length: 25 }, () => engine.run({ key: 'same', payload: { a: 1 }, execute })),
      );

      expect(runs).toBe(1);
      const executed = decisions.filter((d) => d.action === 'executed');
      const conflicts = decisions.filter((d) => d.action === 'in_progress');
      expect(executed).toHaveLength(1);
      // Everyone else either got a conflict (in flight) or a replay (after store).
      expect(
        executed.length +
          conflicts.length +
          decisions.filter((d) => d.action === 'replayed').length,
      ).toBe(25);
    });

    it('onConflict: "wait" makes duplicates wait and replay the original result', async () => {
      const store = new MemoryStore();
      const engine = new IdempotencyEngine({ store, onConflict: 'wait', waitPollMs: 5 });
      let runs = 0;
      const execute = async () => {
        runs++;
        await new Promise((r) => setTimeout(r, 30));
        return res('the-one-true-result');
      };

      const decisions = await Promise.all(
        Array.from({ length: 10 }, () => engine.run({ key: 'same', payload: { a: 1 }, execute })),
      );

      expect(runs).toBe(1);
      // One executed; the rest waited and replayed the same body.
      expect(decisions.filter((d) => d.action === 'executed')).toHaveLength(1);
      for (const d of decisions) {
        if (d.action === 'replayed' || d.action === 'executed') {
          expect(d.response.body).toBe('the-one-true-result');
        }
      }
    });

    it('onConflict: "wait" times out if the original never completes', async () => {
      const store = new MemoryStore();
      const engine = new IdempotencyEngine({
        store,
        onConflict: 'wait',
        waitPollMs: 5,
        waitTimeoutMs: 30,
        lockTimeoutMs: 10_000,
      });
      // Hold a lock open (same fingerprint the engine will compute) without completing it.
      await store.begin('k', fingerprint({ a: 1 }), { ttlMs: 10_000, lockTimeoutMs: 10_000 });
      await expect(
        engine.run({ key: 'k', payload: { a: 1 }, execute: async () => res('x') }),
      ).rejects.toBeInstanceOf(ConflictWaitTimeoutError);
    });
  });

  it('honours a per-call ttl override', async () => {
    let clock = 0;
    const store = new MemoryStore({ now: () => clock });
    const engine = new IdempotencyEngine({ store, ttlMs: 10_000 });
    const execute = vi.fn(async () => res('x'));
    await engine.run({ key: 'k', payload: {}, execute }, { ttlMs: 100 });
    clock = 150; // past the per-call ttl
    await engine.run({ key: 'k', payload: {}, execute }, { ttlMs: 100 });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
