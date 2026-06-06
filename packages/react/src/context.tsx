import {
  type IdempotentFetch,
  type IdempotentFetchOptions,
  createIdempotentFetch,
} from '@hp24/idemkit-client';
import { type ReactNode, createContext, createElement, useContext, useMemo, useRef } from 'react';

const FetchContext = createContext<IdempotentFetch | null>(null);

export interface IdemkitProviderProps extends IdempotentFetchOptions {
  children: ReactNode;
  /** Provide a pre-built fetch instead of constructing one from the options. */
  client?: IdempotentFetch;
}

/**
 * Provides a shared, configured idempotent fetch to the hooks below. Mount once
 * near the root of your app:
 *
 * ```tsx
 * <IdemkitProvider retry={{ retries: 3 }}>
 *   <App />
 * </IdemkitProvider>
 * ```
 */
export function IdemkitProvider({ children, client, ...options }: IdemkitProviderProps) {
  // Build the fetch once from the initial options; an explicit `client` wins.
  const builtRef = useRef<IdempotentFetch | null>(null);
  if (builtRef.current === null) builtRef.current = createIdempotentFetch(options);
  const value = client ?? builtRef.current;
  return createElement(FetchContext.Provider, { value }, children);
}

/**
 * Access the idempotent fetch from context. Falls back to a default instance
 * (global `fetch`, default retry) when used outside a provider.
 */
export function useIdempotentFetch(): IdempotentFetch {
  const ctx = useContext(FetchContext);
  const fallback = useMemo(() => createIdempotentFetch(), []);
  return ctx ?? fallback;
}
