# hp24-idemkit-express

Express middleware that makes your routes idempotent via the `Idempotency-Key` header. Part of [idemkit](../../README.md).

```bash
npm install hp24-idemkit-express hp24-idemkit-core
```

## Usage

```ts
import express from 'express';
import { MemoryStore } from 'hp24-idemkit-core';
import { idempotency } from 'hp24-idemkit-express';

const app = express();
app.use(express.json()); // body parser must run first (used for the fingerprint)
app.use(idempotency({ store: new MemoryStore() }));

app.post('/charges', (req, res) => {
  res.status(201).json({ id: 'ch_123' });
});
```

- First request with a key → handler runs, response is cached and returned.
- Repeat with the same key + body → cached response replayed, `X-Idempotency-Replay: true`, handler **not** run.
- Same key, different body → `422`.
- Concurrent duplicate → `409` (default) or it waits and replays (`onConflict: 'wait'`).
- 5xx responses are **not** cached, so clients can safely retry.

## Options

```ts
idempotency({
  store,                       // required: any IdempotencyStore
  header: 'Idempotency-Key',
  methods: ['POST', 'PATCH', 'PUT', 'DELETE'],
  missingKey: 'pass',          // 'require' → 400 if a protected method has no key
  replayHeader: 'X-Idempotency-Replay', // or false to disable
  onConflict: 'conflict',      // 'wait' to block-and-replay duplicates
  ttlMs: 86_400_000,
  cacheable: (r) => r.statusCode >= 200 && r.statusCode < 300,
  payload: (req) => req.body,  // override what gets fingerprinted
});
```

For production multi-instance deployments, use `RedisStore` from [`hp24-idemkit-redis`](../redis).

> Buffers the response body to capture it for replay — intended for discrete request/response endpoints, not streaming.

## License

[MIT](../../LICENSE)
