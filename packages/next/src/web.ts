import type { SerializedResponse } from 'hp24-idemkit-core';

const NON_REPLAYABLE = new Set(['connection', 'keep-alive', 'transfer-encoding', 'content-length']);

/** Serialize a Web `Response` (App Router) into a storable record. The caller
 * must pass a clone so the original body stays readable for the client. */
export async function serializeWebResponse(res: Response): Promise<SerializedResponse> {
  const buffer = Buffer.from(await res.arrayBuffer());
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    if (!NON_REPLAYABLE.has(key.toLowerCase())) headers[key] = value;
  });
  return {
    statusCode: res.status,
    headers,
    body: buffer.toString('base64'),
    bodyEncoding: 'base64',
  };
}

/** Reconstruct a Web `Response` from a stored record, for replay. */
export function buildWebResponse(
  stored: SerializedResponse,
  replayHeader: string | false,
): Response {
  const headers = new Headers();
  for (const [key, value] of Object.entries(stored.headers)) {
    if (Array.isArray(value)) for (const v of value) headers.append(key, v);
    else headers.set(key, value);
  }
  if (replayHeader) headers.set(replayHeader, 'true');
  const body = stored.statusCode === 204 ? null : Buffer.from(stored.body, 'base64');
  return new Response(body, { status: stored.statusCode, headers });
}

export function jsonResponse(status: number, detail: string): Response {
  return new Response(JSON.stringify({ error: { status, detail } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
