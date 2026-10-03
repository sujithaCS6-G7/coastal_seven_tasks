import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ title, description, variant = 'default', duration = 4000 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, title, description, variant };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      {/* Toast Viewport in bottom-right */}
      <div
        className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-sm flex-col-reverse gap-2 pointer-events-none p-4 sm:p-0"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const isSuccess = t.variant === 'success';
          const isDestructive = t.variant === 'destructive';
          const isInfo = t.variant === 'info';

          return (
            <div
              key={t.id}
              role={isDestructive ? 'alert' : 'status'}
              className={cn(
                "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all animate-in slide-in-from-bottom-5 duration-300",
                isSuccess && "border-emerald-500/30 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-100 dark:border-emerald-700",
                isDestructive && "border-red-500/30 bg-red-50 text-red-950 dark:bg-red-950/80 dark:text-red-100 dark:border-red-700",
                isInfo && "border-blue-500/30 bg-blue-50 text-blue-950 dark:bg-blue-950/80 dark:text-blue-100 dark:border-blue-700",
                t.variant === 'default' && "border-border bg-card text-card-foreground"
              )}
            >
              {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />}
              {isDestructive && <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />}
              {isInfo && <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />}

              <div className="flex-1 text-sm">
                {t.title && <div className="font-semibold leading-snug">{t.title}</div>}
                {t.description && <div className="text-xs opacity-90 mt-1">{t.description}</div>}
              </div>

              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-foreground/50 hover:text-foreground p-0.5 rounded transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default useToast;
