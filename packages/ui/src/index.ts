// Theme — the styling system the Dropdown is built on. Wrap your app in
// <ThemeProvider> to customize colors/spacing; everything works without it too.
export { ThemeProvider, useTheme, defaultTheme } from './theme.js';
export type { Theme, Intent, Size, ThemeProviderProps } from './theme.js';

// Dropdown — single- or multi-select with search, keyboard nav, and theming.
export { Dropdown } from './Dropdown.js';
export type {
  DropdownProps,
  DropdownSingleProps,
  DropdownMultiProps,
  DropdownOption,
} from './Dropdown.js';
