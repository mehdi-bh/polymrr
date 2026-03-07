"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import Image from "next/image";
import { X, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info" | "quest";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-success shrink-0" />,
  error: <XCircle className="h-4 w-4 text-error shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning shrink-0" />,
  info: <Info className="h-4 w-4 text-info shrink-0" />,
  quest: <Image src="/banana.svg" alt="" width={18} height={18} className="shrink-0" />,
};

const BAR_COLORS: Record<ToastType, string> = {
  success: "bg-success",
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-info",
  quest: "bg-warning",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(dismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, dismiss]);

  return (
    <div
      className={`card bg-base-100 border border-base-300 shadow-lg overflow-hidden transition-all duration-200 ${
        exiting ? "opacity-0 translate-x-4" : "animate-fade-up"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="mt-0.5">{ICONS[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{toast.title}</div>
          {toast.message && (
            <div className="text-xs text-base-content/50 mt-0.5">
              {toast.message}
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          className="btn btn-ghost btn-xs btn-square shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="h-0.5 w-full bg-base-300">
        <div
          className={`h-full ${BAR_COLORS[toast.type]}`}
          style={{
            animation: `toast-progress ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
