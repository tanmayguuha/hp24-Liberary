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

---

## Component catalog

Every component is TypeScript-typed, forwards refs where it makes sense, accepts `style`/`className`, and passes through native DOM props.

### Theme

| Export | What it does | Key props |
| --- | --- | --- |
| `ThemeProvider` | Optional — overrides theme tokens for the tree (deep-merged onto defaults). | `theme`, `children` |
| `useTheme()` | Hook returning the active theme. | — |
| `defaultTheme` | The built-in light theme object. | — |

### Layout

| Component | What it does | Key props |
| --- | --- | --- |
| `Stack` | Vertical flex with consistent spacing. | `gap` (4px units, default 3), `align`, `justify`, `wrap` |
| `Inline` | Horizontal flex with consistent spacing. | `gap` (default 2), `align`, `justify`, `wrap` |
| `Grid` | CSS grid. | `columns` (number \| template string, default 2), `gap` |
| `Center` | Centers children on both axes. | — |
| `Container` | Centered, width-capped page container. | `maxWidth` (default 1100), `padded` |
| `Divider` | Thin separating rule, optionally labeled. | `orientation`, `label` |
| `Spacer` | Fixed or flexible empty space. | `size` (omit to grow & fill) |

### Typography

| Component | What it does | Key props |
| --- | --- | --- |
| `Text` | Body text. | `as`, `size` (xs/sm/md/lg), `weight`, `tone`, `align`, `truncate` |
| `Heading` | Section heading h1–h6 on a type scale. | `level` (1–6) |
| `Code` | Inline monospace code. | — |

### Actions

| Component | What it does | Key props |
| --- | --- | --- |
| `Button` | Primary action. | `intent`, `variant` (solid/soft/outline/ghost/link), `size`, `loading`, `fullWidth`, `leftIcon`, `rightIcon` |
| `IconButton` | Square, icon-only button. | requires `aria-label` (+ all `Button` props) |
| `ButtonGroup` | Attaches buttons into one segment. | — |
| `Badge` | Compact status label. | `intent`, `variant` (solid/soft/outline), `dot`, `pill` |
| `Tag` | A removable `Badge`. | `onRemove` |
| `Avatar` | Image, or colored initials fallback. | `src`, `name`, `size`, `initials` |
| `AvatarGroup` | Overlapping cluster with “+N” overflow. | `max`, `size` |

### Feedback

| Component | What it does | Key props |
| --- | --- | --- |
| `Spinner` | Indeterminate loading spinner. | `size`, `color` |
| `Progress` | Determinate / indeterminate bar. | `value` (0–100; omit = indeterminate), `intent`, `size` |
| `Skeleton` | Shimmering content placeholder. | `width`, `height`, `circle` |
| `Alert` | Contextual message banner. | `intent`, `title`, `onClose`, `icon` |
| `EmptyState` | Placeholder when there's no data. | `title`, `description`, `icon`, `action` |

### Surfaces & data

| Component | What it does | Key props |
| --- | --- | --- |
| `Card` | Surface container. | `elevation` (flat/sm/md/lg), `padded`, `interactive` |
| `CardHeader` | Title/subtitle/action row for a card. | `title`, `subtitle`, `action` |
| `CardFooter` | Bordered footer row for a card. | — |
| `Stat` | KPI / metric tile. | `label`, `value`, `change`, `trend` (up/down/flat), `icon` |
| `List` | Vertical list from an items array. | `items` (`ListItem[]`), `divided` |
| `Table` | Sortable, data-driven table. | `columns`, `rows`, `rowKey`, `onRowClick`, `loading`, `empty`, `striped`, `stickyHeader` |

### Forms

| Component | What it does | Key props |
| --- | --- | --- |
| `Input` | Text input with focus ring & validation. | `size`, `invalid`, `leftIcon`, `rightIcon` |
| `Textarea` | Multi-line text input. | `invalid`, `rows` |
| `Select` | Native select from an options array. | `options`, `placeholder`, `size`, `invalid` |
| `Dropdown` | **Single / multi-select** with search. | `options`, `multiple`, `searchable`, `clearable`, `value`/`defaultValue`, `onChange`, `placeholder`, `size`, `invalid`, `disabled` |
| `Checkbox` | Checkbox with inline label. | `label` |
| `Radio` | Radio button with inline label. | `label` |
| `Switch` | Toggle switch. | `label`, `checked`/`defaultChecked` |
| `FormField` | Wraps a control with label/hint/error, wired via `htmlFor`/`aria-describedby`. | `label`, `required`, `hint`, `error` |

### Interactive

| Component | What it does | Key props |
| --- | --- | --- |
| `Tabs` | Tabbed panels from an items array. | `items` (`TabItem[]`), `value`/`defaultValue`, `onChange`, `variant` (underline/pill) |
| `Accordion` | Collapsible panels from an items array. | `items` (`AccordionItem[]`), `multiple`, `defaultOpen` |
| `Modal` | Accessible dialog rendered in a portal. | `open`, `onClose`, `title`, `footer`, `width`, `closeOnBackdrop`, `closeOnEsc` |
| `Tooltip` | Hover/focus tooltip around a child. | `label`, `placement` (top/bottom/left/right) |
| `Pagination` | Prev/next with truncated page numbers. | `page`, `pageCount`, `onChange`, `siblings` |
| `Breadcrumbs` | Breadcrumb trail. | `items` (`Crumb[]`), `separator` |
| `ToastProvider` | Mount once near the root; provides the toast API. | `position` |
| `useToast()` | Returns `{ toast, dismiss }`. | — |

---

## Data-driven by design

The components you'll reach for most just take data and render it:

```tsx
// A table from columns + rows
<Table columns={columns} rows={rows} loading={isLoading} striped />

// A list from items
<List items={[{ primary: 'Alice', secondary: 'alice@x.com', trailing: <Badge>Admin</Badge> }]} />

// Tabs / Accordion from items
<Tabs items={[{ id: 'a', label: 'Overview', content: <Overview /> }]} />
```

## Dropdown (single & multi-select)

```tsx
// Single-select
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

Controlled or uncontrolled, keyboard navigation (↑/↓/Enter/Esc), disabled options, removable chips in multi mode, and closes on outside click. Single mode calls `onChange` with the value (or `null`); multi mode with an array. Use `keywords` on an option to make search match a node label. Pairs with `FormField` for labels/validation.

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
