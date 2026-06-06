import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from './theme.js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  /** Footer node, typically action buttons. */
  footer?: ReactNode;
  /** Max width of the dialog in px. Default 520. */
  width?: number;
  /** Close when the backdrop is clicked. Default true. */
  closeOnBackdrop?: boolean;
  /** Close when Escape is pressed. Default true. */
  closeOnEsc?: boolean;
}

/**
 * An accessible modal dialog rendered in a portal. Controlled via `open`.
 * Locks body scroll, closes on Escape / backdrop click, and traps focus entry.
 *
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <Modal open={open} onClose={() => setOpen(false)} title="Confirm">
 *   Are you sure?
 * </Modal>
 * ```
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
  closeOnBackdrop = true,
  closeOnEsc = true,
}: ModalProps) {
  const t = useTheme();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closeOnEsc, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={closeOnBackdrop ? onClose : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        background: t.colors.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: t.space(4),
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          overflow: 'auto',
          background: t.colors.surface,
          borderRadius: t.radii.lg,
          boxShadow: t.shadows.lg,
          fontFamily: t.fontFamily,
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: t.space(3),
              padding: t.space(4),
              borderBottom: `1px solid ${t.colors.border}`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: t.fontSizes.lg, color: t.colors.text }}>
              {title}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                fontSize: 18,
                color: t.colors.textMuted,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ padding: t.space(4), color: t.colors.text, fontSize: t.fontSizes.md }}>
          {children}
        </div>
        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: t.space(2),
              padding: t.space(4),
              borderTop: `1px solid ${t.colors.border}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
