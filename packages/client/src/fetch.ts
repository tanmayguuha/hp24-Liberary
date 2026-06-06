import { type KeyStore, generateIdempotencyKey } from './key.js';

const DEFAULT_HEADER = 'Idempotency-Key';
const DEFAULT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export interface RetryDecisionInfo {
  response?: Response;
  error?: unknown;
  /** 0-based attempt index that just finished. */
  attempt: number;
}

export interface RetryOptions {
  /** Max retries after the first attempt. Default 2 (3 attempts total). */
  retries?: number;
  /** Backoff multiplier. Default 2. */
  factor?: number;
  /** Base delay in ms. Default 200. */
  minDelayMs?: number;
  /** Delay ceiling in ms. Default 5000. */
  maxDelayMs?: number;
  /** Decide whether to retry. Default: network errors, 5xx, and 429. */
  retryOn?: (info: RetryDecisionInfo) => boolean;
}

export interface IdempotentFetchOptions {
  /** Underlying fetch. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Header name carrying the key. Default `Idempotency-Key`. */
  header?: string;
  /** Methods that receive a key. Default POST/PUT/PATCH/DELETE. */
  methods?: string[];
  /** Key generator. Default `crypto.randomUUID`. */
  generateKey?: () => string;
  /** Optional store to persist keys across interruptions (keyed by `idempotencyId`). */
  keyStore?: KeyStore;
  /** Retry behavior. Pass `false` to disable retries entirely. */
  retry?: RetryOptions | false;
}

/** Per-request init extended with idempotency controls. */
export interface IdempotentRequestInit extends RequestInit {
  /** Use this exact key instead of generating one. */
  idempotencyKey?: string;
  /** Stable id used to persist/reuse a key via the configured `keyStore`. */
  idempotencyId?: string;
}

export type IdempotentFetch = (
  input: RequestInfo | URL,
  init?: IdempotentRequestInit,
) => Promise<Response>;

const defaultRetryOn = (info: RetryDecisionInfo): boolean => {
  if (info.error) return true; // network/transport failure
  const status = info.response?.status ?? 0;
  return status >= 500 || status === 429;
};

/**
 * Create a `fetch`-compatible function that makes mutating requests safely
 * retryable: it attaches a stable `Idempotency-Key` (generated once per logical
 * request and reused across every retry) and backs off between attempts.
 *
 * Pair it with an idemkit server adapter so a retried request replays the
 * original response instead of executing twice.
 *
 * ```ts
 * import { createIdempotentFetch } from '@idemkit/client';
 *
 * const ifetch = createIdempotentFetch();
 * const res = await ifetch('/api/charges', {
 *   method: 'POST',
 *   body: JSON.stringify({ amount: 1000 }),
 *   headers: { 'content-type': 'application/json' },
 * });
 * ```
 */
export function createIdempotentFetch(options: IdempotentFetchOptions = {}): IdempotentFetch {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error('No fetch implementation available; pass options.fetch.');
  const header = options.header ?? DEFAULT_HEADER;
  const methods = new Set((options.methods ?? DEFAULT_METHODS).map((m) => m.toUpperCase()));
  const genKey = options.generateKey ?? generateIdempotencyKey;
  const keyStore = options.keyStore;

  const retryCfg = options.retry === false ? null : (options.retry ?? {});
  const retries = retryCfg?.retries ?? 2;
  const factor = retryCfg?.factor ?? 2;
  const minDelayMs = retryCfg?.minDelayMs ?? 200;
  const maxDelayMs = retryCfg?.maxDelayMs ?? 5000;
  const retryOn = retryCfg?.retryOn ?? defaultRetryOn;

  return async function idempotentFetch(
    input: RequestInfo | URL,
    init: IdempotentRequestInit = {},
  ): Promise<Response> {
    const method = (init.method ?? 'GET').toUpperCase();
    const { idempotencyKey, idempotencyId, ...rest } = init;
    const baseInit: RequestInit = rest;

    // Non-mutating method: pass through with retry semantics but no key.
    if (!methods.has(method)) {
      return attemptWithRetry(() => fetchImpl(input, baseInit), baseInit.signal);
    }

    const headers = new Headers(baseInit.headers);
    let key = idempotencyKey ?? headers.get(header) ?? undefined;
    if (!key && keyStore && idempotencyId) key = (await keyStore.get(idempotencyId)) ?? undefined;
    if (!key) key = genKey();
    headers.set(header, key);
    if (keyStore && idempotencyId) await keyStore.set(idempotencyId, key);

    const finalInit: RequestInit = { ...baseInit, headers };
    const response = await attemptWithRetry(() => fetchImpl(input, finalInit), finalInit.signal);

    // Definitive (non-retryable) outcome: the key has served its purpose.
    if (keyStore && idempotencyId) await keyStore.delete(idempotencyId);
    return response;
  };

  async function attemptWithRetry(
    run: () => Promise<Response>,
    signal: AbortSignal | null | undefined,
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= (retryCfg ? retries : 0); attempt++) {
      if (signal?.aborted) throw signalError(signal);
      try {
        const response = await run();
        if (attempt < retries && retryCfg && retryOn({ response, attempt })) {
          await backoff(attempt, response);
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
        if (
          isAbortError(error) ||
          !retryCfg ||
          attempt >= retries ||
          !retryOn({ error, attempt })
        ) {
          throw error;
        }
        await backoff(attempt);
      }
    }
    throw lastError;
  }

  async function backoff(attempt: number, response?: Response): Promise<void> {
    const retryAfter = response ? parseRetryAfter(response.headers.get('retry-after')) : undefined;
    const base = Math.min(maxDelayMs, minDelayMs * factor ** attempt);
    const jittered = base / 2 + Math.random() * (base / 2);
    await sleep(retryAfter ?? jittered);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function signalError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Aborted', 'AbortError');
}
