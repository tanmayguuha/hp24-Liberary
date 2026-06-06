import type { HTMLAttributes, ReactNode } from 'react';
import { type Intent, useTheme } from './theme.js';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  intent?: Intent;
  variant?: 'solid' | 'soft' | 'outline';
  /** Small leading status dot. */
  dot?: boolean;
  pill?: boolean;
}

/** A compact status label. */
export function Badge({
  intent = 'neutral',
  variant = 'soft',
  dot = false,
  pill = false,
  style,
  children,
  ...rest
}: BadgeProps) {
  const t = useTheme();
  const c = t.colors.intent[intent];
  const skin =
    variant === 'solid'
      ? { background: c.solid, color: c.onSolid, border: `1px solid ${c.solid}` }
      : variant === 'outline'
        ? { background: 'transparent', color: c.text, border: `1px solid ${c.solid}66` }
        : { background: c.soft, color: c.text, border: '1px solid transparent' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: t.fontFamily,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1,
        padding: '4px 8px',
        borderRadius: pill ? t.radii.pill : t.radii.sm,
        whiteSpace: 'nowrap',
        ...skin,
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: variant === 'solid' ? c.onSolid : c.solid,
          }}
        />
      )}
      {children}
    </span>
  );
}

export interface TagProps extends BadgeProps {
  /** Show a remove (×) button and call this when clicked. */
  onRemove?: () => void;
}

/** A Badge that can be removed — handy for filters and multi-selects. */
export function Tag({ onRemove, children, ...rest }: TagProps) {
  const t = useTheme();
  return (
    <Badge pill {...rest}>
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          style={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            padding: 0,
            color: 'inherit',
            fontSize: 13,
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          ✕
        </button>
      )}
    </Badge>
  );
}

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  /** Used for the alt text and to derive initials when there's no image. */
  name?: string;
  size?: number;
  /** Override the auto-derived initials. */
  initials?: ReactNode;
}

/** A user avatar — shows the image, or colored initials as a fallback. */
export function Avatar({ src, name, size = 40, initials, style, ...rest }: AvatarProps) {
  const t = useTheme();
  const derived = initials ?? (name ? initialsOf(name) : '?');
  const bg = t.colors.intent[colorForName(name ?? '')].soft;
  const fg = t.colors.intent[colorForName(name ?? '')].text;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: fg,
        fontFamily: t.fontFamily,
        fontWeight: 600,
        fontSize: size * 0.4,
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    >
      {src ? (
        <img
          src={src}
          alt={name ?? ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span aria-hidden>{derived}</span>
      )}
    </div>
  );
}

/** Overlapping cluster of avatars with an optional “+N” overflow chip. */
export function AvatarGroup({
  max = 4,
  size = 36,
  children,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { max?: number; size?: number }) {
  const t = useTheme();
  const items = Array.isArray(children) ? children : [children];
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', ...style }} {...rest}>
      {shown.map((child, i) => (
        <div
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.3,
            borderRadius: '50%',
            border: `2px solid ${t.colors.surface}`,
          }}
        >
          {child}
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -size * 0.3,
            width: size,
            height: size,
            borderRadius: '50%',
            border: `2px solid ${t.colors.surface}`,
            background: t.colors.intent.neutral.soft,
            color: t.colors.intent.neutral.text,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.36,
            fontWeight: 600,
            fontFamily: t.fontFamily,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

const NAME_COLORS: Intent[] = ['primary', 'success', 'warning', 'danger', 'info', 'secondary'];
function colorForName(name: string): Intent {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return NAME_COLORS[hash % NAME_COLORS.length] ?? 'primary';
}
