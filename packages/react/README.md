# @hp24/idemkit-react

React hooks for idempotent mutations — built on [`@hp24/idemkit-client`](../client). Part of [idemkit](../../README.md).

```bash
npm install @hp24/idemkit-react @hp24/idemkit-client
```

A `useMutation`-style hook for write operations that must run **at most once**. Each submission gets a stable `Idempotency-Key` reused across automatic *and* manual retries, and concurrent `mutate` calls (double-clicks) share one in-flight request.

## Usage

```tsx
import { useIdempotentMutation } from '@hp24/idemkit-react';

function PayButton({ amount }: { amount: number }) {
  const charge = useIdempotentMutation<{ id: string }, { amount: number }>({
    request: (vars) => ({
      input: '/api/charges',
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(vars),
      },
    }),
    onSuccess: (data) => console.log('charged', data.id),
  });

  return (
    <button disabled={charge.isPending} onClick={() => charge.mutate({ amount })}>
      {charge.isPending ? 'Processing…' : 'Pay'}
    </button>
  );
}
```

Returns `{ mutate, data, error, status, isIdle, isPending, isSuccess, isError, reset }`.

- On error the key is **kept**, so a manual retry reuses it (server replays, no double charge).
- On success the key is cleared — the next submission is a new operation.

## Shared configuration

Wrap your app to share one configured fetch (retry policy, key store, headers):

```tsx
import { IdemkitProvider } from '@hp24/idemkit-react';

<IdemkitProvider retry={{ retries: 3 }}>
  <App />
</IdemkitProvider>;
```

Hooks pick up the provider's client automatically; pass `fetch` per-hook to override.

## License

[MIT](../../LICENSE)
