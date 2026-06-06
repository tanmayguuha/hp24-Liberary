import { type ReactNode, createContext, createElement, useContext } from 'react';

/** Semantic intent colors used across the theme (primary highlights, danger/invalid states, …). */
export type Intent =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';
/** Standard sizing scale. */
export type Size = 'sm' | 'md' | 'lg';

export interface Theme {
  colors: {
    /** Per-intent solid color + the text color that sits legibly on it. */
    intent: Record<Intent, { solid: string; soft: string; text: string; onSolid: string }>;
    text: string;
    textMuted: string;
    bg: string;
    surface: string;
    border: string;
    focusRing: string;
    overlay: string;
  };
  radii: { sm: number; md: number; lg: number; pill: number };
  space: (n: number) => number; // 4px base scale
  fontSizes: Record<Size, number>;
  fontFamily: string;
  shadows: { sm: string; md: string; lg: string };
}

const intent = (
  solid: string,
  soft: string,
  text: string,
): { solid: string; soft: string; text: string; onSolid: string } => ({
  solid,
  soft,
  text,
  onSolid: '#ffffff',
});

/** The built-in light theme. Components fall back to this without a provider. */
export const defaultTheme: Theme = {
  colors: {
    intent: {
      primary: intent('#4f46e5', '#eef2ff', '#3730a3'),
      secondary: intent('#475569', '#f1f5f9', '#334155'),
      success: intent('#16a34a', '#f0fdf4', '#166534'),
      warning: { solid: '#f59e0b', soft: '#fffbeb', text: '#92400e', onSolid: '#1f2937' },
      danger: intent('#dc2626', '#fef2f2', '#991b1b'),
      info: intent('#0284c7', '#f0f9ff', '#075985'),
      neutral: intent('#64748b', '#f8fafc', '#334155'),
    },
    text: '#0f172a',
    textMuted: '#64748b',
    bg: '#ffffff',
    surface: '#ffffff',
    border: '#e2e8f0',
    focusRing: 'rgba(79, 70, 229, 0.4)',
    overlay: 'rgba(15, 23, 42, 0.45)',
  },
  radii: { sm: 6, md: 10, lg: 16, pill: 9999 },
  space: (n: number) => n * 4,
  fontSizes: { sm: 13, md: 15, lg: 18 },
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  shadows: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
    md: '0 4px 12px rgba(15, 23, 42, 0.10)',
    lg: '0 12px 32px rgba(15, 23, 42, 0.18)',
  },
};

const ThemeContext = createContext<Theme>(defaultTheme);

export interface ThemeProviderProps {
  /** Partial overrides deep-merged onto the default theme. */
  theme?: DeepPartial<Theme>;
  children: ReactNode;
}

/** Optional — wrap your app to customize colors/spacing. Components work without it. */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const merged = theme ? mergeTheme(defaultTheme, theme) : defaultTheme;
  return createElement(ThemeContext.Provider, { value: merged }, children);
}

/** Access the active theme (provider value, or the default). */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function mergeTheme(base: Theme, override: DeepPartial<Theme>): Theme {
  return deepMerge(
    base as unknown as Record<string, unknown>,
    override as unknown as Record<string, unknown>,
  ) as unknown as Theme;
}

/** Recursively merge plain objects; non-objects in `override` win. */
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const value = override[key];
    if (value === undefined) continue;
    const baseVal = base[key];
    if (isPlainObject(baseVal) && isPlainObject(value)) {
      out[key] = deepMerge(baseVal, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
