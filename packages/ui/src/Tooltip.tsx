import { type ReactNode, useId, useState } from 'react';
import { useTheme } from './theme.js';

export interface TooltipProps {
  /** Tooltip text/content. */
  label: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

/** Wraps an element and shows a tooltip on hover/focus. */
export function Tooltip({ label, placement = 'top', children }: TooltipProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const id = useId();

  const pos: React.CSSProperties =
    placement === 'top'
      ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }
      : placement === 'bottom'
        ? { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 }
        : placement === 'left'
          ? { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 }
          : { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 };

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          id={id}
          style={{
            position: 'absolute',
            ...pos,
            zIndex: 1100,
            background: '#0f172a',
            color: '#fff',
            fontFamily: t.fontFamily,
            fontSize: 12,
            lineHeight: 1.4,
            padding: '6px 9px',
            borderRadius: t.radii.sm,
            whiteSpace: 'nowrap',
            boxShadow: t.shadows.md,
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
