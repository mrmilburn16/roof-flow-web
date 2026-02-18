"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { Plus, AlertCircle, Play, CheckCircle, RotateCcw, Search } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, inputBase, btnPrimary, btnSecondary } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

function formatCreated(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const msPerDay = 86400_000;
  const days = Math.floor((now.getTime() - d.getTime()) / msPerDay);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function priorityStyle(priority: number): string {
  if (priority === 1) return "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]";
  return "bg-[var(--muted-bg)] text-[var(--text-secondary)]";
}

const RECENT_RESOLVED_COUNT = 8;

export default function IssuesPage() {
  const { db, createIssue, resolveIssue, reopenIssue } = useMockDb();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen) {
      setTitle("");
      setNotes("");
      const t = setTimeout(() => titleRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [modalOpen]);

  const openIssues = useMemo(() => {
    return db.issues
      .filter((i) => i.status === "open")
      .sort((a, b) => a.priority - b.priority);
  }, [db.issues]);

  const filteredOpenIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return openIssues;
    return openIssues.filter((i) => i.title.toLowerCase().includes(q));
  }, [openIssues, searchQuery]);

  const resolvedIssues = useMemo(() => {
    return db.issues
      .filter((i) => i.status === "resolved")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, RECENT_RESOLVED_COUNT);
  }, [db.issues]);

  const resolvedCount = useMemo(() => db.issues.filter((i) => i.status === "resolved").length, [db.issues]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle subtitle="Identify, discuss, solve (IDS). Prioritize and resolve—turn decisions into To-Dos." />
        <Link href="/meetings/run" className={btnSecondary + " inline-flex gap-2"}>
          <Play className="size-4" />
          Run meeting
        </Link>
      </div>

      <div className={card}>
        <div className="flex flex-col gap-5 border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[15px] font-semibold text-[var(--text-primary)]">
                Open issues
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-muted)]">
                <span>{openIssues.length} open</span>
                {resolvedCount > 0 && (
                  <>
                    <span>·</span>
                    <span>{resolvedCount} resolved</span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={btnPrimary + " inline-flex gap-2"}
            >
              <Plus className="size-4" />
              Add issue
            </button>
          </div>

          {modalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-issue-title"
            >
              <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} aria-hidden />
              <div
                className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
                onKeyDown={(e) => e.key === "Escape" && setModalOpen(false)}
              >
                <h2 id="add-issue-title" className="text-[16px] font-semibold text-[var(--text-primary)]">
                  New issue
                </h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  Something to discuss and resolve (IDS).
                </p>
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = title.trim();
                    if (!t) {
                      toast("Enter a title", "info");
                      titleRef.current?.focus();
                      return;
                    }
                    createIssue(t, notes.trim() || undefined);
                    setModalOpen(false);
                    toast("Issue added", "success");
                  }}
                >
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Title</label>
                    <input
                      ref={titleRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Install crew starting late on Tuesdays"
                      className={inputBase + " w-full"}
                      aria-label="Issue title"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Context or root cause to discuss"
                      rows={3}
                      className={inputBase + " w-full resize-y"}
                      aria-label="Issue notes"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
                      Cancel
                    </button>
                    <button type="submit" className={btnPrimary}>
                      Add issue
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {openIssues.length > 0 && (
            <div className="flex items-center gap-2">
              <Search className="size-4 shrink-0 text-[var(--text-muted)]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search open issues"
                className={`${inputBase} max-w-xs`}
                aria-label="Search open issues by title"
              />
            </div>
          )}
        </div>

        <div className="divide-y divide-[var(--border)]">
          {openIssues.length === 0 ? (
            <div className="px-5">
              <EmptyState
                icon={AlertCircle}
                title="No open issues"
                description="Click “Add issue” above or capture them during the meeting."
                action={
                  <button type="button" onClick={() => setModalOpen(true)} className={btnPrimary + " inline-flex gap-2"}>
                    <Plus className="size-4" />
                    Add issue
                  </button>
                }
              />
            </div>
          ) : filteredOpenIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                No issues match your search
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-[13px] font-medium text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            filteredOpenIssues.map((i) => (
              <div
                key={i.id}
                className="flex items-start gap-4 px-5 py-4"
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-[13px] font-semibold ${priorityStyle(i.priority)}`}
                  title={`Priority ${i.priority}`}
                >
                  {i.priority}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[var(--text-primary)]">
                    {i.title}
                  </div>
                  {i.notes?.trim() ? (
                    <p className="mt-1 max-w-2xl text-[13px] leading-snug text-[var(--text-secondary)] line-clamp-3">
                      {i.notes}
                    </p>
                  ) : null}
                  <div className="mt-1.5 text-[12px] text-[var(--text-muted)]">
                    {formatCreated(i.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveIssue(i.id);
                  }}
                  className={btnSecondary + " shrink-0"}
                >
                  Resolve
                </button>
              </div>
            ))
          )}
        </div>

        {resolvedIssues.length > 0 && (
          <>
            <div className="border-t border-[var(--border)] px-5 py-4">
              <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Recently resolved — click Reopen to undo
              </div>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Resolved issues appear here. Click Reopen to move one back to Open if you resolved it by mistake.
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {resolvedIssues.map((i) => (
                <div key={i.id} className="flex items-start gap-4 px-5 py-3">
                  <CheckCircle className="mt-0.5 size-5 shrink-0 text-[var(--badge-success-text)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-[var(--text-secondary)] line-through">
                      {i.title}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                      Added {formatCreated(i.createdAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      reopenIssue(i.id);
                    }}
                    className={btnSecondary + " shrink-0 inline-flex items-center gap-1.5"}
                    title="Reopen this issue"
                  >
                    <RotateCcw className="size-3.5" />
                    Reopen
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
