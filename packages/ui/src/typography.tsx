import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { type Intent, useTheme } from './theme.js';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div' | 'label' | 'small';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Use a muted color, or a semantic intent color. */
  tone?: 'default' | 'muted' | Intent;
  align?: CSSProperties['textAlign'];
  truncate?: boolean;
  children?: ReactNode;
}

const TEXT_SIZE = { xs: 12, sm: 13, md: 15, lg: 18 } as const;
const WEIGHT = { normal: 400, medium: 500, semibold: 600, bold: 700 } as const;

/** Body text with size/weight/tone props. */
export function Text({
  as = 'p',
  size = 'md',
  weight = 'normal',
  tone = 'default',
  align,
  truncate,
  style,
  ...rest
}: TextProps) {
  const t = useTheme();
  const color =
    tone === 'default'
      ? t.colors.text
      : tone === 'muted'
        ? t.colors.textMuted
        : t.colors.intent[tone].text;
  const Tag = as;
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily: t.fontFamily,
        fontSize: TEXT_SIZE[size],
        fontWeight: WEIGHT[weight],
        color,
        textAlign: align,
        lineHeight: 1.5,
        ...(truncate
          ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
          : null),
        ...style,
      }}
      {...rest}
    />
  );
}

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}

const HEADING_SIZE = { 1: 32, 2: 26, 3: 21, 4: 18, 5: 16, 6: 14 } as const;

/** Section heading h1–h6 with a sensible type scale. */
export function Heading({ level = 2, style, ...rest }: HeadingProps) {
  const t = useTheme();
  const Tag = `h${level}` as const;
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily: t.fontFamily,
        fontSize: HEADING_SIZE[level],
        fontWeight: 700,
        lineHeight: 1.25,
        color: t.colors.text,
        ...style,
      }}
      {...rest}
    />
  );
}

/** Inline monospace code. */
export function Code({ style, ...rest }: HTMLAttributes<HTMLElement>) {
  const t = useTheme();
  return (
    <code
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '0.875em',
        background: t.colors.intent.neutral.soft,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radii.sm,
        padding: '1px 6px',
        color: t.colors.text,
        ...style,
      }}
      {...rest}
    />
  );
}
