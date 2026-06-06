import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { type Intent, useTheme } from './theme.js';

export interface ToastOptions {
  title?: ReactNode;
  description?: ReactNode;
  intent?: Intent;
  /** Auto-dismiss after this many ms. Default 4000. Pass 0 to keep it until dismissed. */
  duration?: number;
}

interface ToastRecord extends Required<Pick<ToastOptions, 'intent' | 'duration'>> {
  id: number;
  title?: ReactNode;
  description?: ReactNode;
}

interface ToastApi {
  /** Show a toast; returns its id. */
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

export interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
}

/**
 * Provides toast notifications to the tree. Mount once near the root, then call
 * {@link useToast} anywhere below.
 *
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * ```
 */
export function ToastProvider({ children, position = 'bottom-right' }: ToastProviderProps) {
  const t = useTheme();
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = ++idRef.current;
      const record: ToastRecord = {
        id,
        title: options.title,
        description: options.description,
        intent: options.intent ?? 'neutral',
        duration: options.duration ?? 4000,
      };
      setToasts((list) => [...list, record]);
      if (record.duration > 0) setTimeout(() => dismiss(id), record.duration);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  const [vert, horiz] = position.split('-') as ['top' | 'bottom', 'left' | 'right' | 'center'];
  const stackStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1200,
    display: 'flex',
    flexDirection: vert === 'top' ? 'column' : 'column-reverse',
    gap: t.space(2),
    padding: t.space(4),
  };
  if (vert === 'top') stackStyle.top = 0;
  else stackStyle.bottom = 0;
  if (horiz === 'center') {
    stackStyle.left = '50%';
    stackStyle.transform = 'translateX(-50%)';
  } else if (horiz === 'left') {
    stackStyle.left = 0;
  } else {
    stackStyle.right = 0;
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div style={stackStyle}>
            {toasts.map((item) => (
              <ToastCard key={item.id} record={item} onClose={() => dismiss(item.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastCard({ record, onClose }: { record: ToastRecord; onClose: () => void }) {
  const t = useTheme();
  const c = t.colors.intent[record.intent];
  return (
    <div
      role="status"
      style={{
        minWidth: 260,
        maxWidth: 380,
        display: 'flex',
        gap: t.space(2),
        padding: t.space(3),
        background: t.colors.surface,
        borderRadius: t.radii.md,
        boxShadow: t.shadows.lg,
        borderLeft: `4px solid ${c.solid}`,
        fontFamily: t.fontFamily,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {record.title && (
          <div style={{ fontWeight: 600, color: t.colors.text, fontSize: t.fontSizes.md }}>
            {record.title}
          </div>
        )}
        {record.description && (
          <div style={{ color: t.colors.textMuted, fontSize: t.fontSizes.sm, marginTop: 2 }}>
            {record.description}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        style={{
          background: 'none',
          border: 0,
          cursor: 'pointer',
          color: t.colors.textMuted,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

/** Access the toast API. Must be used within a {@link ToastProvider}. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>.');
  return ctx;
}
