/**
 * A captured HTTP response, serialized so it can be persisted in any store and
 * replayed verbatim on a later retry carrying the same idempotency key.
 */
export interface SerializedResponse {
  statusCode: number;
  /**
   * Header name -> value(s). Multi-value headers (e.g. `Set-Cookie`) use an array.
   * Hop-by-hop and store-managed headers should be stripped by the adapter.
   */
  headers: Record<string, string | string[]>;
  /** The response body, encoded according to {@link bodyEncoding}. */
  body: string;
  /** How {@link body} is encoded. `base64` is used for binary payloads. */
  bodyEncoding: 'utf8' | 'base64';
}

/** Lifecycle state of a stored idempotency record. */
export type RecordState = 'locked' | 'completed';

/**
 * The unit persisted by an {@link IdempotencyStore}. While a request is in
 * flight the record is `locked` (no response yet); once the handler returns it
 * is `completed` and carries the captured {@link SerializedResponse}.
 */
export interface IdempotencyRecord {
  key: string;
  state: RecordState;
  /** SHA-256 fingerprint of the canonicalized request payload. */
  fingerprint: string;
  /** Present only when {@link state} is `completed`. */
  response?: SerializedResponse;
  /** Epoch millis when the record (lock) was created. */
  createdAt: number;
  /** Epoch millis after which the record may be considered expired. */
  expiresAt: number;
}

/**
 * Outcome of attempting to begin processing for a key. This is the single
 * atomic primitive every store must implement correctly — the `new` branch
 * must be returned to at most one caller for a given key at a time.
 */
export type BeginOutcome =
  /** Lock acquired — this caller should execute the handler. */
  | { kind: 'new' }
  /** Another request currently holds the lock for this key. */
  | { kind: 'in_progress'; record: IdempotencyRecord }
  /** A completed response already exists and the fingerprint matches. */
  | { kind: 'completed'; record: IdempotencyRecord }
  /** A record exists but the request payload differs from the original. */
  | { kind: 'mismatch'; record: IdempotencyRecord };

export interface BeginOptions {
  /** Lifetime of the record in milliseconds. */
  ttlMs: number;
  /**
   * Max time a lock may be held before it is considered stale and reclaimable,
   * in milliseconds. Guards against a crashed process leaving a permanent lock.
   */
  lockTimeoutMs: number;
}

/**
 * Pluggable persistence + locking backend. The contract:
 *
 * - {@link begin} is atomic: for a given key, the `new` outcome is handed to
 *   exactly one concurrent caller; everyone else gets `in_progress`,
 *   `completed`, or `mismatch`.
 * - {@link complete} transitions a `locked` record to `completed`.
 * - {@link fail} releases a lock without storing a response (handler errored),
 *   so the operation can be retried.
 */
export interface IdempotencyStore {
  begin(key: string, fingerprint: string, opts: BeginOptions): Promise<BeginOutcome>;
  complete(key: string, response: SerializedResponse): Promise<void>;
  fail(key: string): Promise<void>;
  get(key: string): Promise<IdempotencyRecord | null>;
  /** Optional: free resources (connections, timers). */
  close?(): Promise<void> | void;
}

/** What the engine decided the caller (framework adapter) should do. */
export type EngineDecision =
  /** No key present and config allows it — run the handler without protection. */
  | { action: 'passthrough' }
  /** Handler was executed; persist + return this freshly produced response. */
  | { action: 'executed'; response: SerializedResponse }
  /** Return this cached response; it is a replay of a prior result. */
  | { action: 'replayed'; response: SerializedResponse; originalCreatedAt: number }
  /** A request with this key is still in flight. Adapter returns a conflict. */
  | { action: 'in_progress' }
  /** Key reused with a different payload. Adapter returns a mismatch error. */
  | { action: 'mismatch' };

export interface RunInput {
  /** The idempotency key, or `null`/`undefined` when the client sent none. */
  key: string | null | undefined;
  /**
   * Raw request payload used to compute the fingerprint. A string/Buffer is
   * hashed as-is; any other value is canonicalized to stable JSON first.
   */
  payload: unknown;
  /**
   * Produces the response to cache. Called at most once per key. Throwing
   * releases the lock (via {@link IdempotencyStore.fail}) and rethrows.
   */
  execute: () => Promise<SerializedResponse>;
  /**
   * Decide whether a produced response should be persisted for replay. Returning
   * `false` releases the lock instead of storing — so the operation can be
   * retried (the typical use: never cache 5xx/error responses). Defaults to
   * caching every response.
   */
  cacheable?: (response: SerializedResponse) => boolean;
}

export interface IdempotencyConfig {
  store: IdempotencyStore;
  /** Record lifetime. Default 24h. */
  ttlMs?: number;
  /** Stale-lock reclaim window. Default 30s. */
  lockTimeoutMs?: number;
  /**
   * Behavior when an in-flight duplicate is detected.
   * - `conflict` (default): immediately decide `in_progress` (adapter -> 409).
   * - `wait`: poll the store until the original completes, then replay it.
   */
  onConflict?: 'conflict' | 'wait';
  /** Polling interval in ms when `onConflict: 'wait'`. Default 50ms. */
  waitPollMs?: number;
  /** Max total wait in ms when `onConflict: 'wait'`. Default = lockTimeoutMs. */
  waitTimeoutMs?: number;
}
