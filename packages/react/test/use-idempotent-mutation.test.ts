// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useIdempotentMutation } from '../src/use-idempotent-mutation.js';

function makeFetch(impl?: (init: RequestInit) => Response) {
  const keys: (string | undefined)[] = [];
  const fn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    keys.push((init as { idempotencyKey?: string })?.idempotencyKey);
    return impl ? impl(init ?? {}) : new Response(JSON.stringify({ id: 'ch_1' }), { status: 200 });
  });
  return { fn, keys };
}

const request = (vars: { amt: number }) => ({
  input: '/api/charges',
  init: { method: 'POST', body: JSON.stringify(vars) },
});

describe('@hp24/idemkit-react useIdempotentMutation', () => {
  it('resolves with parsed data and sets success state', async () => {
    const { fn } = makeFetch();
    const { result } = renderHook(() =>
      useIdempotentMutation<{ id: string }, { amt: number }>({ fetch: fn, request }),
    );

    await act(async () => {
      await result.current.mutate({ amt: 10 });
    });

    expect(result.current.data).toEqual({ id: 'ch_1' });
    expect(result.current.isSuccess).toBe(true);
  });

  it('attaches an Idempotency-Key', async () => {
    const { fn, keys } = makeFetch();
    const { result } = renderHook(() => useIdempotentMutation({ fetch: fn, request }));
    await act(async () => {
      await result.current.mutate({ amt: 10 });
    });
    expect(keys[0]).toBeTruthy();
  });

  it('de-duplicates concurrent submissions (double-click) to one request', async () => {
    const { fn, keys } = makeFetch();
    const { result } = renderHook(() => useIdempotentMutation({ fetch: fn, request }));

    await act(async () => {
      const a = result.current.mutate({ amt: 10 });
      const b = result.current.mutate({ amt: 10 });
      await Promise.all([a, b]);
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(keys).toHaveLength(1);
  });

  it('surfaces non-2xx as an error and keeps the key for retry', async () => {
    let attempt = 0;
    const { fn, keys } = makeFetch(() => {
      attempt++;
      return attempt === 1
        ? new Response('nope', { status: 500 })
        : new Response(JSON.stringify({ id: 'ch_2' }), { status: 200 });
    });
    const { result } = renderHook(() => useIdempotentMutation({ fetch: fn, request }));

    await act(async () => {
      await result.current.mutate({ amt: 10 }).catch(() => {});
    });
    expect(result.current.isError).toBe(true);

    await act(async () => {
      await result.current.mutate({ amt: 10 });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Same idempotency key on the manual retry.
    expect(new Set(keys).size).toBe(1);
  });

  it('reset() returns to idle', async () => {
    const { fn } = makeFetch();
    const { result } = renderHook(() => useIdempotentMutation({ fetch: fn, request }));
    await act(async () => {
      await result.current.mutate({ amt: 10 });
    });
    act(() => result.current.reset());
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});
