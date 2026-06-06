import {
  type AdapterOptions,
  IdempotencyEngine,
  STATUS,
  type SerializedResponse,
  isProtectedMethod,
  resolveAdapterOptions,
} from '@hp24/idemkit-core';
import { teeResponse, writeStored } from '@hp24/idemkit-core/node';
import type { NextApiRequest, NextApiResponse } from 'next';

export interface NextApiIdempotencyOptions extends AdapterOptions {
  cacheable?: (response: SerializedResponse) => boolean;
  /** Defaults to `req.body` (Next parses JSON bodies by default). */
  payload?: (req: NextApiRequest) => unknown;
}

const cacheableDefault = (r: SerializedResponse) => r.statusCode >= 200 && r.statusCode < 300;

/**
 * Wrap a Next.js **Pages API** route handler (`pages/api/*`) so it becomes
 * idempotent.
 *
 * ```ts
 * // pages/api/charges.ts
 * import { MemoryStore } from '@hp24/idemkit-core';
 * import { withIdempotencyApi } from '@hp24/idemkit-next';
 *
 * const store = new MemoryStore();
 * export default withIdempotencyApi((req, res) => {
 *   res.status(201).json({ id: 'ch_1' });
 * }, { store });
 * ```
 */
export function withIdempotencyApi(
  handler: (req: NextApiRequest, res: NextApiResponse) => unknown | Promise<unknown>,
  options: NextApiIdempotencyOptions,
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  const resolved = resolveAdapterOptions(options);
  const engine = new IdempotencyEngine(options);
  const cacheable = options.cacheable ?? cacheableDefault;
  const getPayload = options.payload ?? ((req: NextApiRequest) => req.body);

  return async function idempotentApiHandler(
    req: NextApiRequest,
    res: NextApiResponse,
  ): Promise<void> {
    if (!isProtectedMethod(req.method ?? 'GET', resolved)) {
      await handler(req, res);
      return;
    }

    const headerValue = req.headers[resolved.header];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!key) {
      if (resolved.missingKey === 'require') {
        res.status(STATUS.missingKey).json({
          error: {
            status: STATUS.missingKey,
            detail: `Missing required "${resolved.header}" header.`,
          },
        });
        return;
      }
      await handler(req, res);
      return;
    }

    const decision = await engine.run({
      key,
      payload: getPayload(req),
      cacheable,
      execute: async () => {
        const captured = teeResponse(res);
        await handler(req, res);
        return captured;
      },
    });

    switch (decision.action) {
      case 'executed':
        return; // already streamed by teeResponse
      case 'replayed':
        writeStored(res, decision.response, resolved.replayHeader);
        return;
      case 'in_progress':
        res.status(STATUS.inProgress).json({
          error: {
            status: STATUS.inProgress,
            detail: 'A request with this key is already in progress.',
          },
        });
        return;
      case 'mismatch':
        res.status(STATUS.mismatch).json({
          error: {
            status: STATUS.mismatch,
            detail: 'This Idempotency-Key was already used with a different request payload.',
          },
        });
        return;
      case 'passthrough':
        await handler(req, res);
        return;
    }
  };
}
