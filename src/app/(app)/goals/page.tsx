"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { Plus, Target, Play, Calendar } from "lucide-react";
import type { GoalStatus } from "@/lib/domain";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, inputBase, btnPrimary, btnSecondary, StatusBadge } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";
import { GoalStatusIconPicker } from "@/components/GoalStatusIconPicker";

const STATUSES: GoalStatus[] = ["onTrack", "offTrack", "done"];

function statusLabel(s: GoalStatus) {
  switch (s) {
    case "onTrack": return "On track";
    case "offTrack": return "Off track";
    case "done": return "Done";
  }
}

function statusVariant(s: GoalStatus): "success" | "warning" | "neutral" | "done" {
  switch (s) {
    case "onTrack": return "success";
    case "offTrack": return "warning";
    case "done": return "done";
  }
}

function formatDueDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const now = new Date();
  const msPerDay = 86400_000;
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / msPerDay);
  if (daysLeft < 0) return { label: "Overdue", soon: true };
  if (daysLeft <= 14) return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), soon: true };
  return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), soon: false };
}

export default function GoalsPage() {
  const { db, createGoal, setGoalStatus } = useMockDb();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen) {
      setTitle("");
      const q = new Date();
      q.setDate(q.getDate() + 75);
      setDueDate(q.toISOString().slice(0, 10));
      const t = setTimeout(() => titleRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [modalOpen]);

  const goals = useMemo(() => db.goals, [db.goals]);
  const userById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of db.users) map.set(u.id, u.name);
    return map;
  }, [db.users]);

  const summary = useMemo(() => {
    let onTrack = 0, offTrack = 0, done = 0;
    for (const g of goals) {
      if (g.status === "onTrack") onTrack++;
      else if (g.status === "offTrack") offTrack++;
      else done++;
    }
    return { onTrack, offTrack, done };
  }, [goals]);

  function handleAddGoal() {
    const trimmed = title.trim();
    if (!trimmed) return;
    createGoal(trimmed, dueDate.trim() || undefined);
    setModalOpen(false);
    toast("Goal added", "success");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle subtitle="Quarterly goals (Rocks) with simple on/off track check-ins." />
        <Link href="/meetings/run" className={btnSecondary + " inline-flex gap-2"}>
          <Play className="size-4" />
          Run meeting
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className={card + " p-10"}>
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Add quarterly goals (Rocks) to keep the team aligned."
            action={
              <button type="button" onClick={() => setModalOpen(true)} className={btnPrimary + " inline-flex gap-2"}>
                <Plus className="size-4" />
                Add goal
              </button>
            }
          />
        </div>
      ) : (
        <div className={card}>
          <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[15px] font-semibold text-[var(--text-primary)]">
                This quarter
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--badge-success-text)]">{summary.onTrack} on track</span>
                <span>·</span>
                <span className="font-semibold text-[var(--badge-warning-text)]">{summary.offTrack} off</span>
                <span>·</span>
                <span className="font-medium text-[var(--text-muted)]">{summary.done} done</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={btnPrimary + " inline-flex gap-2"}
            >
              <Plus className="size-4" />
              Add goal
            </button>
          </div>

          {modalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-goal-title"
            >
              <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} aria-hidden />
              <div
                className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
                onKeyDown={(e) => e.key === "Escape" && setModalOpen(false)}
              >
                <h2 id="add-goal-title" className="text-[16px] font-semibold text-[var(--text-primary)]">
                  New quarterly goal
                </h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  A Rock for this quarter. Default due date is ~90 days out.
                </p>
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = title.trim();
                    if (!t) {
                      toast("Enter a goal title", "info");
                      titleRef.current?.focus();
                      return;
                    }
                    handleAddGoal();
                  }}
                >
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Title</label>
                    <input
                      ref={titleRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Reduce lead-to-contact time to under 30 min"
                      className={inputBase + " w-full"}
                      aria-label="Goal title"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Due date (optional)</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={inputBase + " w-full"}
                      aria-label="Due date"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
                      Cancel
                    </button>
                    <button type="submit" className={btnPrimary}>
                      Add goal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {goals.map((g) => {
              const due = formatDueDate(g.dueDate);
              const ownerName = userById.get(g.ownerId) ?? "";
              return (
                <div
                  key={g.id}
                  className="flex min-h-0 flex-col rounded-[var(--radius)] border border-[var(--border)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                        {g.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {due.label}
                        </span>
                        {ownerName && (
                          <>
                            <span>·</span>
                            <span>{ownerName}</span>
                          </>
                        )}
                      </div>
                      {due.soon && g.status !== "done" && (
                        <span className="mt-1.5 inline-block rounded px-2 py-0.5 text-[11px] font-medium bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]">
                          Due soon
                        </span>
                      )}
                      {g.notes?.trim() && (
                        <p className="mt-2 text-[13px] leading-snug text-[var(--text-secondary)]">
                          {g.notes}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={statusVariant(g.status)} label={statusLabel(g.status)} />
                  </div>
                  <div className="mt-auto pt-4">
                    <GoalStatusIconPicker
                      value={g.status}
                      onChange={(s) => setGoalStatus(g.id, s)}
                      ariaLabel={`Status for ${g.title}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
