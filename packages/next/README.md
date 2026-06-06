# hp24-idemkit-next

Idempotency for Next.js — wrappers for both the **App Router** and the **Pages API**. Part of [idemkit](../../README.md).

```bash
npm install hp24-idemkit-next hp24-idemkit-core
```

## App Router (`app/api/*/route.ts`)

```ts
import { MemoryStore } from 'hp24-idemkit-core';
import { withIdempotency } from 'hp24-idemkit-next';

const store = new MemoryStore(); // module scope — reuse across requests

export const POST = withIdempotency(async (req) => {
  const body = await req.json();
  return Response.json({ id: 'ch_123' }, { status: 201 });
}, { store });
```

## Pages API (`pages/api/*.ts`)

```ts
import { MemoryStore } from 'hp24-idemkit-core';
import { withIdempotencyApi } from 'hp24-idemkit-next';

const store = new MemoryStore();

export default withIdempotencyApi((req, res) => {
  res.status(201).json({ id: 'ch_123' });
}, { store });
```

Behavior matches the rest of idemkit: replay on repeat (`X-Idempotency-Replay: true`), `422` on payload mismatch, `409` (or wait) on concurrent duplicates, 5xx not cached.

> **Use a module-scoped store**, not one created per request — a fresh store per invocation can't deduplicate anything. In serverless, prefer [`hp24-idemkit-redis`](../redis) so the store is shared across instances and survives cold starts.

Options are the same as the [Express adapter](../express). License: [MIT](../../LICENSE).
