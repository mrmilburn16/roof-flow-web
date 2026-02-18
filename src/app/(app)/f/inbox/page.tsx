"use client";

import { useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card } from "@/components/ui";

function formatFeedbackDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FeedbackInboxPage() {
  const { db, hasPermission } = useMockDb();
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
                <li key={f.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-baseline gap-2 text-[12px] text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-primary)]">{f.userName}</span>
                    <span>·</span>
                    <span>{f.page}</span>
                    <span>·</span>
                    <span>{formatFeedbackDate(f.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[14px] text-[var(--text-secondary)]">{f.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
