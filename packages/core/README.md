# hp24-idemkit-core

Framework-agnostic idempotency engine — the heart of [idemkit](../../README.md). Zero runtime dependencies.

You usually install a framework adapter (`hp24-idemkit-express`, `hp24-idemkit-next`, `hp24-idemkit-fastify`) which depends on this. Install core directly when building your own adapter or a custom store.

```bash
npm install hp24-idemkit-core
```

## What's in the box

- **`IdempotencyEngine`** — orchestrates lock-before-execute: acquire a lock, run the operation at most once, capture/replay the response, release the lock on error.
- **`MemoryStore`** — in-process store, concurrency-safe within one Node process. Great for dev/tests/single-instance.
- **`fingerprint`** — stable SHA-256 of a canonicalized payload (key order doesn't matter).
- **`IdempotencyStore`** — the interface every store implements (`begin` / `complete` / `fail` / `get`).
- **Adapter kit** — `resolveAdapterOptions`, `isProtectedMethod`, `STATUS`, defaults shared by all adapters.
- **`hp24-idemkit-core/node`** — `teeResponse` / `writeStored` helpers for Node `ServerResponse`-based adapters.

## Engine example

```ts
import { IdempotencyEngine, MemoryStore } from 'hp24-idemkit-core';

const engine = new IdempotencyEngine({ store: new MemoryStore(), onConflict: 'wait' });

const decision = await engine.run({
  key: req.headers['idempotency-key'],
  payload: req.body,                      // fingerprinted to detect key reuse
  cacheable: (r) => r.statusCode < 300,   // don't cache errors
  execute: async () => ({ statusCode: 201, headers: {}, body: '{"id":1}', bodyEncoding: 'utf8' }),
});

switch (decision.action) {
  case 'executed':   /* fresh result */ break;
  case 'replayed':   /* cached result */ break;
  case 'in_progress': /* 409 */ break;
  case 'mismatch':   /* 422 */ break;
  case 'passthrough': /* no key */ break;
}
```

## Implementing a custom store

Implement `IdempotencyStore`. The one rule that matters: **`begin` must be atomic** — for a given key, the `new` outcome goes to exactly one concurrent caller; everyone else gets `in_progress`, `completed`, or `mismatch`. See `MemoryStore` and `hp24-idemkit-redis` for reference implementations.

## License

[MIT](../../LICENSE)
