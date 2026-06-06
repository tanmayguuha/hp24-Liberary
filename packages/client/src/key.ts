/**
 * Generate a fresh idempotency key. Uses the platform `crypto.randomUUID`
 * (browsers and Node ≥ 18) and falls back to a random hex string elsewhere.
 */
export function generateIdempotencyKey(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Last-resort fallback (non-crypto). Sufficient for uniqueness, not secrecy.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Persists keys so an operation that is interrupted (tab reload, crash) can be
 * retried with the *same* key, preserving idempotency across page lifetimes.
 * Implementations may be sync or async.
 */
export interface KeyStore {
  get(id: string): string | null | Promise<string | null>;
  set(id: string, key: string): void | Promise<void>;
  delete(id: string): void | Promise<void>;
}

/** A {@link KeyStore} backed by `localStorage` (browser-only). */
export function localStorageKeyStore(prefix = 'idemkit:'): KeyStore {
  const ls = (globalThis as { localStorage?: Storage }).localStorage;
  if (!ls) throw new Error('localStorageKeyStore requires a browser `localStorage`.');
  return {
    get: (id) => ls.getItem(prefix + id),
    set: (id, key) => ls.setItem(prefix + id, key),
    delete: (id) => ls.removeItem(prefix + id),
  };
}

/** An in-memory {@link KeyStore} (default; survives within a single runtime). */
export function memoryKeyStore(): KeyStore {
  const map = new Map<string, string>();
  return {
    get: (id) => map.get(id) ?? null,
    set: (id, key) => void map.set(id, key),
    delete: (id) => void map.delete(id),
  };
}
