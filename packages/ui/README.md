# hp24-ui

> Zero-config, prop-driven React UI components. Pass props, get accessible UI — no CSS import, no Tailwind setup.

Works in **React, Next.js (App Router & Pages), Vite, or any bundler**. Components are styled with inline styles driven by a shared theme, so there's nothing to import or configure — install and use.

```bash
npm install hp24-ui
```

```tsx
import { Button, Card, Stat, Table } from 'hp24-ui';

export function Dashboard({ charges }) {
  return (
    <Card>
      <Stat label="Revenue" value="$12,500" change="12%" trend="up" />
      <Table
        columns={[
          { key: 'id', header: 'ID' },
          { key: 'amount', header: 'Amount', align: 'right', sortable: true, render: (r) => `$${r.amount}` },
        ]}
        rows={charges}
      />
      <Button intent="primary">New charge</Button>
    </Card>
  );
}
```

No provider required. Wrap with `<ThemeProvider>` only if you want to customize colors/spacing.

## Components

**Layout** — `Stack`, `Inline`, `Grid`, `Center`, `Container`, `Divider`, `Spacer`
**Typography** — `Text`, `Heading`, `Code`
**Actions** — `Button`, `IconButton`, `ButtonGroup`, `Badge`, `Tag`, `Avatar`, `AvatarGroup`
**Feedback** — `Alert`, `Spinner`, `Progress`, `Skeleton`, `EmptyState`
**Surfaces & data** — `Card` (+ `CardHeader`/`CardFooter`), `Stat`, `List`, `Table` (sortable, data-driven)
**Forms** — `Input`, `Textarea`, `Select`, `Dropdown` (single/multi-select, searchable), `Checkbox`, `Radio`, `Switch`, `FormField`
**Interactive** — `Tabs`, `Accordion`, `Modal`, `Tooltip`, `Pagination`, `Breadcrumbs`, `Toast` (`ToastProvider` + `useToast`)

All components are TypeScript-typed, forward refs where it makes sense, accept `style`/`className` and pass through native DOM props.

## Data-driven by design

The components you'll reach for most just take data and render it:

```tsx
// A table from columns + rows
<Table columns={columns} rows={rows} loading={isLoading} striped />

// A list from items
<List items={[{ primary: 'Alice', secondary: 'alice@x.com', trailing: <Badge>Admin</Badge> }]} />

// Tabs / Accordion from items
<Tabs items={[{ id: 'a', label: 'Overview', content: <Overview /> }]} />

// Single-select dropdown
<Dropdown
  options={[{ label: 'Red', value: 'r' }, { label: 'Blue', value: 'b' }]}
  placeholder="Pick a color"
  onChange={(value) => console.log(value)} // string | number | null
/>

// Multi-select, searchable, clearable
<Dropdown
  multiple
  searchable
  options={countries}
  defaultValue={['us']}
  onChange={(values) => console.log(values)} // (string | number)[]
/>
```

The `Dropdown` is controlled or uncontrolled, supports keyboard navigation
(↑/↓/Enter/Esc), disabled options, and closes on outside click. Single mode
calls `onChange` with the value (or `null`); multi mode with an array.

## Theming

```tsx
import { ThemeProvider } from 'hp24-ui';

<ThemeProvider theme={{ colors: { intent: { primary: { solid: '#7c3aed', soft: '#f5f3ff', text: '#5b21b6', onSolid: '#fff' } } } }}>
  <App />
</ThemeProvider>;
```

The `theme` is deep-merged onto the defaults, so you only override what you want.

## Toasts

```tsx
import { ToastProvider, useToast } from 'hp24-ui';

function Save() {
  const { toast } = useToast();
  return <Button onClick={() => toast({ title: 'Saved', intent: 'success' })}>Save</Button>;
}

// Mount once near the root:
<ToastProvider position="bottom-right"><App /></ToastProvider>;
```

## Notes

- Components are client components (`"use client"`), so in Next.js App Router you can use them directly in client components or import them into your own.
- `Modal` and `Toast` render through a portal and are SSR-safe (they no-op on the server).

## License

[MIT](../../LICENSE)
