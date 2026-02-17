"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";

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
  const typeStyles =
    toast.type === "success"
      ? "border-l-4 border-l-[var(--badge-success-bg)] bg-[var(--surface)]"
      : toast.type === "error"
        ? "border-l-4 border-l-[var(--badge-warning-bg)] bg-[var(--surface)]"
        : "bg-[var(--surface)]";

  return (
    <div
      role="status"
      className={`toast-item flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--surface-border)] px-4 py-3 text-[14px] shadow-[var(--shadow-card)] ${typeStyles} ${exiting ? "toast-exit" : ""}`}
      data-toast-type={toast.type}
    >
      <span className="flex-1 font-medium text-[var(--text-primary)]">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-[var(--radius)] p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
        aria-label="Dismiss"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
