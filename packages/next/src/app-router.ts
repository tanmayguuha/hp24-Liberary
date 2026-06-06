import {
  type AdapterOptions,
  IdempotencyEngine,
  STATUS,
  type SerializedResponse,
  isProtectedMethod,
  resolveAdapterOptions,
} from '@hp24/idemkit-core';
import { buildWebResponse, jsonResponse, serializeWebResponse } from './web.js';

/** An App Router route handler: `(req, ctx) => Response`. `ctx` carries the
 * dynamic route params object Next.js passes as the second argument. */
export type AppRouteHandler<Ctx = unknown> = (
  request: Request,
  context: Ctx,
) => Promise<Response> | Response;

export interface NextIdempotencyOptions extends AdapterOptions {
  /** Cache predicate. Defaults to caching only 2xx responses. */
  cacheable?: (response: SerializedResponse) => boolean;
  /** Derive the fingerprint payload from the request. Defaults to the raw body text. */
  payload?: (request: Request) => unknown | Promise<unknown>;
}

const cacheableDefault = (r: SerializedResponse) => r.statusCode >= 200 && r.statusCode < 300;

/**
 * Wrap a Next.js **App Router** route handler so it becomes idempotent.
 *
 * ```ts
 * // app/api/charges/route.ts
 * import { MemoryStore } from '@hp24/idemkit-core';
 * import { withIdempotency } from '@hp24/idemkit-next';
 *
 * const store = new MemoryStore();
 * export const POST = withIdempotency(async (req) => {
 *   const body = await req.json();
 *   return Response.json({ id: 'ch_1' }, { status: 201 });
 * }, { store });
 * ```
 *
 * Reuse a single `store` across requests (module scope) — a new store per
 * request would defeat the point.
 */
export function withIdempotency<Ctx = unknown>(
  handler: AppRouteHandler<Ctx>,
  options: NextIdempotencyOptions,
): AppRouteHandler<Ctx> {
  const resolved = resolveAdapterOptions(options);
  const engine = new IdempotencyEngine(options);
  const cacheable = options.cacheable ?? cacheableDefault;

  return async function idempotentHandler(request: Request, context: Ctx): Promise<Response> {
    if (!isProtectedMethod(request.method, resolved)) {
      return handler(request, context);
    }

    const key = request.headers.get(resolved.header);
    if (!key) {
      if (resolved.missingKey === 'require') {
        return jsonResponse(STATUS.missingKey, `Missing required "${resolved.header}" header.`);
      }
      return handler(request, context);
    }

    const payload = options.payload ? await options.payload(request) : await request.clone().text();

    const decision = await engine.run({
      key,
      payload,
      cacheable,
      execute: async () => {
        const response = await handler(request, context);
        // Clone so we can read the body for storage while returning the original.
        return serializeWebResponse(response.clone());
      },
    });

    switch (decision.action) {
      case 'executed':
        // We serialized a clone; re-run is impossible, so rebuild from the record.
        return buildWebResponse(decision.response, false);
      case 'replayed':
        return buildWebResponse(decision.response, resolved.replayHeader);
      case 'in_progress':
        return jsonResponse(STATUS.inProgress, 'A request with this key is already in progress.');
      case 'mismatch':
        return jsonResponse(
          STATUS.mismatch,
          'This Idempotency-Key was already used with a different request payload.',
        );
      case 'passthrough':
        return handler(request, context);
    }
  };
}
