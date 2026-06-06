# hp24-ui

## 0.3.1

### Patch Changes

- Docs: rewrite the README to be beginner-friendly — features list, complete copy-paste examples (controlled & uncontrolled), a clear props table, and the option shape.

## 0.3.0

### Minor Changes

- **Breaking:** scope the library down to just the `Dropdown` (plus the `ThemeProvider`/`useTheme` theming layer). All other components (Button, Card, Table, Tabs, Modal, etc.) have been removed for now and will be reintroduced one at a time. If you depend on those, pin to `0.2.x`.

## 0.2.1

### Patch Changes

- Docs: add a full component catalog to the README (tables per category with key props for every export), so the npm page lists all available components.

## 0.2.0

### Minor Changes

- Add `Dropdown` component — a single- or multi-select dropdown with optional search, keyboard navigation (↑/↓/Enter/Esc), clearable selection, disabled options, and full theming. Controlled or uncontrolled; pass `multiple` to switch modes.
