import {
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useState,
} from 'react';
import { type Size, useTheme } from './theme.js';

const FIELD_PAD: Record<Size, string> = { sm: '6px 10px', md: '9px 12px', lg: '12px 14px' };

function useFieldStyle(size: Size, invalid: boolean, focused: boolean) {
  const t = useTheme();
  return {
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: t.fontFamily,
    fontSize: t.fontSizes[size],
    color: t.colors.text,
    background: t.colors.surface,
    padding: FIELD_PAD[size],
    border: `1px solid ${invalid ? t.colors.intent.danger.solid : focused ? t.colors.intent.primary.solid : t.colors.border}`,
    borderRadius: t.radii.md,
    outline: 'none',
    boxShadow: focused
      ? `0 0 0 3px ${invalid ? `${t.colors.intent.danger.solid}33` : t.colors.focusRing}`
      : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
  };
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: Size;
  invalid?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** A text input with focus ring, validation state, and optional icons. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', invalid = false, leftIcon, rightIcon, style, onFocus, onBlur, ...rest },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const field = useFieldStyle(size, invalid, focused);

  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={{
        ...field,
        ...(leftIcon ? { paddingLeft: 36 } : null),
        ...(rightIcon ? { paddingRight: 36 } : null),
        ...style,
      }}
      {...rest}
    />
  );

  if (!leftIcon && !rightIcon) return input;
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {leftIcon && (
        <span
          style={{
            position: 'absolute',
            left: 12,
            color: t.colors.textMuted,
            pointerEvents: 'none',
          }}
        >
          {leftIcon}
        </span>
      )}
      {input}
      {rightIcon && (
        <span style={{ position: 'absolute', right: 12, color: t.colors.textMuted }}>
          {rightIcon}
        </span>
      )}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** A multi-line text input. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, style, onFocus, onBlur, rows = 4, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const field = useFieldStyle('md', invalid, focused);
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={{ ...field, resize: 'vertical', ...style }}
      {...rest}
    />
  );
});

export interface SelectOption {
  label: ReactNode;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: Size;
  invalid?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

/** A native select rendered from an options array. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', invalid = false, options, placeholder, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const field = useFieldStyle(size, invalid, focused);
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={{ ...field, appearance: 'none', cursor: 'pointer', ...style }}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
});

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
}

/** A checkbox with an optional inline label. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, style, disabled, ...rest },
  ref,
) {
  const t = useTheme();
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space(2),
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: t.fontFamily,
        fontSize: t.fontSizes.md,
        color: t.colors.text,
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        style={{
          width: 16,
          height: 16,
          accentColor: t.colors.intent.primary.solid,
          cursor: 'inherit',
        }}
        {...rest}
      />
      {label}
    </label>
  );
});

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
}

/** A radio button with an optional inline label. */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, style, disabled, ...rest },
  ref,
) {
  const t = useTheme();
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space(2),
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: t.fontFamily,
        fontSize: t.fontSizes.md,
        color: t.colors.text,
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      <input
        ref={ref}
        type="radio"
        disabled={disabled}
        style={{
          width: 16,
          height: 16,
          accentColor: t.colors.intent.primary.solid,
          cursor: 'inherit',
        }}
        {...rest}
      />
      {label}
    </label>
  );
});

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
}

/** A toggle switch (styled checkbox). Controlled via `checked`/`onChange`. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, checked, defaultChecked, style, disabled, onChange, ...rest },
  ref,
) {
  const t = useTheme();
  const [internal, setInternal] = useState(!!defaultChecked);
  const isOn = checked ?? internal;
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space(2),
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: t.fontFamily,
        fontSize: t.fontSizes.md,
        color: t.colors.text,
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        aria-checked={isOn}
        checked={isOn}
        disabled={disabled}
        onChange={(e) => {
          if (checked === undefined) setInternal(e.target.checked);
          onChange?.(e);
        }}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        {...rest}
      />
      <span
        aria-hidden
        style={{
          width: 38,
          height: 22,
          borderRadius: t.radii.pill,
          background: isOn ? t.colors.intent.primary.solid : t.colors.border,
          position: 'relative',
          transition: 'background 140ms',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: isOn ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: t.shadows.sm,
            transition: 'left 140ms',
          }}
        />
      </span>
      {label}
    </label>
  );
});

export interface FormFieldProps {
  label?: ReactNode;
  /** Marks the field required (adds an asterisk). */
  required?: boolean;
  hint?: ReactNode;
  /** Error message — when set, switches the field to its invalid style. */
  error?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}

/**
 * Wraps a control with a label, hint, and error message — wired together with
 * proper `htmlFor`/`aria-describedby` ids.
 *
 * ```tsx
 * <FormField label="Email" error={errors.email}>
 *   <Input type="email" />
 * </FormField>
 * ```
 */
export function FormField({ label, required, hint, error, children, style }: FormFieldProps) {
  const t = useTheme();
  const id = useId();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: t.fontFamily,
        ...style,
      }}
    >
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: t.fontSizes.sm, fontWeight: 600, color: t.colors.text }}
        >
          {label}
          {required && (
            <span style={{ color: t.colors.intent.danger.solid, marginLeft: 4 }}>*</span>
          )}
        </label>
      )}
      <SlotWithId id={id} invalid={!!error}>
        {children}
      </SlotWithId>
      {error ? (
        <span style={{ fontSize: t.fontSizes.sm, color: t.colors.intent.danger.text }}>
          {error}
        </span>
      ) : hint ? (
        <span style={{ fontSize: t.fontSizes.sm, color: t.colors.textMuted }}>{hint}</span>
      ) : null}
    </div>
  );
}

/** Clones the single child control to inject `id` and `invalid` props. */
function SlotWithId({
  id,
  invalid,
  children,
}: { id: string; invalid: boolean; children: ReactNode }) {
  if (isValidElement(children)) {
    const child = children as ReactElement<{ id?: string; invalid?: boolean }>;
    return cloneElement(child, {
      id: child.props.id ?? id,
      invalid: child.props.invalid ?? invalid,
    });
  }
  return <>{children}</>;
}
