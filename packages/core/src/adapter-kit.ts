import type { IdempotencyConfig } from './types.js';

export const DEFAULT_HEADER = 'idempotency-key';
export const DEFAULT_REPLAY_HEADER = 'x-idempotency-replay';

/** Shared default timeouts used by the engine and every adapter. */
export const DEFAULTS = {
  ttlMs: 24 * 60 * 60 * 1000, // 24h
  lockTimeoutMs: 30_000, // 30s
  waitPollMs: 50,
} as const;

/** HTTP methods that mutate state and therefore benefit from idempotency. */
export const DEFAULT_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'] as const;

export type HttpMethod = string;

/**
 * Options shared by all framework adapters. Adapters extend this with anything
 * transport-specific.
 */
export interface AdapterOptions extends Omit<IdempotencyConfig, 'store'> {
  store: IdempotencyConfig['store'];
  /** Header carrying the key. Default `Idempotency-Key` (compared case-insensitively). */
  header?: string;
  /** Header set on replayed responses. Default `X-Idempotency-Replay`. Set `false` to disable. */
  replayHeader?: string | false;
  /** Methods that participate in idempotency. Default POST/PATCH/PUT/DELETE. */
  methods?: HttpMethod[];
  /**
   * What to do when a protected method arrives without a key.
   * - `pass` (default): process normally, no protection.
   * - `require`: reject with 400.
   */
  missingKey?: 'pass' | 'require';
}

export interface ResolvedAdapterOptions
  extends Required<Pick<AdapterOptions, 'header' | 'methods' | 'missingKey'>> {
  replayHeader: string | false;
  methodSet: Set<string>;
}

export function resolveAdapterOptions(options: AdapterOptions): ResolvedAdapterOptions {
  const methods = (options.methods ?? [...DEFAULT_METHODS]).map((m) => m.toUpperCase());
  return {
    header: (options.header ?? DEFAULT_HEADER).toLowerCase(),
    methods,
    methodSet: new Set(methods),
    missingKey: options.missingKey ?? 'pass',
    replayHeader: options.replayHeader === undefined ? DEFAULT_REPLAY_HEADER : options.replayHeader,
  };
}

/** Whether a request with this method should be guarded by the engine. */
export function isProtectedMethod(method: string, resolved: ResolvedAdapterOptions): boolean {
  return resolved.methodSet.has(method.toUpperCase());
}

/** Canonical HTTP status codes idemkit adapters return for each situation. */
export const STATUS = {
  /** Protected method missing a required key. */
  missingKey: 400,
  /** Same key, different payload. */
  mismatch: 422,
  /** Duplicate request still in flight (onConflict: 'conflict'). */
  inProgress: 409,
} as const;
