import type {
  BeginOptions,
  BeginOutcome,
  IdempotencyRecord,
  IdempotencyStore,
  SerializedResponse,
} from '../types.js';

/**
 * In-memory {@link IdempotencyStore} for development, tests, and single-process
 * deployments. Correct under concurrency *within one process*: JavaScript runs
 * the synchronous check-and-set in {@link begin} atomically, so two overlapping
 * async requests with the same key cannot both receive the `new` outcome.
 *
 * Not suitable across processes/instances — use `@hp24/idemkit-redis` for that.
 *
 * Expired records are reclaimed lazily on access; an optional sweep interval
 * can be enabled to bound memory for keys that are never revisited.
 */
export class MemoryStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();
  private sweepTimer?: ReturnType<typeof setInterval>;

  constructor(options: { sweepIntervalMs?: number; now?: () => number } = {}) {
    this.now = options.now ?? (() => Date.now());
    if (options.sweepIntervalMs && options.sweepIntervalMs > 0) {
      this.sweepTimer = setInterval(() => this.sweep(), options.sweepIntervalMs);
      // Do not keep the event loop alive solely for sweeping.
      this.sweepTimer.unref?.();
    }
  }

  private readonly now: () => number;

  begin(key: string, fingerprint: string, opts: BeginOptions): Promise<BeginOutcome> {
    const ts = this.now();
    const existing = this.records.get(key);

    if (existing && !this.isExpired(existing, ts) && !this.isLockStale(existing, ts, opts)) {
      if (existing.fingerprint !== fingerprint) {
        return Promise.resolve({ kind: 'mismatch', record: existing });
      }
      if (existing.state === 'completed') {
        return Promise.resolve({ kind: 'completed', record: existing });
      }
      return Promise.resolve({ kind: 'in_progress', record: existing });
    }

    // No usable record (absent, expired, or stale lock) -> acquire a fresh lock.
    const record: IdempotencyRecord = {
      key,
      state: 'locked',
      fingerprint,
      createdAt: ts,
      expiresAt: ts + opts.ttlMs,
    };
    this.records.set(key, record);
    return Promise.resolve({ kind: 'new' });
  }

  complete(key: string, response: SerializedResponse): Promise<void> {
    const record = this.records.get(key);
    if (record) {
      record.state = 'completed';
      record.response = response;
    }
    return Promise.resolve();
  }

  fail(key: string): Promise<void> {
    const record = this.records.get(key);
    // Only drop the lock if the handler never completed; never erase a stored
    // success that a concurrent path may already be replaying.
    if (record && record.state === 'locked') {
      this.records.delete(key);
    }
    return Promise.resolve();
  }

  get(key: string): Promise<IdempotencyRecord | null> {
    const record = this.records.get(key);
    if (!record || this.isExpired(record, this.now())) return Promise.resolve(null);
    return Promise.resolve(record);
  }

  close(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.records.clear();
  }

  /** Current number of live records — handy for tests and metrics. */
  get size(): number {
    return this.records.size;
  }

  private isExpired(record: IdempotencyRecord, ts: number): boolean {
    return ts >= record.expiresAt;
  }

  private isLockStale(record: IdempotencyRecord, ts: number, opts: BeginOptions): boolean {
    return record.state === 'locked' && ts - record.createdAt >= opts.lockTimeoutMs;
  }

  private sweep(): void {
    const ts = this.now();
    for (const [key, record] of this.records) {
      if (this.isExpired(record, ts)) this.records.delete(key);
    }
  }
}
