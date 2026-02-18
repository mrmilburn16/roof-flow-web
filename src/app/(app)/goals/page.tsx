"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Target, Play, Calendar } from "lucide-react";
import type { GoalStatus } from "@/lib/domain";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card, inputBase, btnPrimary, btnSecondary, goalStatusButtonBase, goalStatusActive, StatusBadge } from "@/components/ui";

const STATUSES: GoalStatus[] = ["onTrack", "offTrack", "done"];

function statusLabel(s: GoalStatus) {
  switch (s) {
    case "onTrack": return "On track";
    case "offTrack": return "Off track";
    case "done": return "Done";
  }
}

function statusVariant(s: GoalStatus): "success" | "warning" | "neutral" {
  switch (s) {
    case "onTrack": return "success";
    case "offTrack": return "warning";
    case "done": return "neutral";
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
  const [title, setTitle] = useState("");

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
    createGoal(trimmed);
    setTitle("");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle
          title="Goals"
          subtitle="Quarterly goals (Rocks) with simple on/off track check-ins."
        />
        <Link href="/meetings/run" className={btnSecondary + " inline-flex gap-2"}>
          <Play className="size-4" />
          Run meeting
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className={card + " p-10 text-center"}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--muted-bg)]">
            <Target className="size-6 text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-[var(--text-primary)]">
            No goals yet
          </p>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Add quarterly goals (Rocks) to keep the team aligned.
          </p>
          <form
            className="mx-auto mt-6 flex max-w-sm items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddGoal();
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New quarterly goal"
              className={inputBase}
            />
            <button type="button" className={btnPrimary + " shrink-0"} disabled={!title.trim()} onClick={handleAddGoal}>
              <Plus className="size-4" />
              Add
            </button>
          </form>
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
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddGoal();
              }}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New quarterly goal"
                className={`${inputBase} w-full min-w-0 sm:w-80`}
              />
              <button
                type="button"
                className={`${btnPrimary} shrink-0`}
                disabled={!title.trim()}
                onClick={handleAddGoal}
              >
                <Plus className="size-4" />
                Add
              </button>
            </form>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {goals.map((g) => {
              const due = formatDueDate(g.dueDate);
              const ownerName = userById.get(g.ownerId) ?? "";
              return (
                <div
                  key={g.id}
                  className="rounded-[var(--radius)] border border-[var(--border)] p-4"
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
                  <div className="mt-4 flex flex-wrap gap-2">
                    {STATUSES.map((s) => {
                      const isActive = g.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setGoalStatus(g.id, s)}
                          className={
                            isActive
                              ? `${goalStatusButtonBase} ${goalStatusActive[s]}`
                              : btnSecondary
                          }
                          aria-pressed={isActive}
                        >
                          {statusLabel(s)}
                        </button>
                      );
                    })}
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
