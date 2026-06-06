import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { teeResponse, writeStored } from '../src/node.js';
import type { SerializedResponse } from '../src/types.js';

/** Minimal ServerResponse fake exercising the surface teeResponse/writeStored use. */
class FakeResponse extends EventEmitter {
  statusCode = 200;
  private headers: Record<string, string | string[] | number> = {};
  written: Buffer[] = [];

  setHeader(key: string, value: string | string[] | number) {
    this.headers[key] = value;
  }
  getHeaders() {
    return this.headers;
  }
  private push(chunk: unknown) {
    if (typeof chunk === 'string') this.written.push(Buffer.from(chunk));
    else if (Buffer.isBuffer(chunk)) this.written.push(chunk);
  }
  write(chunk: unknown) {
    this.push(chunk);
    return true;
  }
  end(chunk?: unknown) {
    // Real ServerResponse.end writes to the socket, not back through res.write.
    if (chunk && typeof chunk !== 'function') this.push(chunk);
    this.emit('finish');
    return this;
  }
}

describe('node response tee', () => {
  it('captures status, headers and body, stripping non-replayable headers', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: structural fake of ServerResponse.
    const res = new FakeResponse() as any;
    res.statusCode = 201;
    res.setHeader('content-type', 'application/json');
    res.setHeader('content-length', 11); // must be stripped
    const captured = teeResponse(res);
    res.write('{"id":');
    res.end('"x"}');

    const serialized = await captured;
    expect(serialized.statusCode).toBe(201);
    expect(serialized.headers['content-type']).toBe('application/json');
    expect(serialized.headers['content-length']).toBeUndefined();
    expect(Buffer.from(serialized.body, 'base64').toString()).toBe('{"id":"x"}');
  });

  it('writeStored replays status, headers, body and the replay marker', () => {
    // biome-ignore lint/suspicious/noExplicitAny: structural fake of ServerResponse.
    const res = new FakeResponse() as any;
    const stored: SerializedResponse = {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from('{"ok":true}').toString('base64'),
      bodyEncoding: 'base64',
    };
    writeStored(res, stored, 'x-idempotency-replay');
    expect(res.statusCode).toBe(200);
    expect(res.getHeaders()['x-idempotency-replay']).toBe('true');
    expect(Buffer.concat(res.written).toString()).toBe('{"ok":true}');
  });
});
