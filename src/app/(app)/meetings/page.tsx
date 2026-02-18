"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Play, ListTodo, Clock, AlertCircle, XCircle, RotateCcw } from "lucide-react";
import type { MeetingSectionKind } from "@/lib/domain";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card, btnPrimary, btnSecondary, StatusBadge } from "@/components/ui";

function formatWeek(weekOf: string) {
  const d = new Date(weekOf + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const sectionLabels: Record<MeetingSectionKind, string> = {
  segue: "Check-in",
  scorecard: "Scorecard",
  goals: "Quarterly Goals",
  todos: "To-Dos",
  issues: "Issues",
  conclude: "Conclude",
};

export default function MeetingsPage() {
  const { db, weekOf, hasPermission, getMeetingRunStatus, setMeetingRunStatus, getMeetingRatingsAverage } = useMockDb();
  const meetingRatingAvg = getMeetingRatingsAverage();
  const template = db.meetingTemplates[0];
  const templates = db.meetingTemplates;
  const canCancelMeeting = hasPermission("cancel_meeting");
  const meetingStatus = getMeetingRunStatus(weekOf);
  const isCanceled = meetingStatus === "canceled";
  const [showCanceledBanner, setShowCanceledBanner] = useState(isCanceled);
  const [bannerVisible, setBannerVisible] = useState(isCanceled);

  useEffect(() => {
    if (isCanceled) {
      setShowCanceledBanner(true);
      setBannerVisible(false);
      // Double rAF so the browser paints the hidden state before we add .banner--visible and trigger the transition
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setBannerVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }

    // animate out, then unmount
    setBannerVisible(false);
    const t = setTimeout(() => setShowCanceledBanner(false), 220);
    return () => clearTimeout(t);
  }, [isCanceled]);

  const totalMinutes = useMemo(() => {
    if (!template?.sections?.length) return 0;
    return template.sections.reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [template]);

  const openTodos = useMemo(() => db.todos.filter((t) => t.status === "open").length, [db.todos]);
  const openIssues = useMemo(() => db.issues.filter((i) => i.status === "open").length, [db.issues]);
  const meetingNotes = (db.meetingNotes ?? "").trim();

  const agendaPreview = useMemo(() => {
    const sections = template?.sections ?? [];
    const all = sections.map((s) => ({
      kind: s.kind,
      label: sectionLabels[s.kind] ?? s.kind,
      minutes: s.durationMinutes,
    }));
    return { all, total: sections.length };
  }, [template?.sections]);

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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[var(--text-primary)]">
                      {template?.title ?? "Weekly Meeting"}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Week of {formatWeek(weekOf)}
                      </span>
                      {totalMinutes > 0 && <span>{totalMinutes} min</span>}
                      {agendaPreview.total > 0 && <span>{agendaPreview.total} sections</span>}
                      {meetingRatingAvg != null && (
                        <span>Avg. rating <span className="font-medium text-[var(--text-primary)]">{meetingRatingAvg}</span>/10</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge
                    status={isCanceled ? "warning" : "success"}
                    label={isCanceled ? "Canceled" : "Scheduled"}
                  />
                </div>

                {agendaPreview.all.length > 0 && (
                  <div className="mt-3 text-[13px] text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">Agenda</span>
                    <span className="mx-2 text-[var(--text-muted)]">·</span>
                    <span className="text-[var(--text-secondary)]">
                      {agendaPreview.all
                        .map((s) => `${s.label}${s.minutes ? ` (${s.minutes}m)` : ""}`)
                        .join(" · ")}
                    </span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href="/todos" className="quickstat" data-variant="neutral">
                    <span className="quickstat-icon" aria-hidden>
                      <ListTodo className="size-4 shrink-0 opacity-90" />
                    </span>
                    <span className="tabular-nums">{openTodos}</span>
                    <span className="font-medium opacity-90">to-do{openTodos !== 1 ? "s" : ""} open</span>
                  </Link>
                  <Link href="/issues" className="quickstat" data-variant="info">
                    <span className="quickstat-icon" aria-hidden>
                      <AlertCircle className="size-4 shrink-0 opacity-90" />
                    </span>
                    <span className="tabular-nums">{openIssues}</span>
                    <span className="font-medium opacity-90">issue{openIssues !== 1 ? "s" : ""} to discuss</span>
                  </Link>
                </div>

                {meetingNotes && (
                  <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-3">
                    <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Notes
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)] line-clamp-2">
                      {meetingNotes}
                    </p>
                  </div>
                )}

                {showCanceledBanner && (
                  <div
                    className={[
                      "banner mt-4 w-fit max-w-full rounded-[var(--radius)] border px-4 py-3 text-[13px] font-medium shadow-[var(--shadow-sm)] sm:max-w-[720px]",
                      bannerVisible ? "banner--visible" : "",
                    ].join(" ")}
                    style={{
                      backgroundColor: "var(--quickstat-warning-bg)",
                      color: "var(--quickstat-warning-text)",
                      borderColor: "var(--quickstat-ring)",
                      backgroundImage:
                        "linear-gradient(to bottom, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.08))",
                    }}
                  >
                    This meeting is canceled for the week of {formatWeek(weekOf)}.
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  {!isCanceled ? (
                    <Link href="/meetings/run" className={btnPrimary + " inline-flex gap-2"}>
                      <Play className="size-4" />
                      Run meeting
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMeetingRunStatus(weekOf, "scheduled")}
                      className={btnPrimary + " inline-flex gap-2"}
                    >
                      <RotateCcw className="size-4" />
                      Restore meeting
                    </button>
                  )}
                  <Link href="/meetings/agendas" className={btnSecondary + " inline-flex gap-2"}>
                    View agendas
                  </Link>
                  {canCancelMeeting &&
                    (isCanceled ? (
                      <span className="inline-flex items-center px-3 py-2 text-[13px] font-medium text-[var(--text-muted)]">
                        Meeting is canceled
                      </span>
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
