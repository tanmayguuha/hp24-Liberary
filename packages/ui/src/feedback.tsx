import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { type Intent, type Size, useTheme } from './theme.js';

const SPIN_KEYFRAMES = '@keyframes hp24-spin{to{transform:rotate(360deg)}}';
const PULSE_KEYFRAMES = '@keyframes hp24-pulse{0%,100%{opacity:1}50%{opacity:0.45}}';

/** Injects a small keyframes stylesheet once (SSR-safe: no-ops on the server). */
function useKeyframes(css: string, id: string) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}

const SPIN_DIM: Record<Size, number> = { sm: 16, md: 22, lg: 30 };

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: Size;
  /** Stroke color. Defaults to currentColor so it inherits from the parent. */
  color?: string;
}

/** An indeterminate loading spinner. */
export function Spinner({ size = 'md', color = 'currentColor', style, ...rest }: SpinnerProps) {
  useKeyframes(SPIN_KEYFRAMES, 'hp24-spin-kf');
  const dim = SPIN_DIM[size];
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: dim,
        height: dim,
        border: `${Math.max(2, dim / 8)}px solid ${color}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'hp24-spin 0.6s linear infinite',
        ...style,
      }}
      {...rest}
    />
  );
}

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–100. Omit for an indeterminate bar. */
  value?: number;
  intent?: Intent;
  size?: Size;
}

/** A determinate or indeterminate progress bar. */
export function Progress({
  value,
  intent = 'primary',
  size = 'md',
  style,
  ...rest
}: ProgressProps) {
  const t = useTheme();
  useKeyframes('@keyframes hp24-indet{0%{left:-40%}100%{left:100%}}', 'hp24-indet-kf');
  const height = size === 'sm' ? 6 : size === 'lg' ? 12 : 9;
  const pct = value == null ? undefined : Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'relative',
        width: '100%',
        height,
        background: t.colors.intent.neutral.soft,
        borderRadius: t.radii.pill,
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      <div
        style={
          pct == null
            ? {
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '40%',
                background: t.colors.intent[intent].solid,
                borderRadius: t.radii.pill,
                animation: 'hp24-indet 1.1s ease-in-out infinite',
              }
            : {
                height: '100%',
                width: `${pct}%`,
                background: t.colors.intent[intent].solid,
                borderRadius: t.radii.pill,
                transition: 'width 240ms ease',
              }
        }
      />
    </div>
  );
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  /** Render a circle (e.g. avatar placeholder). */
  circle?: boolean;
}

/** A shimmering placeholder for content that is still loading. */
export function Skeleton({ width = '100%', height = 16, circle, style, ...rest }: SkeletonProps) {
  const t = useTheme();
  useKeyframes(PULSE_KEYFRAMES, 'hp24-pulse-kf');
  return (
    <div
      aria-hidden
      style={{
        width: circle ? (height as number) : width,
        height,
        background: t.colors.intent.neutral.soft,
        borderRadius: circle ? '50%' : t.radii.sm,
        animation: 'hp24-pulse 1.4s ease-in-out infinite',
        ...style,
      }}
      {...rest}
    />
  );
}

const ALERT_ICON: Record<Intent, string> = {
  primary: 'ℹ',
  secondary: 'ℹ',
  neutral: 'ℹ',
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  danger: '✕',
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  intent?: Intent;
  title?: ReactNode;
  /** Called when the dismiss button is clicked. Omit to hide the button. */
  onClose?: () => void;
  icon?: ReactNode | false;
}

/** A contextual message banner (info / success / warning / danger). */
export function Alert({
  intent = 'info',
  title,
  onClose,
  icon,
  children,
  style,
  ...rest
}: AlertProps) {
  const t = useTheme();
  const c = t.colors.intent[intent];
  const showIcon = icon !== false;
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        gap: t.space(3),
        padding: t.space(3),
        background: c.soft,
        border: `1px solid ${c.solid}33`,
        borderRadius: t.radii.md,
        color: t.colors.text,
        fontFamily: t.fontFamily,
        fontSize: t.fontSizes.md,
        ...style,
      }}
      {...rest}
    >
      {showIcon && (
        <span aria-hidden style={{ color: c.solid, fontWeight: 700, lineHeight: 1.5 }}>
          {icon ?? ALERT_ICON[intent]}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: children ? 2 : 0 }}>{title}</div>}
        {children && (
          <div style={{ color: t.colors.textMuted, fontSize: t.fontSizes.sm }}>{children}</div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          style={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            color: t.colors.textMuted,
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Optional call-to-action node (e.g. a Button). */
  action?: ReactNode;
}

/** Placeholder shown when there's no data to display. */
export function EmptyState({ title, description, icon, action, style, ...rest }: EmptyStateProps) {
  const t = useTheme();
  const center: CSSProperties = { textAlign: 'center', alignItems: 'center' };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space(2),
        padding: t.space(8),
        ...center,
        ...style,
      }}
      {...rest}
    >
      {icon && <div style={{ fontSize: 36, opacity: 0.7 }}>{icon}</div>}
      <div style={{ fontWeight: 600, fontSize: t.fontSizes.lg, color: t.colors.text }}>{title}</div>
      {description && (
        <div style={{ color: t.colors.textMuted, fontSize: t.fontSizes.md, maxWidth: 420 }}>
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: t.space(2) }}>{action}</div>}
    </div>
  );
}
