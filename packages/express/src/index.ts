import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  type AdapterOptions,
  IdempotencyEngine,
  STATUS,
  type SerializedResponse,
  isProtectedMethod,
  resolveAdapterOptions,
} from 'hp24-idemkit-core';
import { teeResponse, writeStored } from 'hp24-idemkit-core/node';

export interface ExpressIdempotencyOptions extends AdapterOptions {
  /**
   * Decide whether a produced response should be cached. Defaults to caching
   * only 2xx responses, so transient 5xx errors don't poison the key.
   */
  cacheable?: (response: SerializedResponse) => boolean;
  /**
   * Extract the payload used for the body fingerprint. Defaults to `req.body`
   * (so a body parser must run first). Return `undefined` to fingerprint on the
   * key alone.
   */
  payload?: (req: Request) => unknown;
}

const cacheableDefault = (r: SerializedResponse) => r.statusCode >= 200 && r.statusCode < 300;

/**
 * Express middleware that makes the routes it guards idempotent.
 *
 * Mount it before the handlers you want protected:
 *
 * ```ts
 * import express from 'express';
 * import { MemoryStore } from 'hp24-idemkit-core';
 * import { idempotency } from 'hp24-idemkit-express';
 *
 * const app = express();
 * app.use(express.json());
 * app.use(idempotency({ store: new MemoryStore() }));
 *
 * app.post('/charges', (req, res) => res.status(201).json({ id: 'ch_1' }));
 * ```
 *
 * A client that sends the same `Idempotency-Key` twice gets the original
 * response replayed (with `X-Idempotency-Replay: true`) and the handler runs
 * only once — even for two concurrent retries.
 */
export function idempotency(options: ExpressIdempotencyOptions): RequestHandler {
  const resolved = resolveAdapterOptions(options);
  const engine = new IdempotencyEngine(options);
  const cacheable = options.cacheable ?? cacheableDefault;
  const getPayload = options.payload ?? ((req: Request) => (req as { body?: unknown }).body);

  return function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (!isProtectedMethod(req.method, resolved)) {
      next();
      return;
    }

    const headerValue = req.headers[resolved.header];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!key) {
      if (resolved.missingKey === 'require') {
        sendProblem(res, STATUS.missingKey, `Missing required "${resolved.header}" header.`);
        return;
      }
      next();
      return;
    }

    engine
      .run({
        key,
        payload: getPayload(req),
        cacheable,
        // The handler chain IS the operation; tee its output for caching.
        execute: () => {
          const captured = teeResponse(res);
          next();
          return captured;
        },
      })
      .then((decision) => {
        switch (decision.action) {
          case 'executed':
            // Already streamed to the client by teeResponse; nothing to do.
            return;
          case 'replayed':
            writeStored(res, decision.response, resolved.replayHeader);
            return;
          case 'in_progress':
            sendProblem(res, STATUS.inProgress, 'A request with this key is already in progress.');
            return;
          case 'mismatch':
            sendProblem(
              res,
              STATUS.mismatch,
              'This Idempotency-Key was already used with a different request payload.',
            );
            return;
          case 'passthrough':
            next();
            return;
        }
      })
      .catch(next);
  };
}

function sendProblem(res: Response, status: number, detail: string): void {
  if (res.headersSent) return;
  res.status(status).json({ error: { status, detail } });
}
