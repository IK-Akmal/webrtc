import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const AUTO_DISMISS_MS = 4500;
const EXIT_DURATION_MS = 300;

// Module-level bridge so axios interceptor can fire toasts outside React tree
export let dispatchToast: ((type: ToastType, message: string) => void) | null = null;

const ToastContext = createContext<ToastContextValue | null>(null);

function SingleToast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const dismissingRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), EXIT_DURATION_MS);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    // rAF ensures the initial style (off-screen) is painted before we add --visible
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [dismiss]);

  return (
    <div
      className={`toast toast--${toast.type}${visible ? ' toast--visible' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="toast-icon" aria-hidden="true">{ICONS[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={dismiss} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    dispatchToast = addToast;
    return () => {
      dispatchToast = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        success: (m) => addToast('success', m),
        error: (m) => addToast('error', m),
        warning: (m) => addToast('warning', m),
        info: (m) => addToast('info', m),
      }}
    >
      {children}
      <div className="toast-container" aria-label="Notifications">
        {toasts.map((t) => (
          <SingleToast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
