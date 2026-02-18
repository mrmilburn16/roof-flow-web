"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MessageCircle, Trash2 } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card } from "@/components/ui";

function formatFeedbackDate(iso: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FeedbackInboxPage() {
  const { db, hasPermission, deleteFeedback } = useMockDb();
  const canView = hasPermission("view_feedback");
  const feedbackList = useMemo(
    () => [...db.feedback].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [db.feedback],
  );

  if (!canView) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[14px] text-[var(--text-muted)]">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Feedback inbox"
        subtitle="Feedback from “Give feedback” in the sidebar. Not linked in the app — bookmark this URL to check it."
      />
      <div className={card}>
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)]">
            <MessageCircle className="size-4" />
            All feedback
          </h2>
        </div>
        <div className="p-5">
          {feedbackList.length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)]">No feedback yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] space-y-0">
              {feedbackList.map((f) => (
                <li key={f.id} className="group flex items-start justify-between gap-4 py-4 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text-primary)]">{f.userName}</span>
                      <span aria-hidden>·</span>
                    <span>
                      <span className="text-[var(--text-muted)]">Page:</span>{" "}
                      <Link
                        href={f.page + (f.page.includes("?") ? "&" : "?") + "from=feedback-inbox"}
                        className="rounded bg-[var(--muted-bg)] px-1 py-0.5 font-mono text-[11px] text-[var(--text-secondary)] underline decoration-[var(--text-muted)]/50 underline-offset-1 transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] hover:decoration-[var(--text-primary)]"
                      >
                        {f.page}
                      </Link>
                    </span>
                      <span aria-hidden>·</span>
                      <span>{formatFeedbackDate(f.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-[14px] text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">Feedback:</span> {f.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.confirm("Delete this feedback?")) {
                        deleteFeedback(f.id);
                      }
                    }}
                    className="shrink-0 rounded-[var(--radius)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--btn-danger-bg)] hover:text-[var(--btn-danger-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    title="Delete feedback"
                    aria-label={`Delete feedback from ${f.userName}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
