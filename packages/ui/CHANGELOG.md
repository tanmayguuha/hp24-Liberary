# hp24-ui

## 0.5.0

### Minor Changes

- Add `CommonTable` — a flexible, data-driven table with sorting, row selection, and custom cell rendering. Exports the `CommonTable` component and `Column` type.

## 0.4.0

### Minor Changes

- feat: add CommonTable component with sorting, selection, and custom rendering

  - Flexible data table with multi-column sorting (single and multi-column modes)
  - Row selection with visual highlighting and keyboard navigation
  - Custom cell rendering with full TypeScript support
  - Loading, empty, and error states
  - Footer row support with sticky pinning after sorting
  - Three row sizes (small, medium, large)
  - Full keyboard accessibility (Enter, Space, Tab navigation)
  - 33 comprehensive tests covering all scenarios
  - Zero external dependencies (React only)

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
