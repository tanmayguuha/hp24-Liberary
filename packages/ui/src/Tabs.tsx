import { type ReactNode, useState } from 'react';
import { useTheme } from './theme.js';

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  /** Controlled active tab id. */
  value?: string;
  /** Uncontrolled initial tab id. Defaults to the first tab. */
  defaultValue?: string;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pill';
  style?: React.CSSProperties;
}

/** Tabbed panels rendered from an items array. Controlled or uncontrolled. */
export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = 'underline',
  style,
}: TabsProps) {
  const t = useTheme();
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id ?? '');
  const active = value ?? internal;
  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };
  const activeItem = items.find((i) => i.id === active);

  return (
    <div style={style}>
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: variant === 'pill' ? t.space(1) : t.space(4),
          borderBottom: variant === 'underline' ? `1px solid ${t.colors.border}` : undefined,
          background: variant === 'pill' ? t.colors.intent.neutral.soft : undefined,
          padding: variant === 'pill' ? 4 : undefined,
          borderRadius: variant === 'pill' ? t.radii.md : undefined,
        }}
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={item.disabled}
              onClick={() => select(item.id)}
              style={{
                appearance: 'none',
                border: 0,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                fontFamily: t.fontFamily,
                fontSize: t.fontSizes.md,
                fontWeight: 600,
                color: isActive
                  ? variant === 'pill'
                    ? t.colors.text
                    : t.colors.intent.primary.text
                  : t.colors.textMuted,
                opacity: item.disabled ? 0.5 : 1,
                padding: variant === 'pill' ? '7px 14px' : '10px 2px',
                background: variant === 'pill' && isActive ? t.colors.surface : 'transparent',
                borderRadius: variant === 'pill' ? t.radii.sm : 0,
                boxShadow: variant === 'pill' && isActive ? t.shadows.sm : undefined,
                borderBottom:
                  variant === 'underline'
                    ? `2px solid ${isActive ? t.colors.intent.primary.solid : 'transparent'}`
                    : undefined,
                marginBottom: variant === 'underline' ? -1 : 0,
                transition: 'color 120ms',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" style={{ paddingTop: t.space(4) }}>
        {activeItem?.content}
      </div>
    </div>
  );
}
