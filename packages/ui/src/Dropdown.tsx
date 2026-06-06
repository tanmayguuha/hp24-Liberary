import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { type Size, useTheme } from './theme.js';

export interface DropdownOption {
  label: ReactNode;
  value: string | number;
  disabled?: boolean;
  /** Optional plain-text used for search when `label` is a node. */
  keywords?: string;
}

type SingleValue = string | number | null;
type MultiValue = Array<string | number>;

interface DropdownBaseProps {
  options: DropdownOption[];
  placeholder?: string;
  size?: Size;
  invalid?: boolean;
  disabled?: boolean;
  /** Show a text box to filter options. */
  searchable?: boolean;
  /** Show a clear (✕) button to reset the selection. Default true. */
  clearable?: boolean;
  /** Message shown when the search filters out every option. */
  emptyMessage?: ReactNode;
  /** Injected by `FormField`. */
  id?: string;
  style?: React.CSSProperties;
  /** Max height of the open menu in px. Default 260. */
  maxMenuHeight?: number;
}

export interface DropdownSingleProps extends DropdownBaseProps {
  multiple?: false;
  value?: SingleValue;
  defaultValue?: SingleValue;
  onChange?: (value: SingleValue) => void;
}

export interface DropdownMultiProps extends DropdownBaseProps {
  multiple: true;
  value?: MultiValue;
  defaultValue?: MultiValue;
  onChange?: (value: MultiValue) => void;
}

export type DropdownProps = DropdownSingleProps | DropdownMultiProps;

const CONTROL_PAD: Record<Size, string> = {
  sm: '6px 10px',
  md: '9px 12px',
  lg: '12px 14px',
};

function optionText(o: DropdownOption): string {
  if (o.keywords) return o.keywords;
  return typeof o.label === 'string' || typeof o.label === 'number' ? String(o.label) : '';
}

/**
 * A single- or multi-select dropdown with search, keyboard navigation, and
 * full theming. Controlled or uncontrolled. Pass `multiple` to switch modes.
 *
 * ```tsx
 * // Single select
 * <Dropdown
 *   options={[{ label: 'Red', value: 'r' }, { label: 'Blue', value: 'b' }]}
 *   placeholder="Pick a color"
 *   onChange={(v) => console.log(v)}
 * />
 *
 * // Multi select with search
 * <Dropdown
 *   multiple
 *   searchable
 *   options={countries}
 *   defaultValue={['us']}
 *   onChange={(values) => console.log(values)}
 * />
 * ```
 */
