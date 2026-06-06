import {
  type IdempotentFetch,
  type IdempotentRequestInit,
  generateIdempotencyKey,
} from 'hp24-idemkit-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIdempotentFetch } from './context.js';

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

/** Thrown by default when the server returns a non-2xx response. */
export class HttpError extends Error {
  constructor(public readonly response: Response) {
    super(`Request failed with status ${response.status}`);
    this.name = 'HttpError';
  }
}

export interface UseIdempotentMutationOptions<TData, TVariables> {
  /** Build the request from the variables passed to `mutate`. */
  request: (variables: TVariables) => {
    input: RequestInfo | URL;
    init?: Omit<IdempotentRequestInit, 'idempotencyKey'>;
  };
  /** Override the fetch (else uses the provider's, else a default instance). */
  fetch?: IdempotentFetch;
  /** Parse the response body. Default: `res.json()`. */
  parse?: (response: Response) => TData | Promise<TData>;
  /** Reject on non-2xx responses. Default true. */
  throwOnError?: boolean;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
}

export interface UseIdempotentMutationResult<TData, TVariables> {
  /** Submit the mutation. Concurrent calls while pending share the in-flight promise. */
  mutate: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: unknown;
  status: MutationStatus;
  isIdle: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Clear state and forget the current idempotency key. */
  reset: () => void;
}

/**
 * A `useMutation`-style hook for write operations that must run at most once.
 *
 * Each logical submission gets a stable `Idempotency-Key` that is reused across
 * the client's automatic retries *and* across manual retries after an error —
 * so a flaky network never produces a duplicate side effect. While a mutation
 * is pending, repeated `mutate` calls (e.g. a double-click) return the same
 * in-flight promise rather than firing a second request.
 *
 * ```tsx
 * const charge = useIdempotentMutation<{ id: string }, { amount: number }>({
 *   request: (vars) => ({
 *     input: '/api/charges',
 *     init: { method: 'POST', body: JSON.stringify(vars), headers: { 'content-type': 'application/json' } },
 *   }),
 * });
 * <button disabled={charge.isPending} onClick={() => charge.mutate({ amount: 1000 })}>Pay</button>
 * ```
 */
export function useIdempotentMutation<TData = unknown, TVariables = void>(
  options: UseIdempotentMutationOptions<TData, TVariables>,
): UseIdempotentMutationResult<TData, TVariables> {
  const ambientFetch = useIdempotentFetch();
  const fetchImpl = options.fetch ?? ambientFetch;

  const [status, setStatus] = useState<MutationStatus>('idle');
  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);

  const keyRef = useRef<string | null>(null);
  const inFlightRef = useRef<Promise<TData> | null>(null);
  const mountedRef = useRef(true);
  // Keep the latest options without forcing `mutate` to change identity.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSet = useCallback(<T>(setter: (v: T) => void, value: T) => {
    if (mountedRef.current) setter(value);
  }, []);

  const reset = useCallback(() => {
    keyRef.current = null;
    inFlightRef.current = null;
    safeSet(setStatus, 'idle');
    safeSet(setData, undefined);
    safeSet(setError, undefined);
  }, [safeSet]);

  const mutate = useCallback(
    (variables: TVariables): Promise<TData> => {
      // De-duplicate concurrent submissions of the same logical operation.
      if (inFlightRef.current) return inFlightRef.current;

      const opts = optionsRef.current;
      const throwOnError = opts.throwOnError ?? true;
      // Reuse an existing key (manual retry after error) or mint a new one.
      if (keyRef.current === null) keyRef.current = generateIdempotencyKey();
      const key = keyRef.current;

      safeSet(setStatus, 'pending');
      safeSet(setError, undefined);

      const promise = (async (): Promise<TData> => {
        const { input, init } = opts.request(variables);
        const response = await fetchImpl(input, { ...init, idempotencyKey: key });
        if (throwOnError && !response.ok) throw new HttpError(response);
        const parsed = opts.parse ? await opts.parse(response) : ((await response.json()) as TData);
        return parsed;
      })();

      inFlightRef.current = promise;

      return promise.then(
        (result) => {
          inFlightRef.current = null;
          keyRef.current = null; // success — next submission is a new operation
          safeSet(setData, result);
          safeSet(setStatus, 'success');
          opts.onSuccess?.(result, variables);
          return result;
        },
        (err) => {
          inFlightRef.current = null;
          // Keep keyRef so a manual retry reuses the same idempotency key.
          safeSet(setError, err);
          safeSet(setStatus, 'error');
          opts.onError?.(err, variables);
          throw err;
        },
      );
    },
    [fetchImpl, safeSet],
  );

  return {
    mutate,
    data,
    error,
    status,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    reset,
  };
}
