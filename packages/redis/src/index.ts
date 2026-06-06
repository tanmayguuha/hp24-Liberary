import type {
  BeginOptions,
  BeginOutcome,
  IdempotencyRecord,
  IdempotencyStore,
  SerializedResponse,
} from '@idemkit/core';

/**
 * The subset of an ioredis client idemkit uses. Declared structurally so this
 * package does not hard-depend on ioredis types — pass any compatible client.
 */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'PX', ttlMs: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: ioredis eval has a broad overload set.
  eval(script: string, numKeys: number, ...args: any[]): Promise<any>;
}

export interface RedisStoreOptions {
  /** A connected ioredis (or compatible) client. */
  client: RedisLike;
  /** Key prefix for all idemkit entries. Default `idemkit:`. */
  prefix?: string;
  /** Injectable clock (epoch millis) for testing. Defaults to `Date.now`. */
  now?: () => number;
}

/**
 * Atomically acquire a lock for an unseen/expired/stale key, or return the
 * current record. Stale locks (held past `lockTimeoutMs`) are reclaimed in the
 * same round-trip, so a crashed process can never permanently block a key.
 *
 * Returns `{0}` when the lock was acquired ("new"), or `{1, raw}` with the
 * existing record JSON otherwise.
 */
const BEGIN_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
local now = tonumber(ARGV[2])
local lockTimeout = tonumber(ARGV[3])
if raw then
  local ok, rec = pcall(cjson.decode, raw)
  if ok and rec.state == 'locked' and (now - rec.createdAt) >= lockTimeout then
    redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[4])
    return {0}
  end
  return {1, raw}
end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[4])
return {0}
`;

/**
 * Redis-backed {@link IdempotencyStore} for production, multi-instance
 * deployments. Concurrency safety across processes comes from a single atomic
 * Lua script in {@link begin}; only one caller per key receives the `new`
 * outcome at a time.
 *
 * ```ts
 * import Redis from 'ioredis';
 * import { RedisStore } from '@idemkit/redis';
 * import { idempotency } from '@idemkit/express';
 *
 * const store = new RedisStore({ client: new Redis(process.env.REDIS_URL) });
 * app.use(idempotency({ store }));
 * ```
 */
export class RedisStore implements IdempotencyStore {
  private readonly client: RedisLike;
  private readonly prefix: string;
  private readonly now: () => number;

  constructor(options: RedisStoreOptions) {
    this.client = options.client;
    this.prefix = options.prefix ?? 'idemkit:';
    this.now = options.now ?? (() => Date.now());
  }

  async begin(key: string, fingerprint: string, opts: BeginOptions): Promise<BeginOutcome> {
    const ts = this.now();
    const record: IdempotencyRecord = {
      key,
      state: 'locked',
      fingerprint,
      createdAt: ts,
      expiresAt: ts + opts.ttlMs,
    };
    const result: [number, string?] = await this.client.eval(
      BEGIN_SCRIPT,
      1,
      this.redisKey(key),
      JSON.stringify(record),
      String(ts),
      String(opts.lockTimeoutMs),
      String(opts.ttlMs),
    );

    if (result[0] === 0) return { kind: 'new' };
    return interpretExisting(result[1] as string, fingerprint);
  }

  async complete(key: string, response: SerializedResponse): Promise<void> {
    const raw = await this.client.get(this.redisKey(key));
    if (!raw) return;
    const record = JSON.parse(raw) as IdempotencyRecord;
    record.state = 'completed';
    record.response = response;
    const ttl = Math.max(1, record.expiresAt - this.now());
    await this.client.set(this.redisKey(key), JSON.stringify(record), 'PX', ttl);
  }

  async fail(key: string): Promise<void> {
    const raw = await this.client.get(this.redisKey(key));
    if (!raw) return;
    const record = JSON.parse(raw) as IdempotencyRecord;
    // Only release a live lock; never erase a stored success.
    if (record.state === 'locked') await this.client.del(this.redisKey(key));
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    const raw = await this.client.get(this.redisKey(key));
    return raw ? (JSON.parse(raw) as IdempotencyRecord) : null;
  }

  private redisKey(key: string): string {
    return this.prefix + key;
  }
}

/** Map an existing stored record to a {@link BeginOutcome}. Pure — unit tested. */
export function interpretExisting(raw: string, fingerprint: string): BeginOutcome {
  const record = JSON.parse(raw) as IdempotencyRecord;
  if (record.fingerprint !== fingerprint) return { kind: 'mismatch', record };
  if (record.state === 'completed') return { kind: 'completed', record };
  return { kind: 'in_progress', record };
}
