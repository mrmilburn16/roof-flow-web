"use client";

import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import { Plus, CheckSquare, Square, Play, User, RotateCcw } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, inputBase, btnPrimary, btnSecondary } from "@/components/ui";

function ordinal(n: number): string {
  const s = n % 100;
  if (s >= 11 && s <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** e.g. "January 2nd, 2026" */
export function formatDateLong(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${month} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

function formatDue(iso?: string): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso + "T12:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const msPerDay = 86400_000;
  const days = Math.round((dueDay.getTime() - today.getTime()) / msPerDay);
  if (days < 0) return { label: "Overdue", overdue: true };
  if (days === 0) return { label: "Today", overdue: false };
  if (days === 1) return { label: "Tomorrow", overdue: false };
  if (days <= 7) return { label: `In ${days} days`, overdue: false };
  return { label: formatDateLong(iso), overdue: false };
}

const RECENT_DONE_COUNT = 10;

export default function TodosPage() {
  const { db, createTodo, toggleTodo } = useMockDb();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const openTodos = useMemo(() => {
    const open = db.todos.filter((t) => t.status === "open");
    return open.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (aDue !== bDue) return aDue - bDue;
      return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    });
  }, [db.todos]);

  const doneTodos = useMemo(() => {
    return db.todos
      .filter((t) => t.status === "done")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, RECENT_DONE_COUNT);
  }, [db.todos]);

  const userById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of db.users) map.set(u.id, u.name);
    return map;
  }, [db.users]);

  const overdueCount = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    return openTodos.filter((t) => t.dueDate && t.dueDate < today).length;
  }, [openTodos]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle
          title="To-Dos"
          subtitle="Weekly action items. If it needs discussion, turn it into an Issue."
        />
        <Link href="/meetings/run" className={btnSecondary + " inline-flex gap-2"}>
          <Play className="size-4" />
          Run meeting
        </Link>
      </div>

      <div className={card}>
        <div className="flex flex-col gap-5 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">
              Open To-Dos
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-muted)]">
              <span>{openTodos.length} open</span>
              {doneTodos.length > 0 && (
                <>
                  <span>·</span>
                  <span>{db.todos.filter((t) => t.status === "done").length} completed</span>
                </>
              )}
              {overdueCount > 0 && (
                <span className="font-medium text-[var(--badge-warning-text)]">
                  {overdueCount} overdue
                </span>
              )}
            </div>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = title.trim();
              if (!trimmed) {
                toast("Enter a to-do title", "info");
                inputRef.current?.focus();
                return;
              }
              createTodo(trimmed);
              setTitle("");
              inputRef.current?.focus();
            }}
          >
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New To-Do"
              className={`${inputBase} w-full min-w-0 sm:w-64`}
              aria-label="New to-do title"
            />
            <button type="submit" className={`${btnPrimary} shrink-0`}>
              <Plus className="size-4" />
              Add
            </button>
          </form>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {openTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--muted-bg)]">
                <Square className="size-6 text-[var(--text-muted)]" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-[var(--text-primary)]">
                No open To-Dos
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Add one above or capture them during the meeting.
              </p>
            </div>
          ) : (
            openTodos.map((t) => {
              const due = formatDue(t.dueDate);
              const ownerName = userById.get(t.ownerId) ?? "";
              return (
                <button
                  key={t.id}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-[var(--muted-bg)]"
                  onClick={() => toggleTodo(t.id)}
                  title="Mark done"
                >
                  <Square className="mt-0.5 size-5 shrink-0 text-[var(--text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-[var(--text-primary)]">
                      {t.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
                      {due && (
                        <span className={due.overdue ? "font-medium text-[var(--badge-warning-text)]" : ""}>
                          {due.label}
                        </span>
                      )}
                      {ownerName && (
                        <>
                          {due && <span>·</span>}
                          <span className="flex items-center gap-1">
                            <User className="size-3" />
                            {ownerName}
                          </span>
                        </>
                      )}
                    </div>
                    {t.notes?.trim() && (
                      <p className="mt-1 text-[13px] leading-snug text-[var(--text-secondary)]">
                        {t.notes}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {doneTodos.length > 0 && (
          <>
            <div className="border-t border-[var(--border)] px-5 py-4">
              <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Archived — click any item to reopen (undo)
              </div>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Completed to-dos appear here. Click one to move it back to Open if you marked it done by mistake.
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {doneTodos.map((t) => (
                <button
                  key={t.id}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-[var(--muted-bg)]"
                  onClick={() => toggleTodo(t.id)}
                  title="Reopen this to-do"
                >
                  <CheckSquare className="size-5 shrink-0 text-[var(--badge-success-text)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-[var(--text-secondary)] line-through">
                      {t.title}
                    </div>
                    {t.dueDate && (
                      <div className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                        Due {formatDateLong(t.dueDate)}
                      </div>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--text-muted)]">
                    <RotateCcw className="size-3.5" />
                    Reopen
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
