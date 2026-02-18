"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageCircle, ChevronLeft } from "lucide-react";

const FROM_PARAM = "from=feedback-inbox";

export function FeedbackReturnBanner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromFeedbackInbox = searchParams?.toString().includes(FROM_PARAM);

  if (!fromFeedbackInbox || pathname === "/f/inbox") return null;

  return (
    <div className="mb-4 flex items-center justify-center">
      <Link
        href="/f/inbox"
        className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--text-muted)]/40 hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
      >
        <ChevronLeft className="size-4" aria-hidden />
        <MessageCircle className="size-4" aria-hidden />
        Back to feedback inbox
      </Link>
    </div>
  );
}
