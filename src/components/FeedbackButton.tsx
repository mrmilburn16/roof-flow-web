"use client";

import { Sparkles } from "lucide-react";
import { useFeedbackOpen } from "@/components/FeedbackProvider";

export function FeedbackButton() {
  const { open } = useFeedbackOpen();

  return (
    <button
      type="button"
      onClick={open}
      className="flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-[14px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
    >
      <Sparkles className="size-[18px] shrink-0 opacity-[var(--icon-opacity)]" />
      Share feedback
    </button>
  );
}
