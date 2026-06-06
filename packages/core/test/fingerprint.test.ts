import { describe, expect, it } from 'vitest';
import { canonicalJSON, fingerprint } from '../src/fingerprint.js';

describe('fingerprint', () => {
  it('is stable regardless of object key order', () => {
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }));
  });

  it('is stable for nested objects', () => {
    expect(fingerprint({ x: { a: 1, b: 2 } })).toBe(fingerprint({ x: { b: 2, a: 1 } }));
  });

  it('preserves array order (order is meaningful)', () => {
    expect(fingerprint([1, 2, 3])).not.toBe(fingerprint([3, 2, 1]));
  });

  it('differs for different payloads', () => {
    expect(fingerprint({ amount: 100 })).not.toBe(fingerprint({ amount: 200 }));
  });

  it('hashes strings as-is', () => {
    expect(fingerprint('hello')).toBe(fingerprint('hello'));
    expect(fingerprint('hello')).not.toBe(fingerprint('world'));
  });

  it('hashes binary payloads', () => {
    expect(fingerprint(new Uint8Array([1, 2, 3]))).toBe(fingerprint(new Uint8Array([1, 2, 3])));
  });

  it('gives a consistent fingerprint for empty payloads', () => {
    expect(fingerprint(null)).toBe(fingerprint(undefined));
  });

  it('canonicalJSON sorts keys recursively', () => {
    expect(canonicalJSON({ b: 1, a: { d: 1, c: 2 } })).toBe('{"a":{"c":2,"d":1},"b":1}');
  });
});
