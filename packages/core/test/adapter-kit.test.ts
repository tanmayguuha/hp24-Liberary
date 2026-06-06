import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HEADER,
  DEFAULT_REPLAY_HEADER,
  isProtectedMethod,
  resolveAdapterOptions,
} from '../src/adapter-kit.js';
import { MemoryStore } from '../src/store/memory.js';

const store = new MemoryStore();

describe('adapter-kit', () => {
  it('applies defaults', () => {
    const r = resolveAdapterOptions({ store });
    expect(r.header).toBe(DEFAULT_HEADER);
    expect(r.replayHeader).toBe(DEFAULT_REPLAY_HEADER);
    expect(r.missingKey).toBe('pass');
    expect(r.methodSet.has('POST')).toBe(true);
    expect(r.methodSet.has('GET')).toBe(false);
  });

  it('lowercases the header and uppercases methods', () => {
    const r = resolveAdapterOptions({ store, header: 'X-Idem', methods: ['post', 'options'] });
    expect(r.header).toBe('x-idem');
    expect(r.methodSet).toEqual(new Set(['POST', 'OPTIONS']));
  });

  it('can disable the replay header', () => {
    expect(resolveAdapterOptions({ store, replayHeader: false }).replayHeader).toBe(false);
  });

  it('isProtectedMethod is case-insensitive', () => {
    const r = resolveAdapterOptions({ store });
    expect(isProtectedMethod('post', r)).toBe(true);
    expect(isProtectedMethod('GET', r)).toBe(false);
  });
});
