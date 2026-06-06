# hp24-ui

> Zero-config, accessible React components — just pass props, get polished UI. No CSS import, no Tailwind, no setup.

Works in **React, Next.js (App Router & Pages), Vite, or any bundler**. Components are styled with inline styles, so there's nothing to import or configure — install and use.

> ℹ️ This library is built one component at a time. Today it ships:
> - **`Dropdown`** — single/multi-select with search
> - **`CommonTable`** — sortable, data-driven table
>
> ...plus an optional `ThemeProvider`. More components are coming.

## Install

```bash
npm install hp24-ui
```

---

# Dropdown

A single- or multi-select with optional search, keyboard navigation, and theming.

```tsx
import { useState } from 'react';
import { Dropdown } from 'hp24-ui';

export function ColorPicker() {
  const [color, setColor] = useState(null); // string | number | null

  return (
    <Dropdown
      placeholder="Pick a color"
      options={[
        { label: 'Red', value: 'red' },
        { label: 'Green', value: 'green' },
        { label: 'Blue', value: 'blue' },
      ]}
      value={color}
      onChange={setColor}
    />
  );
}
```

**Multi-select** — add `multiple`; `value` becomes an array and selections show as removable chips:

```tsx
<Dropdown
  multiple
  searchable
  placeholder="Add tags"
  options={tagOptions}
  value={tags}
  onChange={setTags} // (string | number)[]
/>
```

Controlled (`value`) or uncontrolled (`defaultValue`), keyboard nav (↑/↓/Enter/Esc), disabled options, and closes on outside click.

### Dropdown props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `DropdownOption[]` | — | **Required.** `{ label, value, disabled?, keywords? }`. |
| `multiple` | `boolean` | `false` | Multi-select mode (arrays + chips). |
| `value` | single: `string \| number \| null` · multi: `(string \| number)[]` | — | Controlled value. |
| `defaultValue` | same as `value` | — | Uncontrolled initial value. |
| `onChange` | `(value) => void` | — | Single → value or `null`; multi → array. |
| `searchable` | `boolean` | `false` | Show a filter box. |
| `clearable` | `boolean` | `true` | Show a ✕ to clear. |
| `placeholder` | `string` | `'Select…'` | Empty-state text. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Control size. |
| `invalid` | `boolean` | `false` | Error style. |
| `disabled` | `boolean` | `false` | Disable the control. |
| `emptyMessage` | `ReactNode` | `'No options'` | Shown when search matches nothing. |
| `maxMenuHeight` | `number` | `260` | Menu max height (px) before scroll. |

---

# CommonTable

A flexible, data-driven table with click-to-sort, optional multi-column sort, row selection, custom cell rendering, loading/empty/error states, and sticky columns. Generic over your row type.

```tsx
import { CommonTable, type Column } from 'hp24-ui';

type User = { id: number; name: string; email: string; age: number };

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
  { id: 2, name: 'Bob', email: 'bob@example.com', age: 25 },
];

const columns: Column<User>[] = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'email', title: 'Email' },
  { key: 'age', title: 'Age', sortable: true, render: (u) => `${u.age} yrs` },
];

export function UsersTable() {
  return (
    <CommonTable
      data={users}
      columns={columns}
      onRowClick={(row) => console.log('clicked', row)}
    />
  );
}
```

Click a sortable header to cycle **ascending → descending → unsorted**. Set `multiSort` to sort by several columns at once. Provide `render` for custom cells and `sortValue` to control how a column sorts (e.g. dates or computed values).

### CommonTable props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `T[]` | — | **Required.** The rows. |
| `columns` | `Column<T>[]` | — | **Required.** Column definitions (see below). |
| `isLoading` | `boolean` | `false` | Show a loading row instead of data. |
| `emptyState` | `ReactNode` | built-in | Shown when `data` is empty. |
| `errorState` | `ReactNode` | — | When set, shown instead of the rows. |
| `onRowClick` | `(row, rowIndex) => void` | — | Makes rows clickable (keyboard-accessible). |
| `selectedRowIndex` | `number` | — | Highlights the selected row. |
| `multiSort` | `boolean` | `false` | Allow sorting by multiple columns. |
| `rowSize` | `'small' \| 'medium' \| 'large'` | `'medium'` | Row height. |
| `className` | `string` | `''` | Class on the scroll wrapper. |

### Column definition

```ts
interface Column<T> {
  key: string;                                   // row field key / unique id
  title: React.ReactNode;                        // header content
  width?: number | string;                       // column width
  sticky?: boolean;                              // pin the column (sticky-left)
  sortable?: boolean;                            // default true; set false to disable sort
  render?: (row: T, rowIndex: number) => React.ReactNode;          // custom cell
  sortValue?: (row: T) => string | number | boolean | Date | null; // custom sort key
}
```

---

## Theming (optional)

The components look good out of the box. Wrap your app once in `ThemeProvider` to customize colors/spacing — it's deep-merged onto the defaults, so you only override what you want:

```tsx
import { ThemeProvider } from 'hp24-ui';

<ThemeProvider
  theme={{ colors: { intent: { primary: { solid: '#7c3aed', soft: '#f5f3ff', text: '#5b21b6', onSolid: '#fff' } } } }}
>
  <App />
</ThemeProvider>;
```

## Notes

- Components ship as client components (`"use client"`) — drop them straight into a Next.js App Router page.
- Fully typed; `Dropdown` infers single vs. multi from `multiple`, and `CommonTable` is generic over your row type.

## License

[MIT](../../LICENSE)
