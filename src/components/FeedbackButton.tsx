"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { inputBase, btnPrimary, btnSecondary } from "@/components/ui";

export function FeedbackButton() {
  const pathname = usePathname();
  const { createFeedback } = useMockDb();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMessage("");
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      toast("Enter your feedback", "info");
      return;
    }
    createFeedback(trimmed, pathname ?? "/");
    setOpen(false);
    toast("Thanks, feedback sent.", "success");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-[14px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
      >
        <MessageCircle className="size-[18px] shrink-0 opacity-[var(--icon-opacity)]" />
        Give feedback
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
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What’s on your mind?"
                rows={4}
                className={`${inputBase} w-full resize-y min-h-[100px]`}
                aria-label="Feedback message"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" className={btnPrimary}>
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
    </>
  );
}
