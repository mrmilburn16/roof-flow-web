"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { inputBase, btnPrimary, btnSecondary } from "@/components/ui";

type FeedbackContextValue = {
  open: () => void;
};

const Ctx = createContext<FeedbackContextValue | null>(null);

export function useFeedbackOpen() {
  const value = useContext(Ctx);
  return value ?? { open: () => {} };
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const pathname = usePathname();
  const { createFeedback } = useMockDb();
  const { toast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setMessage("");
      setNameError(null);
      setMessageError(null);
      const t = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    const missingName = !trimmedName;
    const missingMessage = !trimmedMessage;
    setNameError(missingName ? "Please enter your name" : null);
    setMessageError(missingMessage ? "Please enter your feedback" : null);
    if (missingName || missingMessage) return;
    createFeedback(trimmedMessage, pathname ?? "/", trimmedName);
    setOpen(false);
    toast("Thanks, feedback sent.", "success");
  }

  const value: FeedbackContextValue = {
    open: () => setOpen(true),
  };

  return (
    <Ctx.Provider value={value}>
      {children}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-[var(--shadow-card)] transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
        aria-label="Give feedback"
      >
        <MessageCircle className="size-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          >
            <h2 id="feedback-title" className="text-[16px] font-semibold text-[var(--text-primary)]">
              Send feedback
            </h2>
            <p className="mt-1 text-[13px] text-[var(--helper-text)]">
              Your name and current page will be included so we can follow up.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="feedback-name" className="mb-1 block text-[13px] font-medium text-[var(--text-secondary)]">
                  Your name
                </label>
                <input
                  ref={nameInputRef}
                  id="feedback-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="e.g. Mike"
                  className={`${inputBase} w-full ${nameError ? "border-[var(--btn-danger-bg)] focus:ring-[var(--btn-danger-bg)]/30" : ""}`}
                  aria-label="Your name"
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "feedback-name-error" : undefined}
                  autoComplete="name"
                />
                {nameError && (
                  <p id="feedback-name-error" className="mt-1.5 text-[13px] text-[var(--btn-danger-bg)]" role="alert">
                    {nameError}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="feedback-message" className="mb-1 block text-[13px] font-medium text-[var(--text-secondary)]">
                  Feedback
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (messageError) setMessageError(null);
                  }}
                  placeholder="What's on your mind?"
                  rows={4}
                  className={`${inputBase} w-full min-h-[100px] resize-y ${messageError ? "border-[var(--btn-danger-bg)] focus:ring-[var(--btn-danger-bg)]/30" : ""}`}
                  aria-label="Feedback message"
                  aria-invalid={!!messageError}
                  aria-describedby={messageError ? "feedback-message-error" : undefined}
                />
                {messageError && (
                  <p id="feedback-message-error" className="mt-1.5 text-[13px] text-[var(--btn-danger-bg)]" role="alert">
                    {messageError}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>
                  Cancel
                </button>
                <button type="submit" className={`${btnPrimary} inline-flex items-center gap-2`}>
                  <Send className="size-4" aria-hidden />
                  Send feedback
                </button>
              </div>
            </form>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-[var(--radius)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
