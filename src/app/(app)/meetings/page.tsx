"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Calendar, Play, ListTodo, Clock, AlertCircle, XCircle, RotateCcw } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card, btnPrimary, btnSecondary } from "@/components/ui";

function formatWeek(weekOf: string) {
  const d = new Date(weekOf + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MeetingsPage() {
  const { db, weekOf, hasPermission, getMeetingRunStatus, setMeetingRunStatus } = useMockDb();
  const template = db.meetingTemplates[0];
  const templates = db.meetingTemplates;
  const canCancelMeeting = hasPermission("cancel_meeting");
  const meetingStatus = getMeetingRunStatus(weekOf);
  const isCanceled = meetingStatus === "canceled";

  const totalMinutes = useMemo(() => {
    if (!template?.sections?.length) return 0;
    return template.sections.reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [template]);

  const openTodos = useMemo(() => db.todos.filter((t) => t.status === "open").length, [db.todos]);
  const openIssues = useMemo(() => db.issues.filter((i) => i.status === "open").length, [db.issues]);

  return (
    <div className="space-y-8">
      <PageTitle
        title="Meetings"
        subtitle="Run your weekly L10 and keep decisions captured."
      />

      {templates.length === 0 ? (
        <div className={card + " p-10 text-center"}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--muted-bg)]">
            <Calendar className="size-6 text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-[var(--text-primary)]">
            No meeting templates yet
          </p>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Seed starter data in Settings to add a Weekly Leadership Meeting template.
          </p>
          <Link href="/settings" className={btnPrimary + " mt-6 inline-flex gap-2"}>
            Go to Settings
          </Link>
        </div>
      ) : (
        <>
          <div className={card}>
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--muted-bg)]">
                <Calendar className="size-6 text-[var(--text-secondary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {template?.title ?? "Weekly Meeting"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    Week of {formatWeek(weekOf)}
                  </span>
                  {totalMinutes > 0 && (
                    <span>{totalMinutes} min total</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1.5">
                    <ListTodo className="size-3.5" />
                    {openTodos} to-do{openTodos !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5" />
                    {openIssues} issue{openIssues !== 1 ? "s" : ""} to discuss
                  </span>
                </div>
                {isCanceled && (
                  <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--badge-warning-bg)] px-4 py-3 text-[13px] font-medium text-[var(--badge-warning-text)]">
                    This meeting is canceled for the week of {formatWeek(weekOf)}.
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  {!isCanceled && (
                    <Link href="/meetings/run" className={btnPrimary + " inline-flex gap-2"}>
                      <Play className="size-4" />
                      Run meeting
                    </Link>
                  )}
                  <Link href="/meetings/agendas" className={btnSecondary + " inline-flex gap-2"}>
                    View agendas
                  </Link>
                  {canCancelMeeting &&
                    (isCanceled ? (
                      <button
                        type="button"
                        onClick={() => setMeetingRunStatus(weekOf, "scheduled")}
                        className={btnSecondary + " inline-flex gap-2"}
                      >
                        <RotateCcw className="size-4" />
                        Restore meeting
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMeetingRunStatus(weekOf, "canceled")}
                        className={btnSecondary + " inline-flex gap-2 text-[var(--badge-warning-text)] hover:bg-[var(--badge-warning-bg)]"}
                      >
                        <XCircle className="size-4" />
                        Cancel meeting
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {templates.length > 1 && (
            <div className={card}>
              <div className="border-b border-[var(--border)] px-5 py-3">
                <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  All templates
                </div>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {templates.map((t) => {
                  const mins = t.sections?.reduce((sum, s) => sum + s.durationMinutes, 0) ?? 0;
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <span className="text-[14px] font-medium text-[var(--text-primary)]">
                        {t.title}
                      </span>
                      <div className="flex items-center gap-2">
                        {mins > 0 && (
                          <span className="text-[12px] text-[var(--text-muted)]">{mins} min</span>
                        )}
                        <Link
                          href="/meetings/agendas"
                          className="text-[13px] font-medium text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
                        >
                          View agenda
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
