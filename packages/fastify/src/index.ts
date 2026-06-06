import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import {
  type AdapterOptions,
  DEFAULTS,
  STATUS,
  type SerializedResponse,
  fingerprint as computeFingerprint,
  isProtectedMethod,
  resolveAdapterOptions,
} from 'hp24-idemkit-core';

export interface FastifyIdempotencyOptions extends AdapterOptions {
  cacheable?: (response: SerializedResponse) => boolean;
  /** Defaults to `request.body`. */
  payload?: (request: FastifyRequest) => unknown;
}

const cacheableDefault = (r: SerializedResponse) => r.statusCode >= 200 && r.statusCode < 300;

/** Per-request state stashed on the request object. */
const STATE = Symbol('idemkit.state');
interface CaptureState {
  key: string;
  ttlMs: number;
  lockTimeoutMs: number;
}
type RequestWithState = FastifyRequest & { [STATE]?: CaptureState };

/**
 * Fastify plugin adding `Idempotency-Key` support.
 *
 * ```ts
 * import Fastify from 'fastify';
 * import { MemoryStore } from 'hp24-idemkit-core';
 * import idempotency from 'hp24-idemkit-fastify';
 *
 * const app = Fastify();
 * await app.register(idempotency, { store: new MemoryStore() });
 * app.post('/charges', async () => ({ id: 'ch_1' }));
 * ```
 *
 * Implemented with `preHandler` (short-circuit replays / conflicts) and
 * `onSend` (capture and persist the first successful response).
 */
const plugin: FastifyPluginAsync<FastifyIdempotencyOptions> = async (fastify, options) => {
  const resolved = resolveAdapterOptions(options);
  const store = options.store;
  const cacheable = options.cacheable ?? cacheableDefault;
  const getPayload = options.payload ?? ((req: FastifyRequest) => req.body);
  const ttlMs = options.ttlMs ?? DEFAULTS.ttlMs;
  const lockTimeoutMs = options.lockTimeoutMs ?? DEFAULTS.lockTimeoutMs;
  const onConflict = options.onConflict ?? 'conflict';
  const waitPollMs = options.waitPollMs ?? DEFAULTS.waitPollMs;
  const waitTimeoutMs = options.waitTimeoutMs ?? lockTimeoutMs;

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isProtectedMethod(request.method, resolved)) return;

    const headerValue = request.headers[resolved.header];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!key) {
      if (resolved.missingKey === 'require') {
        await reply.code(STATUS.missingKey).send({
          error: {
            status: STATUS.missingKey,
            detail: `Missing required "${resolved.header}" header.`,
          },
        });
      }
      return;
    }

    const fp = computeFingerprint(getPayload(request));
    let outcome = await store.begin(key, fp, { ttlMs, lockTimeoutMs });

    if (outcome.kind === 'in_progress' && onConflict === 'wait') {
      outcome = await waitForCompletion(store, key, fp, waitPollMs, waitTimeoutMs);
    }

    switch (outcome.kind) {
      case 'new':
        (request as RequestWithState)[STATE] = { key, ttlMs, lockTimeoutMs };
        return; // proceed to the route handler; onSend captures the result
      case 'completed':
        replayWith(reply, outcome.record.response, resolved.replayHeader);
        return reply;
      case 'mismatch':
        await reply.code(STATUS.mismatch).send({
          error: {
            status: STATUS.mismatch,
            detail: 'This Idempotency-Key was already used with a different request payload.',
          },
        });
        return reply;
      case 'in_progress':
        await reply.code(STATUS.inProgress).send({
          error: {
            status: STATUS.inProgress,
            detail: 'A request with this key is already in progress.',
          },
        });
        return reply;
    }
  });

  fastify.addHook(
    'onSend',
    async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      const state = (request as RequestWithState)[STATE];
      if (!state) return payload;

      const serialized = serializeReply(reply, payload);
      if (!serialized) {
        // Non-bufferable payload (e.g. a stream) — release the lock, don't cache.
        await store.fail(state.key);
        return payload;
      }
      if (cacheable(serialized)) await store.complete(state.key, serialized);
      else await store.fail(state.key);
      return payload;
    },
  );
};

function serializeReply(reply: FastifyReply, payload: unknown): SerializedResponse | null {
  let body: Buffer;
  if (Buffer.isBuffer(payload)) body = payload;
  else if (typeof payload === 'string') body = Buffer.from(payload, 'utf8');
  else if (payload == null) body = Buffer.alloc(0);
  else return null; // stream or other non-bufferable payload

  const headers: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(reply.getHeaders())) {
    if (value === undefined) continue;
    headers[key] = typeof value === 'number' ? String(value) : (value as string | string[]);
  }
  return {
    statusCode: reply.statusCode,
    headers,
    body: body.toString('base64'),
    bodyEncoding: 'base64',
  };
}

function replayWith(
  reply: FastifyReply,
  stored: SerializedResponse | undefined,
  replayHeader: string | false,
): void {
  if (!stored) return;
  reply.code(stored.statusCode);
  for (const [key, value] of Object.entries(stored.headers)) {
    if (key.toLowerCase() === 'content-length') continue;
    reply.header(key, value);
  }
  if (replayHeader) reply.header(replayHeader, 'true');
  reply.send(Buffer.from(stored.body, stored.bodyEncoding === 'base64' ? 'base64' : 'utf8'));
}

async function waitForCompletion(
  store: AdapterOptions['store'],
  key: string,
  fingerprint: string,
  pollMs: number,
  timeoutMs: number,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    const record = await store.get(key);
    if (!record) return { kind: 'in_progress' as const, record: undefined as never };
    if (record.fingerprint !== fingerprint) return { kind: 'mismatch' as const, record };
    if (record.state === 'completed') return { kind: 'completed' as const, record };
  }
  return { kind: 'in_progress' as const, record: undefined as never };
}

export default fp(plugin, { name: 'hp24-idemkit-fastify', fastify: '4.x || 5.x' });
export { plugin as idempotencyPlugin };
