"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  X,
  Send,
  CheckCircle2,
  Bug,
  Lightbulb,
  Heart,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { inputBase, btnPrimary, btnSecondary } from "@/components/ui";

const MAX_MESSAGE_LENGTH = 500;

type Sentiment = "frustrated" | "neutral" | "happy" | null;
type Category = "bug" | "idea" | "praise" | "other" | null;

type FeedbackContextValue = {
  open: () => void;
};

const Ctx = createContext<FeedbackContextValue | null>(null);

export function useFeedbackOpen() {
  const value = useContext(Ctx);
  return value ?? { open: () => {} };
}

const SENTIMENTS: { value: Sentiment; label: string; emoji: string; aria: string }[] = [
  { value: "frustrated", label: "Something's wrong", emoji: "😤", aria: "Something's wrong" },
  { value: "neutral", label: "It's okay", emoji: "😐", aria: "It's okay" },
  { value: "happy", label: "Loving it", emoji: "😊", aria: "Loving it" },
];

const CATEGORIES: { value: Category; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "bug", label: "Bug", Icon: Bug },
  { value: "idea", label: "Idea", Icon: Lightbulb },
  { value: "praise", label: "Praise", Icon: Heart },
  { value: "other", label: "Other", Icon: MessageSquare },
];

function prefixForSubmission(sentiment: Sentiment, category: Category): string {
  const parts: string[] = [];
  if (sentiment) parts.push(sentiment === "frustrated" ? "Frustrated" : sentiment === "happy" ? "Happy" : "Neutral");
  if (category) parts.push(category.charAt(0).toUpperCase() + category.slice(1));
  return parts.length ? `[${parts.join(" · ")}] ` : "";
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sentiment, setSentiment] = useState<Sentiment>(null);
  const [category, setCategory] = useState<Category>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const pathname = usePathname();
  const { createFeedback } = useMockDb();
  const { toast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setSentiment(null);
      setCategory(null);
      setName("");
      setMessage("");
      setSubmitted(false);
      const t = setTimeout(() => nameInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast("Share what's on your mind", "info");
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast("Tell us your name so we can follow up", "info");
      return;
    }
    const prefix = prefixForSubmission(sentiment, category);
    createFeedback(prefix + trimmedMessage, pathname ?? "/", trimmedName);
    setSubmitted(true);
    successTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      toast("Thanks — we got it.", "success");
    }, 2200);
  }

  function handleClose() {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setOpen(false);
    setSubmitted(false);
  }

  const value: FeedbackContextValue = {
    open: () => setOpen(true),
  };

  return (
    <Ctx.Provider value={value}>
      {children}

      {/* FAB: Feedback 2.0 — soft pulse, inviting */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-[0 4px 24px rgba(0,0,0,0.12)] transition-all hover:scale-105 hover:shadow-[0 8px 32px rgba(0,0,0,0.16)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
        aria-label="Share feedback"
        title="Share feedback"
      >
        <Sparkles className="size-6" aria-hidden />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          aria-describedby="feedback-desc"
        >
          {/* Backdrop: blur + dim */}
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity"
            onClick={submitted ? undefined : handleClose}
            aria-hidden
          />

          {/* Card: scale-in, theme-aware gradient border */}
          <div
            className="feedback-modal-in relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] shadow-[0 24px 48px -12px rgba(0,0,0,0.25)]"
            onKeyDown={(e) => {
              if (e.key === "Escape") handleClose();
            }}
            style={{
              boxShadow: "var(--shadow-card), 0 0 0 1px var(--surface-border)",
            }}
          >
            {/* Accent bar */}
            <div
              className="h-1 w-full"
              style={{
                background: "linear-gradient(90deg, var(--badge-info-text) 0%, var(--stat-success) 100%)",
                opacity: 0.85,
              }}
            />

            {submitted ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
                <div
                  className="flex size-16 items-center justify-center rounded-full bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]"
                  aria-hidden
                >
                  <CheckCircle2 className="size-10" strokeWidth={2} />
                </div>
                <h2 id="feedback-title" className="mt-5 text-[20px] font-semibold text-[var(--text-primary)]">
                  Thanks — we got it.
                </h2>
                <p id="feedback-desc" className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-[var(--helper-text)]">
                  We read every response and use it to make RoofFlow better.
                </p>
              </div>
            ) : (
              <>
                <div className="px-6 pt-6 pb-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 id="feedback-title" className="text-[20px] font-semibold tracking-tight text-[var(--text-primary)]">
                        Share your thoughts
                      </h2>
                      <p id="feedback-desc" className="mt-1.5 text-[14px] leading-relaxed text-[var(--helper-text)]">
                        We read every response. Help us build something you'll love.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="shrink-0 rounded-[var(--radius)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      aria-label="Close"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  {/* Current page context */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[12px] text-[var(--text-muted)]">Included with your note:</span>
                    <code className="rounded-md bg-[var(--muted-bg)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                      {pathname || "/"}
                    </code>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4">
                  {/* Sentiment */}
                  <fieldset className="mb-5">
                    <legend className="sr-only">How are you feeling about this?</legend>
                    <div className="flex gap-2">
                      {SENTIMENTS.map(({ value: v, label, emoji, aria }) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setSentiment(sentiment === v ? null : v)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[13px] font-medium transition ${
                            sentiment === v
                              ? "border-[var(--badge-info-text)] bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]"
                              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]/50 hover:text-[var(--text-secondary)]"
                          }`}
                          aria-pressed={sentiment === v}
                          aria-label={aria}
                        >
                          <span className="text-[16px]" aria-hidden>{emoji}</span>
                          <span className="hidden sm:inline">{label}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {/* Category */}
                  <fieldset className="mb-5">
                    <legend className="mb-2 text-[13px] font-medium text-[var(--text-secondary)]">
                      What kind of feedback?
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(({ value: v, label, Icon }) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setCategory(category === v ? null : v)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition ${
                            category === v
                              ? "border-[var(--badge-info-text)] bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]"
                              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]/50 hover:text-[var(--text-secondary)]"
                          }`}
                          aria-pressed={category === v}
                        >
                          <Icon className="size-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {/* Name */}
                  <div className="mb-4">
                    <label htmlFor="feedback-name" className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]">
                      What should we call you?
                    </label>
                    <input
                      ref={nameInputRef}
                      id="feedback-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className={`${inputBase} w-full`}
                      aria-label="Your name"
                      autoComplete="name"
                    />
                  </div>

                  {/* Message */}
                  <div className="mb-5">
                    <label htmlFor="feedback-message" className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]">
                      What's on your mind?
                    </label>
                    <textarea
                      id="feedback-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="A bug, an idea, or something you love — we're listening."
                      maxLength={MAX_MESSAGE_LENGTH}
                      rows={4}
                      className={`${inputBase} w-full min-h-[100px] resize-y`}
                      aria-label="Feedback message"
                      aria-describedby="feedback-char-count"
                    />
                    <div id="feedback-char-count" className="mt-1 flex justify-end text-[11px] text-[var(--text-muted)]">
                      {message.length}/{MAX_MESSAGE_LENGTH}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={handleClose} className={btnSecondary}>
                      Cancel
                    </button>
                    <button type="submit" className={`${btnPrimary} inline-flex items-center gap-2`}>
                      <Send className="size-4" aria-hidden />
                      Send feedback
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
