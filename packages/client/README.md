# @idemkit/client

Universal (browser + Node) idempotent `fetch` wrapper — the client half of [idemkit](../../README.md). Zero dependencies.

```bash
npm install @idemkit/client
```

It generates a stable `Idempotency-Key` per logical request, **reuses the same key across retries**, persists keys across interruptions (optional), and backs off between attempts. Pair it with an idemkit server adapter and a retried request replays instead of executing twice.

## Usage

```ts
import { createIdempotentFetch } from '@idemkit/client';

const ifetch = createIdempotentFetch({
  retry: { retries: 3, minDelayMs: 200 },
});

const res = await ifetch('/api/charges', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ amount: 1000 }),
});
```

- A key is attached to mutating methods (POST/PUT/PATCH/DELETE) only.
- Network errors, `5xx`, and `429` are retried (configurable via `retryOn`); `Retry-After` is honored.
- Every retry sends the **same** key, so the server deduplicates.

## Surviving reloads

Persist the key so an operation interrupted mid-flight (tab reload, crash) retries with the *same* key:

```ts
import { createIdempotentFetch, localStorageKeyStore } from '@idemkit/client';

const ifetch = createIdempotentFetch({ keyStore: localStorageKeyStore() });

await ifetch('/api/orders', {
  method: 'POST',
  idempotencyId: 'checkout-cart-42', // stable id → stable key until it succeeds
  body: JSON.stringify(cart),
});
```

`memoryKeyStore()` (default-friendly) and `localStorageKeyStore()` are included; implement `KeyStore` for anything else.

## License

[MIT](../../LICENSE)
