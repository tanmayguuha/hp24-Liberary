import type { ServerResponse } from 'node:http';
import type { SerializedResponse } from './types.js';

/** Headers that must not be replayed verbatim — they are connection- or
 * length-specific and are recomputed when the cached body is re-sent. */
const NON_REPLAYABLE = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-length',
  'date',
]);

/**
 * Tee a Node response: the handler's output is sent to the client as normal
 * while a copy is buffered. Resolves with a {@link SerializedResponse} once the
 * response finishes, so it can be persisted for later replay.
 *
 * Bodies are stored base64-encoded so binary payloads round-trip safely.
 *
 * Note: this buffers the full body in memory and is unsuitable for streaming
 * responses; idempotency is intended for discrete request/response operations.
 */
export function teeResponse(res: ServerResponse): Promise<SerializedResponse> {
  const chunks: Buffer[] = [];
  const origWrite = res.write.bind(res);
  const origEnd = res.end.bind(res);

  const collect = (chunk: unknown, encoding?: unknown) => {
    if (chunk == null) return;
    if (Buffer.isBuffer(chunk)) chunks.push(chunk);
    else if (typeof chunk === 'string')
      chunks.push(
        Buffer.from(chunk, typeof encoding === 'string' ? (encoding as BufferEncoding) : 'utf8'),
      );
    else if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk));
  };

  // biome-ignore lint/suspicious/noExplicitAny: monkeypatching overloaded Node signatures.
  res.write = ((chunk: any, encoding?: any, cb?: any) => {
    collect(chunk, encoding);
    return origWrite(chunk, encoding, cb);
  }) as typeof res.write;

  // biome-ignore lint/suspicious/noExplicitAny: monkeypatching overloaded Node signatures.
  res.end = ((chunk?: any, encoding?: any, cb?: any) => {
    if (typeof chunk !== 'function') collect(chunk, encoding);
    return origEnd(chunk, encoding, cb);
  }) as typeof res.end;

  return new Promise((resolve, reject) => {
    res.on('finish', () => {
      resolve({
        statusCode: res.statusCode,
        headers: normalizeHeaders(res.getHeaders()),
        body: Buffer.concat(chunks).toString('base64'),
        bodyEncoding: 'base64',
      });
    });
    res.on('error', reject);
  });
}

function normalizeHeaders(
  headers: Record<string, string | string[] | number | undefined>,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (NON_REPLAYABLE.has(key.toLowerCase())) continue;
    out[key] = typeof value === 'number' ? String(value) : value;
  }
  return out;
}

/** Write a previously captured response back to the client (a replay). */
export function writeStored(
  res: ServerResponse,
  stored: SerializedResponse,
  replayHeader: string | false,
): void {
  res.statusCode = stored.statusCode;
  for (const [key, value] of Object.entries(stored.headers)) {
    res.setHeader(key, value);
  }
  if (replayHeader) res.setHeader(replayHeader, 'true');
  res.end(Buffer.from(stored.body, stored.bodyEncoding === 'base64' ? 'base64' : 'utf8'));
}
