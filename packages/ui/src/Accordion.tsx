import { type ReactNode, useState } from 'react';
import { useTheme } from './theme.js';

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Allow multiple panels open at once. Default false. */
  multiple?: boolean;
  /** Initially open panel id(s). */
  defaultOpen?: string | string[];
  style?: React.CSSProperties;
}

/** Collapsible panels rendered from an items array. */
export function Accordion({ items, multiple = false, defaultOpen, style }: AccordionProps) {
  const t = useTheme();
  const [open, setOpen] = useState<Set<string>>(
    () =>
      new Set(defaultOpen == null ? [] : Array.isArray(defaultOpen) ? defaultOpen : [defaultOpen]),
  );

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div
      style={{
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radii.lg,
        overflow: 'hidden',
        ...style,
      }}
    >
      {items.map((item, i) => {
        const isOpen = open.has(item.id);
        return (
          <div
            key={item.id}
            style={{ borderTop: i > 0 ? `1px solid ${t.colors.border}` : undefined }}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              disabled={item.disabled}
              onClick={() => toggle(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: t.space(2),
                padding: t.space(3),
                background: t.colors.surface,
                border: 0,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                fontFamily: t.fontFamily,
                fontSize: t.fontSizes.md,
                fontWeight: 600,
                color: t.colors.text,
                textAlign: 'left',
                opacity: item.disabled ? 0.5 : 1,
              }}
            >
              {item.title}
              <span
                aria-hidden
                style={{
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 140ms',
                  color: t.colors.textMuted,
                }}
              >
                ▶
              </span>
            </button>
            {isOpen && (
              <div
                style={{
                  padding: `0 ${t.space(3)}px ${t.space(3)}px`,
                  color: t.colors.textMuted,
                  fontFamily: t.fontFamily,
                  fontSize: t.fontSizes.md,
                }}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
