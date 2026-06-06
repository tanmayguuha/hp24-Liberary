import { type ButtonHTMLAttributes, type ReactNode, forwardRef, useState } from 'react';
import { Spinner } from './feedback.js';
import { type Intent, type Size, useTheme } from './theme.js';

export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  intent?: Intent;
  variant?: ButtonVariant;
  size?: Size;
  /** Show a spinner and block clicks. */
  loading?: boolean;
  /** Stretch to the full width of the container. */
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const PAD: Record<Size, string> = { sm: '6px 12px', md: '9px 16px', lg: '12px 22px' };

/** The primary action component: variants, intents, sizes, loading and icons. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    intent = 'primary',
    variant = 'solid',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    disabled,
    style,
    children,
    onMouseEnter,
    onMouseLeave,
    ...rest
  },
  ref,
) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const c = t.colors.intent[intent];
  const isDisabled = disabled || loading;

  const base = {
    solid: { background: c.solid, color: c.onSolid, border: `1px solid ${c.solid}` },
    soft: { background: c.soft, color: c.text, border: `1px solid ${c.soft}` },
    outline: { background: 'transparent', color: c.text, border: `1px solid ${t.colors.border}` },
    ghost: { background: 'transparent', color: c.text, border: '1px solid transparent' },
    link: {
      background: 'transparent',
      color: c.solid,
      border: '1px solid transparent',
      padding: 0,
    },
  }[variant];

  const hoverStyle =
    hover && !isDisabled
      ? variant === 'solid'
        ? { filter: 'brightness(0.93)' }
        : variant === 'link'
          ? { textDecoration: 'underline' }
          : { background: c.soft, borderColor: c.soft }
      : null;

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onMouseEnter={(e) => {
        setHover(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHover(false);
        onMouseLeave?.(e);
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space(2),
        fontFamily: t.fontFamily,
        fontSize: t.fontSizes[size],
        fontWeight: 600,
        lineHeight: 1,
        padding: variant === 'link' ? 0 : PAD[size],
        borderRadius: t.radii.md,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        width: fullWidth ? '100%' : undefined,
        transition: 'filter 120ms, background 120ms, border-color 120ms',
        ...base,
        ...hoverStyle,
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 'md' : 'sm'} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export interface IconButtonProps extends ButtonProps {
  /** Accessible label — required since there is no visible text. */
  'aria-label': string;
}

/** A square, icon-only button. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 'md', style, ...rest },
  ref,
) {
  const dim = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  return (
    <Button
      ref={ref}
      size={size}
      style={{ width: dim, height: dim, padding: 0, ...style }}
      {...rest}
    />
  );
});

/** Groups buttons into a single attached segment. */
export function ButtonGroup({ children, style, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 0, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
