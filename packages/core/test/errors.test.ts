import { describe, expect, it } from 'vitest';
import {
  ConflictWaitTimeoutError,
  IdemkitError,
  IdempotencyKeyConflictError,
  RequestInProgressError,
} from '../src/errors.js';

describe('errors', () => {
  it('all errors extend IdemkitError with a useful name', () => {
    for (const err of [
      new IdempotencyKeyConflictError('abcdef1234'),
      new RequestInProgressError('abcdef1234'),
      new ConflictWaitTimeoutError('abcdef1234'),
    ]) {
      expect(err).toBeInstanceOf(IdemkitError);
      expect(err.name).toBe(err.constructor.name);
    }
  });

  it('redacts the key in messages — long keys show only edges', () => {
    const err = new IdempotencyKeyConflictError('supersecretkey99');
    expect(err.message).toContain('supe');
    expect(err.message).toContain('99');
    expect(err.message).not.toContain('supersecretkey99');
    expect(err.key).toBe('supersecretkey99'); // full value still available programmatically
  });

  it('fully masks short keys', () => {
    expect(new RequestInProgressError('short').message).toContain('***');
  });
});