export function Dropdown(props: DropdownProps) {
  const {
    options,
    placeholder = 'Select…',
    size = 'md',
    invalid = false,
    disabled = false,
    searchable = false,
    clearable = true,
    emptyMessage = 'No options',
    id,
    style,
    maxMenuHeight = 260,
    multiple = false,
  } = props;

  const t = useTheme();
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  // Normalize selection into an array internally; track uncontrolled state.
  const isControlled = props.value !== undefined;
  const [internal, setInternal] = useState<MultiValue>(() => normalize(props.defaultValue));
  const selected = isControlled ? normalize(props.value) : internal;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => optionText(o).toLowerCase().includes(q));
  }, [options, query, searchable]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Focus the search field when the menu opens; reset transient state on close.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on open/close, not on every filter change
  useEffect(() => {
    if (open) {
      if (searchable) searchRef.current?.focus();
      const first = filtered.findIndex((o) => !o.disabled);
      setActiveIndex(first);
    } else {
      setQuery('');
      setActiveIndex(-1);
    }
  }, [open]);

  const emit = (next: MultiValue) => {
    if (!isControlled) setInternal(next);
    if (multiple) {
      (props as DropdownMultiProps).onChange?.(next);
    } else {
      (props as DropdownSingleProps).onChange?.(next.length ? (next[0] as string | number) : null);
    }
  };

  const toggleValue = (value: string | number) => {
    if (multiple) {
      emit(selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      emit([value]);
      setOpen(false);
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    emit([]);
  };

  const moveActive = (dir: 1 | -1) => {
    if (filtered.length === 0) return;
    let next = activeIndex;
    for (let i = 0; i < filtered.length; i++) {
      next = (next + dir + filtered.length) % filtered.length;
      if (!filtered[next]?.disabled) break;
    }
    setActiveIndex(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) setOpen(true);
        else moveActive(-1);
        break;
      case 'Enter':
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else if (activeIndex >= 0 && filtered[activeIndex] && !filtered[activeIndex].disabled) {
          toggleValue(filtered[activeIndex].value);
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case ' ':
        if (!searchable) {
          e.preventDefault();
          setOpen((o) => !o);
        }
        break;
      case 'Tab':
        if (open) setOpen(false);
        break;
    }
  };

  const selectedOptions = options.filter((o) => selectedSet.has(o.value));
  const borderColor = invalid
    ? t.colors.intent.danger.solid
    : focused || open
      ? t.colors.intent.primary.solid
      : t.colors.border;

  return (
    <div ref={rootRef} style={{ position: 'relative', fontFamily: t.fontFamily, ...style }}>
      {/* Control — ARIA combobox wrapping custom (chip/placeholder) content. */}
      <div
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: t.space(2),
          width: '100%',
          boxSizing: 'border-box',
          minHeight: size === 'sm' ? 32 : size === 'lg' ? 46 : 39,
          padding: CONTROL_PAD[size],
          fontSize: t.fontSizes[size],
          color: t.colors.text,
          background: disabled ? t.colors.intent.neutral.soft : t.colors.surface,
          border: `1px solid ${borderColor}`,
          borderRadius: t.radii.md,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
          outline: 'none',
          boxShadow:
            focused || open
              ? `0 0 0 3px ${invalid ? `${t.colors.intent.danger.solid}33` : t.colors.focusRing}`
              : 'none',
          transition: 'border-color 120ms, box-shadow 120ms',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
          {selectedOptions.length === 0 ? (
            <span style={{ color: t.colors.textMuted }}>{placeholder}</span>
          ) : multiple ? (
            selectedOptions.map((o) => (
              <span
                key={o.value}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 6px',
                  fontSize: t.fontSizes.sm,
                  background: t.colors.intent.primary.soft,
                  color: t.colors.intent.primary.text,
                  borderRadius: t.radii.sm,
                }}
              >
                {o.label}
                <button
                  type="button"
                  aria-label={`Remove ${optionText(o) || 'option'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleValue(o.value);
                  }}
                  style={{
                    appearance: 'none',
                    border: 0,
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'inherit',
                    lineHeight: 1,
                    fontSize: 13,
                  }}
                >
                  ✕
                </button>
              </span>
            ))
          ) : (
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedOptions[0]?.label}
            </span>
          )}
        </div>

        {clearable && selectedOptions.length > 0 && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={clear}
            style={{
              appearance: 'none',
              border: 0,
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              color: t.colors.textMuted,
              lineHeight: 0,
              display: 'inline-flex',
            }}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        <svg
          aria-hidden="true"
          focusable="false"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            color: t.colors.textMuted,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: t.colors.surface,
            border: `1px solid ${t.colors.border}`,
            borderRadius: t.radii.md,
            boxShadow: t.shadows.md,
            overflow: 'hidden',
          }}
        >
          {searchable && (
            <div style={{ padding: 8, borderBottom: `1px solid ${t.colors.border}` }}>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search…"
                aria-label="Search options"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '6px 8px',
                  fontSize: t.fontSizes.sm,
                  fontFamily: t.fontFamily,
                  color: t.colors.text,
                  background: t.colors.bg,
                  border: `1px solid ${t.colors.border}`,
                  borderRadius: t.radii.sm,
                  outline: 'none',
                }}
              />
            </div>
          )}
          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            tabIndex={-1}
            style={{
              padding: 4,
              maxHeight: maxMenuHeight,
              overflowY: 'auto',
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '8px 10px',
                  color: t.colors.textMuted,
                  fontSize: t.fontSizes.sm,
                }}
              >
                {emptyMessage}
              </div>
            ) : (
              filtered.map((o, i) => {
                const isSelected = selectedSet.has(o.value);
                const isActive = i === activeIndex;
                return (
                  <div
                    key={o.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={o.disabled || undefined}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => !o.disabled && toggleValue(o.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: t.space(2),
                      padding: '8px 10px',
                      fontSize: t.fontSizes[size],
                      color: o.disabled ? t.colors.textMuted : t.colors.text,
                      borderRadius: t.radii.sm,
                      cursor: o.disabled ? 'not-allowed' : 'pointer',
                      opacity: o.disabled ? 0.6 : 1,
                      background: isActive ? t.colors.intent.primary.soft : 'transparent',
                    }}
                  >
                    {multiple && (
                      <span
                        aria-hidden
                        style={{
                          width: 16,
                          height: 16,
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          color: t.colors.intent.primary.onSolid,
                          border: `1px solid ${isSelected ? t.colors.intent.primary.solid : t.colors.border}`,
                          background: isSelected ? t.colors.intent.primary.solid : 'transparent',
                          borderRadius: 4,
                        }}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                    )}
                    <span style={{ flex: 1 }}>{o.label}</span>
                    {!multiple && isSelected && (
                      <span aria-hidden style={{ color: t.colors.intent.primary.solid }}>
                        ✓
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Coerce any accepted value shape (single / array / null / undefined) to an array. */
function normalize(value: SingleValue | MultiValue | undefined): MultiValue {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}
