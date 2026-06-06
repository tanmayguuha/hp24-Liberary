/** Base class for all idemkit errors, so consumers can `instanceof IdemkitError`. */
export class IdemkitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Thrown (or surfaced as a decision) when a request reuses an existing
 * idempotency key with a different payload. Maps to HTTP 422 by default.
 */
export class IdempotencyKeyConflictError extends IdemkitError {
  constructor(public readonly key: string) {
    super(`Idempotency-Key "${redact(key)}" was already used with a different request payload.`);
  }
}

/**
 * Thrown (or surfaced) when another request with the same key is still being
 * processed and the configured policy is to reject. Maps to HTTP 409.
 */
export class RequestInProgressError extends IdemkitError {
  constructor(public readonly key: string) {
    super(`A request with Idempotency-Key "${redact(key)}" is still being processed.`);
  }
}

/** Thrown when `onConflict: 'wait'` times out before the original completes. */
export class ConflictWaitTimeoutError extends IdemkitError {
  constructor(public readonly key: string) {
    super(`Timed out waiting for the in-flight request with key "${redact(key)}" to finish.`);
  }
}

/**
 * Never log full keys. Shows enough to correlate while keeping the secret part
 * out of logs and error strings.
 */
function redact(key: string): string {
  if (key.length <= 8) return '***';
  return `${key.slice(0, 4)}…${key.slice(-2)}`;
}
