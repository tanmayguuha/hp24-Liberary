# @idemkit/fastify

Fastify plugin adding `Idempotency-Key` support to your routes. Part of [idemkit](../../README.md).

```bash
npm install @idemkit/fastify @idemkit/core
```

## Usage

```ts
import Fastify from 'fastify';
import { MemoryStore } from '@idemkit/core';
import idempotency from '@idemkit/fastify';

const app = Fastify();
await app.register(idempotency, { store: new MemoryStore() });

app.post('/charges', async () => ({ id: 'ch_123' }));
```

Implemented with a `preHandler` hook (short-circuits replays, conflicts, and mismatches) and an `onSend` hook (captures and persists the first successful response). Same semantics and options as the [Express adapter](../express): replay, `422` mismatch, `409`/wait on duplicates, 5xx not cached.

For multi-instance deployments use `RedisStore` from [`@idemkit/redis`](../redis).

## License

[MIT](../../LICENSE)
