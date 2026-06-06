# idemkit

> A TypeScript-first, storage-agnostic **idempotency toolkit** for Node.js APIs and JS/React clients.

Network requests are unreliable. Clients, proxies, and retry logic routinely send the same request more than once. For non-idempotent operations — charging a card, creating an order, sending money — a duplicate request means a duplicate side effect.

The HTTP convention to fix this is the **`Idempotency-Key`** header: the client attaches a unique key per logical operation; the server processes the first request, caches the result, and replays it for any retry carrying the same key.

`idemkit` gives you both halves of that contract:

- **On the server** — drop-in middleware/wrappers that make a route idempotent in one line, correct under concurrency, with pluggable storage.
- **On the client** — a universal `fetch` wrapper and a React hook that generate, persist, and reuse the key across retries so a flaky network never double-submits.

## Packages

| Package | What it does |
|---|---|
| [`@idemkit/core`](packages/core) | Framework-agnostic engine, storage interface, in-memory store, body fingerprinting, concurrency-safe lock-before-execute. **Zero runtime deps.** |
| [`@idemkit/express`](packages/express) | Express middleware. |
| [`@idemkit/next`](packages/next) | Next.js App Router (`withIdempotency`) and Pages API (`withIdempotencyApi`) wrappers. |
| [`@idemkit/fastify`](packages/fastify) | Fastify plugin. |
| [`@idemkit/redis`](packages/redis) | Production Redis store with atomic locks for multi-instance deployments. |
| [`@idemkit/client`](packages/client) | Universal idempotent `fetch` wrapper (key generation + persistence + retry). |
| [`@idemkit/react`](packages/react) | `useIdempotentMutation` hook + provider. |

## Quick start (Express + browser)

**Server**

```ts
import express from 'express';
import { MemoryStore } from '@idemkit/core';
import { idempotency } from '@idemkit/express';

const app = express();
app.use(express.json());
app.use(idempotency({ store: new MemoryStore() }));

app.post('/charges', (req, res) => {
  // Runs at most once per Idempotency-Key.
  res.status(201).json({ id: 'ch_123' });
});
```

**Client**

```ts
import { createIdempotentFetch } from '@idemkit/client';

const ifetch = createIdempotentFetch();
const res = await ifetch('/charges', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ amount: 1000 }),
});
// Retries reuse the same key → the server replays instead of charging twice.
```

For production, swap `MemoryStore` for `RedisStore` from `@idemkit/redis`. Nothing else changes.

## How it works

1. The client attaches an `Idempotency-Key`. The first request **acquires a lock** keyed by it (`store.begin`).
2. Only the lock holder runs the handler; its response is captured and stored under the key with a TTL.
3. A retry with the same key + same payload **replays** the stored response (`X-Idempotency-Replay: true`) — the handler never runs twice.
4. A concurrent duplicate is either rejected with `409` or made to **wait** and replay (configurable).
5. A reused key with a **different** payload is rejected with `422`.
6. If the handler errors, the lock is **released** so the operation can be retried — a key is never permanently poisoned.

The hard part — being correct when two retries race — is handled in the engine via lock-before-execute, with dedicated concurrency tests.

## Configuration highlights

```ts
idempotency({
  store,                       // any IdempotencyStore (memory / redis / your own)
  header: 'Idempotency-Key',   // header to read (case-insensitive)
  methods: ['POST', 'PATCH', 'PUT', 'DELETE'],
  missingKey: 'pass',          // or 'require' → 400 when a protected method has no key
  onConflict: 'conflict',      // or 'wait' → block the duplicate and replay
  ttlMs: 24 * 60 * 60 * 1000,  // how long a result is replayable
  lockTimeoutMs: 30_000,       // stale-lock reclaim window (crash safety)
});
```

## Development

```bash
pnpm install
pnpm build       # tsup → ESM + CJS + d.ts for every package
pnpm test        # vitest (unit + concurrency + integration)
pnpm typecheck
pnpm lint        # biome
```

This is a pnpm-workspaces monorepo. Each package ships dual ESM/CJS with a typed `exports` map.

## License

[MIT](LICENSE) © Kapil
