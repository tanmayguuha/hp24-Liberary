import type { HTMLAttributes, ReactNode } from 'react';
import { type Intent, useTheme } from './theme.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Elevation. `flat` = border only, `sm`/`md`/`lg` = shadow. */
  elevation?: 'flat' | 'sm' | 'md' | 'lg';
  padded?: boolean;
  interactive?: boolean;
}

/** A surface container for grouping related content. */
export function Card({
  elevation = 'sm',
  padded = true,
  interactive = false,
  style,
  children,
  ...rest
}: CardProps) {
  const t = useTheme();
  return (
    <div
      style={{
        background: t.colors.surface,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radii.lg,
        boxShadow: elevation === 'flat' ? 'none' : t.shadows[elevation],
        padding: padded ? t.space(4) : 0,
        cursor: interactive ? 'pointer' : undefined,
        transition: interactive ? 'box-shadow 140ms, transform 140ms' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  const t = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: t.space(3),
        marginBottom: t.space(3),
        ...style,
      }}
      {...rest}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontWeight: 700, fontSize: t.fontSizes.lg, color: t.colors.text }}>
            {title}
          </div>
        )}
        {subtitle && (
          <div style={{ color: t.colors.textMuted, fontSize: t.fontSizes.sm, marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardFooter({ style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const t = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: t.space(2),
        marginTop: t.space(3),
        paddingTop: t.space(3),
        borderTop: `1px solid ${t.colors.border}`,
        ...style,
      }}
      {...rest}
    />
  );
}

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  /** A delta indicator, e.g. "+12.5%". */
  change?: ReactNode;
  /** Direction colors the change. */
  trend?: 'up' | 'down' | 'flat';
  icon?: ReactNode;
}

/** A KPI / metric tile — label, big value, and an optional trend. */
export function Stat({ label, value, change, trend = 'flat', icon, style, ...rest }: StatProps) {
  const t = useTheme();
  const trendIntent: Intent = trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'neutral';
  const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '→';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space(1),
        background: t.colors.surface,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radii.lg,
        padding: t.space(4),
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: t.colors.textMuted, fontSize: t.fontSizes.sm, fontWeight: 500 }}>
          {label}
        </span>
        {icon && <span style={{ color: t.colors.textMuted }}>{icon}</span>}
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, color: t.colors.text, lineHeight: 1.1 }}>
        {value}
      </span>
      {change != null && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: t.fontSizes.sm,
            fontWeight: 600,
            color: t.colors.intent[trendIntent].text,
          }}
        >
          <span aria-hidden>{arrow}</span>
          {change}
        </span>
      )}
    </div>
  );
}

export interface ListItem {
  id?: string | number;
  primary: ReactNode;
  secondary?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}

export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  items: ListItem[];
  /** Divider between rows. Default true. */
  divided?: boolean;
}

/** A vertical list rendered from an array of items. */
export function List({ items, divided = true, style, ...rest }: ListProps) {
  const t = useTheme();
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, ...style }} {...rest}>
      {items.map((item, i) => {
        const clickable = !!item.onClick;
        return (
          <li
            key={item.id ?? i}
            onClick={item.onClick}
            onKeyDown={
              clickable
                ? (e) => (e.key === 'Enter' || e.key === ' ') && item.onClick?.()
                : undefined
            }
            tabIndex={clickable ? 0 : undefined}
            role={clickable ? 'button' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: t.space(3),
              padding: t.space(3),
              borderTop: divided && i > 0 ? `1px solid ${t.colors.border}` : undefined,
              cursor: clickable ? 'pointer' : undefined,
              fontFamily: t.fontFamily,
            }}
          >
            {item.leading}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: t.colors.text, fontSize: t.fontSizes.md }}>{item.primary}</div>
              {item.secondary != null && (
                <div style={{ color: t.colors.textMuted, fontSize: t.fontSizes.sm, marginTop: 1 }}>
                  {item.secondary}
                </div>
              )}
            </div>
            {item.trailing}
          </li>
        );
      })}
    </ul>
  );
}
