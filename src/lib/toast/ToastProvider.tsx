"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
};

const TOAST_DURATION_MS = 7000;
const TOAST_EXIT_MS = 250;

type ToastContextValue = {
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
};

const Ctx = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setExitingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const t = timeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      setExitingIds((prev) => new Set(prev).add(id));
      const t = setTimeout(() => removeToast(id), TOAST_EXIT_MS);
      timeoutsRef.current.set(id, t);
    },
    [removeToast],
  );

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const created: Toast = { id, message, type, createdAt: Date.now() };
      setToasts((prev) => [...prev, created]);
      const t = setTimeout(() => dismiss(id), TOAST_DURATION_MS);
      timeoutsRef.current.set(id, t);
    },
    [dismiss],
  );

  const value: ToastContextValue = { toasts, toast, dismiss };
  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} exitingIds={exitingIds} dismiss={dismiss} />
    </Ctx.Provider>
  );
}

function ToastContainer({
  toasts,
  exitingIds,
  dismiss,
}: {
  toasts: Toast[];
  exitingIds: Set<string>;
  dismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed right-4 top-4 z-[100] flex max-w-[360px] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          exiting={exitingIds.has(t.id)}
          onDismiss={() => dismiss(t.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  exiting,
  onDismiss,
}: {
  toast: Toast;
  exiting: boolean;
  onDismiss: () => void;
}) {
  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  const wrapperStyles =
    isSuccess
      ? "bg-[var(--badge-success-bg)] border-[var(--badge-success-text)]/25"
      : isError
        ? "bg-[var(--badge-warning-bg)] border-[var(--badge-warning-text)]/25"
        : "bg-[var(--badge-info-bg)] border-[var(--badge-info-text)]/25";

  const iconColor =
    isSuccess
      ? "text-[var(--badge-success-text)]"
      : isError
        ? "text-[var(--badge-warning-text)]"
        : "text-[var(--badge-info-text)]";

  const progressColor =
    isSuccess
      ? "bg-[var(--badge-success-text)]"
      : isError
        ? "bg-[var(--badge-warning-text)]"
        : "bg-[var(--badge-info-text)]";

  const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;

  return (
    <div
      role="status"
      className={`toast-item overflow-hidden rounded-[var(--radius-xl)] border shadow-[var(--shadow-toast)] ${wrapperStyles} ${exiting ? "toast-exit" : ""}`}
      data-toast-type={toast.type}
      style={{ "--toast-duration": `${TOAST_DURATION_MS}ms` } as React.CSSProperties}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Icon className={`size-5 shrink-0 ${iconColor}`} aria-hidden />
        <span className="min-w-0 flex-1 text-[14px] font-medium text-[var(--text-primary)]">
          {toast.message}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-[var(--radius)] p-2 text-[var(--text-muted)] transition hover:bg-black/5 hover:text-[var(--text-primary)]"
          aria-label="Dismiss"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div
        className={`toast-progress-bar h-0.5 ${progressColor} opacity-60`}
        aria-hidden
      />
    </div>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
