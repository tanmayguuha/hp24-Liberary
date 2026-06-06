# hp24-ui

> A zero-config, accessible **Dropdown** for React — single or multi-select, searchable. Just pass options and go. No CSS import, no Tailwind, no setup.

Works in **React, Next.js (App Router & Pages), Vite, or any bundler**. It's styled with inline styles, so there's nothing to import or configure — install it and it just looks right.

> ℹ️ This library is being built one component at a time. Today it ships the **Dropdown** (plus an optional theme). More components are coming.

## Features

- 🎯 **Single & multi-select** — one prop (`multiple`) switches modes
- 🔎 **Searchable** — optional type-to-filter box
- ⌨️ **Keyboard friendly** — arrow keys, Enter, Esc
- ♿ **Accessible** — proper combobox/listbox roles
- 🧩 **Controlled or uncontrolled** — your choice
- 🎨 **Themeable** — optional `ThemeProvider`, works fine without it
- 0️⃣ **Zero dependencies**, TypeScript types included

## Install

```bash
npm install hp24-ui
```

## Quick start

A complete, working single-select. Copy, paste, run:

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

When the user picks an option, `onChange` is called with that option's `value` (or `null` if cleared).

## Multi-select

Add `multiple`. Now `value` is an **array**, and selected items show as removable chips:

```tsx
import { useState } from 'react';
import { Dropdown } from 'hp24-ui';

export function TagPicker() {
  const [tags, setTags] = useState(['react']); // (string | number)[]

  return (
    <Dropdown
      multiple
      searchable
      placeholder="Add tags"
      options={[
        { label: 'React', value: 'react' },
        { label: 'Vue', value: 'vue' },
        { label: 'Svelte', value: 'svelte' },
        { label: 'Angular', value: 'angular' },
      ]}
      value={tags}
      onChange={setTags}
    />
  );
}
```

## Don't want to manage state?

Use `defaultValue` instead of `value` and the Dropdown tracks its own selection (uncontrolled):

```tsx
<Dropdown
  options={options}
  defaultValue="green"
  onChange={(value) => console.log('picked', value)}
/>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `DropdownOption[]` | — | **Required.** The choices. Each is `{ label, value, disabled?, keywords? }`. |
| `multiple` | `boolean` | `false` | Turn on multi-select. Changes `value`/`onChange` to arrays. |
| `value` | single: `string \| number \| null` · multi: `(string \| number)[]` | — | Controlled value. Pair with `onChange`. |
| `defaultValue` | same as `value` | — | Uncontrolled initial value (don't combine with `value`). |
| `onChange` | `(value) => void` | — | Fires on every change. Single → the value or `null`; multi → the array. |
| `searchable` | `boolean` | `false` | Show a search box that filters options. |
| `clearable` | `boolean` | `true` | Show a ✕ button to clear the selection. |
| `placeholder` | `string` | `'Select…'` | Text shown when nothing is selected. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Control size. |
| `invalid` | `boolean` | `false` | Show the red error style (e.g. for form validation). |
| `disabled` | `boolean` | `false` | Disable the whole control. |
| `emptyMessage` | `ReactNode` | `'No options'` | Shown when a search matches nothing. |
| `maxMenuHeight` | `number` | `260` | Max height (px) of the open menu before it scrolls. |

### The option shape

```ts
interface DropdownOption {
  label: React.ReactNode;       // what the user sees
  value: string | number;       // what onChange gives you
  disabled?: boolean;           // greyed-out, not selectable
  keywords?: string;            // extra text to match when searching
                                // (handy when label is an icon/JSX, not plain text)
}
```

## Theming (optional)

The Dropdown looks good out of the box. To match your brand, wrap your app once in `ThemeProvider` and override only what you want — it's deep-merged onto the defaults:

```tsx
import { ThemeProvider } from 'hp24-ui';

<ThemeProvider
  theme={{
    colors: { intent: { primary: { solid: '#7c3aed', soft: '#f5f3ff', text: '#5b21b6', onSolid: '#fff' } } },
  }}
>
  <App />
</ThemeProvider>;
```

## Notes

- Ships as a client component (`"use client"`) — drop it straight into a Next.js App Router page.
- Fully typed: TypeScript infers the single vs. multi prop shapes from `multiple`.

## License

[MIT](../../LICENSE)
