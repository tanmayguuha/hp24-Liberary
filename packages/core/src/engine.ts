import { DEFAULTS } from './adapter-kit.js';
import { ConflictWaitTimeoutError } from './errors.js';
import { fingerprint as computeFingerprint } from './fingerprint.js';
import type { EngineDecision, IdempotencyConfig, RunInput } from './types.js';

/**
 * The framework-agnostic idempotency engine. Adapters (Express, Fastify,
 * Next.js, …) translate a transport request into a {@link RunInput} and act on
 * the returned {@link EngineDecision}.
 *
 * The core guarantee — "lock before execute" — lives here:
 *
 * 1. `store.begin` atomically acquires a lock or reports the existing record.
 * 2. Only the caller that gets `new` runs {@link RunInput.execute}.
 * 3. On success the response is persisted; on error the lock is released so the
 *    operation can be retried (it is never permanently poisoned).
 */
export class IdempotencyEngine {
  private readonly store: IdempotencyConfig['store'];
  private readonly ttlMs: number;
  private readonly lockTimeoutMs: number;
  private readonly onConflict: 'conflict' | 'wait';
  private readonly waitPollMs: number;
  private readonly waitTimeoutMs: number;

  constructor(config: IdempotencyConfig) {
    this.store = config.store;
    this.ttlMs = config.ttlMs ?? DEFAULTS.ttlMs;
    this.lockTimeoutMs = config.lockTimeoutMs ?? DEFAULTS.lockTimeoutMs;
    this.onConflict = config.onConflict ?? 'conflict';
    this.waitPollMs = config.waitPollMs ?? DEFAULTS.waitPollMs;
    this.waitTimeoutMs = config.waitTimeoutMs ?? this.lockTimeoutMs;
  }

  /**
   * Run an operation idempotently for the given key. Per-call `ttlMs`/
   * `lockTimeoutMs` overrides take precedence over the engine defaults.
   */
  async run(
    input: RunInput,
    overrides?: { ttlMs?: number; lockTimeoutMs?: number },
  ): Promise<EngineDecision> {
    const { key, payload, execute, cacheable } = input;

    // No key supplied -> the engine offers no protection; adapter decides
    // whether that is allowed for this route/method.
    if (key == null || key === '') {
      return { action: 'passthrough' };
    }

    const fp = computeFingerprint(payload);
    const ttlMs = overrides?.ttlMs ?? this.ttlMs;
    const lockTimeoutMs = overrides?.lockTimeoutMs ?? this.lockTimeoutMs;

    const outcome = await this.store.begin(key, fp, { ttlMs, lockTimeoutMs });

    switch (outcome.kind) {
      case 'new':
        return this.executeAndStore(key, execute, cacheable);

      case 'completed': {
        const response = outcome.record.response;
        // Defensive: a completed record without a body is treated as stale.
        if (!response) return this.executeAndStore(key, execute, cacheable);
        return {
          action: 'replayed',
          response,
          originalCreatedAt: outcome.record.createdAt,
        };
      }

      case 'mismatch':
        return { action: 'mismatch' };

      case 'in_progress':
        if (this.onConflict === 'wait') {
          return this.waitForCompletion(key, fp);
        }
        return { action: 'in_progress' };
    }
  }

  private async executeAndStore(
    key: string,
    execute: RunInput['execute'],
    cacheable: RunInput['cacheable'],
  ): Promise<EngineDecision> {
    try {
      const response = await execute();
      if (cacheable && !cacheable(response)) {
        // Not cacheable (e.g. a 5xx) — drop the lock so the client may retry.
        await this.store.fail(key);
      } else {
        await this.store.complete(key, response);
      }
      return { action: 'executed', response };
    } catch (error) {
      // Release the lock so a later retry can re-run; never leave a poisoned key.
      await this.store.fail(key);
      throw error;
    }
  }

  private async waitForCompletion(key: string, fingerprint: string): Promise<EngineDecision> {
    const deadline = Date.now() + this.waitTimeoutMs;
    // Yield in small polls until the in-flight request stores its result.
    while (Date.now() < deadline) {
      await delay(this.waitPollMs);
      const record = await this.store.get(key);
      if (!record) {
        // Original failed and released its lock -> we may proceed by re-begin.
        return { action: 'in_progress' };
      }
      if (record.fingerprint !== fingerprint) return { action: 'mismatch' };
      if (record.state === 'completed' && record.response) {
        return {
          action: 'replayed',
          response: record.response,
          originalCreatedAt: record.createdAt,
        };
      }
    }
    throw new ConflictWaitTimeoutError(key);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
