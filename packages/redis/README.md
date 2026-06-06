# @idemkit/redis

Production-grade Redis storage adapter for [idemkit](../../README.md). Use this for multi-instance / serverless deployments where an in-memory store can't deduplicate across processes.

```bash
npm install @idemkit/redis @idemkit/core ioredis
```

## Usage

```ts
import Redis from 'ioredis';
import { RedisStore } from '@idemkit/redis';
import { idempotency } from '@idemkit/express';

const store = new RedisStore({
  client: new Redis(process.env.REDIS_URL),
  prefix: 'idemkit:', // optional
});

app.use(idempotency({ store }));
```

Drop it into any idemkit adapter — the store is the only thing that changes between dev and prod.

## Concurrency model

`begin` runs a single **atomic Lua script**: it either acquires a fresh lock (`SET ... PX`) for an unseen/expired/stale key, or returns the current record. Stale locks (held past `lockTimeoutMs`) are reclaimed in the same round-trip, so a crashed process can never permanently block a key. Across many app instances, only one caller per key gets the `new` outcome at a time.

`ioredis` is a peer dependency — you bring and configure the client (clustering, TLS, auth, etc.). Any client matching the small `RedisLike` interface works.

## License

[MIT](../../LICENSE)
