import { type CSSProperties, type HTMLAttributes, forwardRef } from 'react';
import { useTheme } from './theme.js';

type DivProps = HTMLAttributes<HTMLDivElement>;

export interface StackProps extends DivProps {
  /** Gap between children, in 4px units (e.g. 4 → 16px). Default 3. */
  gap?: number;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  wrap?: boolean;
}

/** Vertical flex layout with consistent spacing. */
export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  { gap = 3, align, justify, wrap, style, ...rest },
  ref,
) {
  const t = useTheme();
  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space(gap),
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : undefined,
        ...style,
      }}
      {...rest}
    />
  );
});

/** Horizontal flex layout with consistent spacing. */
export const Inline = forwardRef<HTMLDivElement, StackProps>(function Inline(
  { gap = 2, align = 'center', justify, wrap = true, style, ...rest },
  ref,
) {
  const t = useTheme();
  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: t.space(gap),
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
      {...rest}
    />
  );
});

export interface GridProps extends DivProps {
  /** Number of columns, or a full grid-template-columns string. Default 2. */
  columns?: number | string;
  gap?: number;
}

/** Responsive-friendly CSS grid. */
export const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid(
  { columns = 2, gap = 3, style, ...rest },
  ref,
) {
  const t = useTheme();
  return (
    <div
      ref={ref}
      style={{
        display: 'grid',
        gridTemplateColumns:
          typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns,
        gap: t.space(gap),
        ...style,
      }}
      {...rest}
    />
  );
});

/** Centers its children both axes. */
export const Center = forwardRef<HTMLDivElement, DivProps>(function Center(
  { style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}
      {...rest}
    />
  );
});

export interface ContainerProps extends DivProps {
  /** Max content width in px. Default 1100. */
  maxWidth?: number;
  padded?: boolean;
}

/** Centered, width-capped page container. */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container(
  { maxWidth = 1100, padded = true, style, ...rest },
  ref,
) {
  const t = useTheme();
  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        maxWidth,
        marginInline: 'auto',
        paddingInline: padded ? t.space(4) : undefined,
        ...style,
      }}
      {...rest}
    />
  );
});

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
  /** Optional centered label (horizontal only). */
  label?: string;
}

/** A thin separating rule, optionally labeled. */
export function Divider({ orientation = 'horizontal', label, style, ...rest }: DividerProps) {
  const t = useTheme();
  if (orientation === 'vertical') {
    return (
      <hr
        style={{
          alignSelf: 'stretch',
          width: 1,
          height: 'auto',
          border: 0,
          background: t.colors.border,
          margin: 0,
          ...style,
        }}
        {...rest}
      />
    );
  }
  if (label) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: t.space(2),
          color: t.colors.textMuted,
          fontSize: t.fontSizes.sm,
          ...style,
        }}
      >
        <span style={{ flex: 1, height: 1, background: t.colors.border }} />
        {label}
        <span style={{ flex: 1, height: 1, background: t.colors.border }} />
      </div>
    );
  }
  return (
    <hr
      style={{ border: 0, height: 1, background: t.colors.border, margin: 0, ...style }}
      {...rest}
    />
  );
}

export interface SpacerProps {
  /** Size in 4px units. */
  size?: number;
}

/** Flexible empty space. With `size`, a fixed block; without, grows to fill flex space. */
export function Spacer({ size }: SpacerProps) {
  const t = useTheme();
  return (
    <div style={size == null ? { flex: 1 } : { width: t.space(size), height: t.space(size) }} />
  );
}
