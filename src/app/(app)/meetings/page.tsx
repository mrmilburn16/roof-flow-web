"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Play, ListTodo, Clock, AlertCircle, XCircle, RotateCcw, MoreHorizontal, Settings2, ChevronDown, Check } from "lucide-react";
import type { MeetingSectionKind, MeetingTemplate } from "@/lib/domain";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, btnPrimary, btnSecondary, StatusBadge, inputBase } from "@/components/ui";

function formatWeek(weekOf: string) {
  const d = new Date(weekOf + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Format a date and time string for display. */
function formatDateAndTime(d: Date) {
  const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dateStr} at ${timeStr}`;
}

/** Default weekly meeting: Tuesday of the week at 9:00 AM. weekOf is Monday (ISO date). */
function formatMeetingDateAndTime(weekOf: string) {
  const monday = new Date(weekOf + "T12:00:00");
  const tuesday = new Date(monday);
  tuesday.setDate(tuesday.getDate() + 1);
  tuesday.setHours(9, 0, 0, 0);
  return formatDateAndTime(tuesday);
}

/** Parse "09:00" into hours and minutes; default 9, 0. */
function parseTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return { hours: Number.isFinite(h) ? h : 9, minutes: Number.isFinite(m) ? m : 0 };
}

/** Get next occurrence and label from template schedule, or fallback to current week Tuesday 9am. */
function getScheduleDisplay(template: MeetingTemplate | undefined, weekOf: string): { label: string; nextFormatted: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!template?.schedule) {
    return { label: "Weekly", nextFormatted: formatMeetingDateAndTime(weekOf) };
  }

  const s = template.schedule;

  if (s.type === "oneTime") {
    const d = new Date(s.date + "T12:00:00");
    const { hours, minutes } = parseTime(s.time);
    d.setHours(hours, minutes, 0, 0);
    return { label: "One-time", nextFormatted: formatDateAndTime(d) };
  }

  // Recurring: next occurrence of dayOfWeek at time (0=Sun .. 6=Sat)
  const { hours, minutes } = parseTime(s.time);
  let d = new Date(today);
  const currentDay = d.getDay();
  let daysUntil = s.dayOfWeek - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && (d.getHours() > hours || (d.getHours() === hours && d.getMinutes() >= minutes)))) daysUntil += 7;
  if (daysUntil === 0) {
    const now = new Date();
    if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) daysUntil = 7;
  }
  d.setDate(d.getDate() + daysUntil);
  d.setHours(hours, minutes, 0, 0);

  if (s.frequency === "biweekly") {
    const epoch = new Date("2020-01-06T00:00:00"); // Monday
    const weeksSince = Math.floor((d.getTime() - epoch.getTime()) / (7 * 86400 * 1000));
    if (weeksSince % 2 !== 0) {
      d.setDate(d.getDate() + 7);
    }
  }

  const label = s.frequency === "biweekly" ? "Every 2 weeks" : "Weekly";
  return { label, nextFormatted: formatDateAndTime(d) };
}

const sectionLabels: Record<MeetingSectionKind, string> = {
  segue: "Check-in",
  scorecard: "Scorecard",
  goals: "Quarterly Goals",
  todos: "To-Dos",
  issues: "Issues",
  conclude: "Conclude",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PAST_WEEKS_COUNT = 12;

/** Time options in 15-min steps, 24h "HH:mm". */
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

function formatTimeForDisplay(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Return the last N week-of (Monday) dates before the given weekOf. */
function getPastWeeks(beforeWeekOf: string, count: number): string[] {
  const out: string[] = [];
  let d = new Date(beforeWeekOf + "T12:00:00");
  for (let i = 0; i < count; i++) {
    d.setDate(d.getDate() - 7);
    out.push(isoDateOnly(d));
  }
  return out;
}

export default function MeetingsPage() {
  const { db, weekOf, hasPermission, getMeetingRunStatus, setMeetingRunStatus, getMeetingRatingsAverage, getMeetingTemplate, updateMeetingTemplate } = useMockDb();
  const { toast } = useToast();
  const meetingRatingAvg = getMeetingRatingsAverage();
  const templates = db.meetingTemplates;
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const template = getMeetingTemplate(selectedTemplateId) ?? templates[0];
  const canCancelMeeting = hasPermission("cancel_meeting");
  const meetingStatus = getMeetingRunStatus(weekOf);
  const isCanceled = meetingStatus === "canceled";
  const [showCanceledBanner, setShowCanceledBanner] = useState(isCanceled);
  const [bannerVisible, setBannerVisible] = useState(isCanceled);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<"oneTime" | "recurring">("recurring");
  const [scheduleDate, setScheduleDate] = useState(() => isoDateOnly(new Date()));
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(2);
  const [scheduleFrequency, setScheduleFrequency] = useState<"weekly" | "biweekly">("weekly");
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const dayDropdownRef = useRef<HTMLDivElement>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const [repeatDropdownOpen, setRepeatDropdownOpen] = useState(false);
  const repeatDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false);
    };
    if (actionsOpen) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [actionsOpen]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dayDropdownRef.current && !dayDropdownRef.current.contains(e.target as Node)) setDayDropdownOpen(false);
    };
    if (dayDropdownOpen) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [dayDropdownOpen]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) setTimePickerOpen(false);
    };
    if (timePickerOpen) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [timePickerOpen]);

  useEffect(() => setTimePickerOpen(false), [scheduleType]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (repeatDropdownRef.current && !repeatDropdownRef.current.contains(e.target as Node)) setRepeatDropdownOpen(false);
    };
    if (repeatDropdownOpen) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [repeatDropdownOpen]);

  useEffect(() => {
    if (templates.length > 0 && !templates.some((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const scheduleDisplay = useMemo(() => getScheduleDisplay(template, weekOf), [template, weekOf]);

  const pastWeeks = useMemo(() => getPastWeeks(weekOf, PAST_WEEKS_COUNT), [weekOf]);

  const openScheduleModal = () => {
    const s = template?.schedule;
    if (s?.type === "oneTime") {
      setScheduleType("oneTime");
      setScheduleDate(s.date);
      setScheduleTime(s.time);
    } else if (s?.type === "recurring") {
      setScheduleType("recurring");
      setScheduleDayOfWeek(s.dayOfWeek);
      setScheduleTime(s.time);
      setScheduleFrequency(s.frequency);
    } else {
      setScheduleType("recurring");
      setScheduleDayOfWeek(2);
      setScheduleTime("09:00");
      setScheduleFrequency("weekly");
      setScheduleDate(isoDateOnly(new Date()));
    }
    setScheduleModalOpen(true);
    setActionsOpen(false);
  };

  const saveSchedule = () => {
    if (!selectedTemplateId) return;
    if (scheduleType === "oneTime") {
      updateMeetingTemplate(selectedTemplateId, {
        schedule: { type: "oneTime", date: scheduleDate, time: scheduleTime },
      });
    } else {
      updateMeetingTemplate(selectedTemplateId, {
        schedule: { type: "recurring", dayOfWeek: scheduleDayOfWeek, time: scheduleTime, frequency: scheduleFrequency },
      });
    }
    setScheduleModalOpen(false);
    toast("Schedule saved", "success");
  };

  const runMeetingHref = template ? `/meetings/run${selectedTemplateId ? `?template=${encodeURIComponent(selectedTemplateId)}` : ""}` : "/meetings/run";

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
      <PageTitle subtitle="Run your weekly L10 and keep decisions captured." />

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
                    {templates.length > 1 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor="meeting-template-select" className="sr-only">Meeting template</label>
                        <select
                          id="meeting-template-select"
                          value={selectedTemplateId}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                          className="rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--ring)]"
                        >
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="text-[15px] font-semibold text-[var(--text-primary)]">
                        {template?.title ?? "Weekly Meeting"}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {scheduleDisplay.nextFormatted}
                      </span>
                      <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                        {scheduleDisplay.label}
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

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-secondary)]">
                  <Link href="/todos" className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] hover:underline underline-offset-2">
                    <ListTodo className="size-3.5 shrink-0 opacity-80" />
                    <span className="tabular-nums">{openTodos}</span> to-do{openTodos !== 1 ? "s" : ""} open
                  </Link>
                  <span className="text-[var(--text-muted)]">·</span>
                  <Link href="/issues" className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] hover:underline underline-offset-2">
                    <AlertCircle className="size-3.5 shrink-0 opacity-80" />
                    <span className="tabular-nums">{openIssues}</span> issue{openIssues !== 1 ? "s" : ""} to discuss
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
                    This meeting is canceled for {scheduleDisplay.nextFormatted}.
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {!isCanceled ? (
                    <Link href={runMeetingHref} className={btnPrimary + " inline-flex gap-2"}>
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
                  {canCancelMeeting && (
                    <div className="relative inline-block" ref={actionsRef}>
                      {isCanceled ? (
                        <span className="inline-flex items-center px-3 py-2 text-[13px] font-medium text-[var(--text-muted)]">
                          Meeting is canceled
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setActionsOpen((o) => !o)}
                            className={btnSecondary + " inline-flex gap-2"}
                            aria-expanded={actionsOpen}
                            aria-haspopup="true"
                          >
                            <MoreHorizontal className="size-4" />
                            Actions
                          </button>
                          {actionsOpen && (
                            <div className="absolute left-0 top-full z-10 mt-1 min-w-[160px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-card)]">
                              {canCancelMeeting && (
                                <button
                                  type="button"
                                  onClick={openScheduleModal}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--muted-bg)]"
                                >
                                  <Settings2 className="size-4 shrink-0" />
                                  Edit schedule
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setMeetingRunStatus(weekOf, "canceled");
                                  setActionsOpen(false);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[var(--btn-danger-bg)] hover:bg-[var(--muted-bg)]"
                              >
                                <XCircle className="size-4 shrink-0" />
                                Cancel meeting
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <hr className="my-8 border-0 border-t border-[var(--border)]" aria-hidden />

          <div className={card}>
            <div className="border-b border-[var(--border)] px-5 py-3">
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Past meetings</h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                View agendas, scorecard, and notes from previous weeks.
              </p>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {pastWeeks.map((w) => {
                const status = getMeetingRunStatus(w);
                const feedback = db.meetingFeedback?.[w];
                const isCanceled = status === "canceled";
                return (
                  <li key={w} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      Week of {formatWeek(w)}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={isCanceled ? "warning" : "success"}
                        label={isCanceled ? "Canceled" : "Completed"}
                      />
                      {feedback != null && (
                        <span className="text-[12px] text-[var(--text-muted)]" title="Meeting rating">
                          ★ {feedback.rating}/10
                        </span>
                      )}
                      <Link
                        href={`/meetings/run?week=${encodeURIComponent(w)}${selectedTemplateId ? `&template=${encodeURIComponent(selectedTemplateId)}` : ""}`}
                        className="text-[13px] font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {scheduleModalOpen && template && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="schedule-modal-title"
            >
              <div className="absolute inset-0 bg-black/50" onClick={() => setScheduleModalOpen(false)} aria-hidden />
              <div
                className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
                onKeyDown={(e) => e.key === "Escape" && setScheduleModalOpen(false)}
              >
                <div className="flex items-center justify-between">
                  <h2 id="schedule-modal-title" className="text-[16px] font-semibold text-[var(--text-primary)]">
                    Edit schedule
                  </h2>
                  <button
                    type="button"
                    onClick={() => setScheduleModalOpen(false)}
                    className="rounded-[var(--radius)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
                    aria-label="Close"
                  >
                    <XCircle className="size-5" />
                  </button>
                </div>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  {template.title}
                </p>
                <div className="mt-5 space-y-4">
                  <div>
                    <span className="mb-2 block text-[12px] font-medium text-[var(--text-secondary)]">Frequency</span>
                    <div className="flex gap-2">
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2.5 text-[13px] font-medium transition has-[:checked]:border-[var(--ring)] has-[:checked]:bg-[var(--muted-bg)] has-[:checked]:ring-2 has-[:checked]:ring-[var(--ring)]">
                        <input
                          type="radio"
                          name="scheduleType"
                          checked={scheduleType === "oneTime"}
                          onChange={() => setScheduleType("oneTime")}
                          className="sr-only"
                        />
                        One-time
                      </label>
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2.5 text-[13px] font-medium transition has-[:checked]:border-[var(--ring)] has-[:checked]:bg-[var(--muted-bg)] has-[:checked]:ring-2 has-[:checked]:ring-[var(--ring)]">
                        <input
                          type="radio"
                          name="scheduleType"
                          checked={scheduleType === "recurring"}
                          onChange={() => setScheduleType("recurring")}
                          className="sr-only"
                        />
                        Recurring
                      </label>
                    </div>
                  </div>
                  {scheduleType === "oneTime" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Date</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className={inputBase + " w-full"}
                        />
                      </div>
                      <div ref={timePickerRef} className="relative">
                        <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Time</label>
                        <button
                          type="button"
                          onClick={() => setTimePickerOpen((o) => !o)}
                          className={inputBase + " flex w-full items-center justify-between text-left"}
                          aria-haspopup="listbox"
                          aria-expanded={timePickerOpen}
                          aria-label="Time"
                        >
                          <span>{formatTimeForDisplay(scheduleTime)}</span>
                          <ChevronDown className={`size-4 shrink-0 text-[var(--text-muted)] transition ${timePickerOpen ? "rotate-180" : ""}`} />
                        </button>
                        {timePickerOpen && (
                          <ul
                            role="listbox"
                            className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-card)]"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <li
                                key={t}
                                role="option"
                                aria-selected={scheduleTime === t}
                                onClick={() => {
                                  setScheduleTime(t);
                                  setTimePickerOpen(false);
                                }}
                                className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-[14px] transition ${
                                  scheduleTime === t
                                    ? "bg-[var(--nav-hover-bg)] text-[var(--text-primary)] font-medium"
                                    : "text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)]"
                                }`}
                              >
                                {formatTimeForDisplay(t)}
                                {scheduleTime === t && <Check className="size-4 shrink-0 text-[var(--text-secondary)]" />}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div ref={dayDropdownRef} className="relative">
                        <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Day of week</label>
                        <button
                          type="button"
                          onClick={() => setDayDropdownOpen((o) => !o)}
                          className={inputBase + " flex w-full items-center justify-between text-left"}
                          aria-haspopup="listbox"
                          aria-expanded={dayDropdownOpen}
                          aria-label="Day of week"
                        >
                          <span>{DAY_NAMES[scheduleDayOfWeek]}</span>
                          <ChevronDown className={`size-4 shrink-0 text-[var(--text-muted)] transition ${dayDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {dayDropdownOpen && (
                          <ul
                            role="listbox"
                            className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-card)]"
                            style={{ boxShadow: "var(--shadow-card)" }}
                          >
                            {DAY_NAMES.map((name, i) => (
                              <li
                                key={i}
                                role="option"
                                aria-selected={scheduleDayOfWeek === i}
                                onClick={() => {
                                  setScheduleDayOfWeek(i);
                                  setDayDropdownOpen(false);
                                }}
                                className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-[14px] transition ${
                                  scheduleDayOfWeek === i
                                    ? "bg-[var(--nav-hover-bg)] text-[var(--text-primary)] font-medium"
                                    : "text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)]"
                                }`}
                              >
                                {name}
                                {scheduleDayOfWeek === i && <Check className="size-4 shrink-0 text-[var(--text-secondary)]" />}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div ref={timePickerRef} className="relative">
                          <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Time</label>
                          <button
                            type="button"
                            onClick={() => setTimePickerOpen((o) => !o)}
                            className={inputBase + " flex w-full items-center justify-between text-left"}
                            aria-haspopup="listbox"
                            aria-expanded={timePickerOpen}
                            aria-label="Time"
                          >
                            <span>{formatTimeForDisplay(scheduleTime)}</span>
                            <ChevronDown className={`size-4 shrink-0 text-[var(--text-muted)] transition ${timePickerOpen ? "rotate-180" : ""}`} />
                          </button>
                          {timePickerOpen && (
                            <ul
                              role="listbox"
                              className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-card)]"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <li
                                  key={t}
                                  role="option"
                                  aria-selected={scheduleTime === t}
                                  onClick={() => {
                                    setScheduleTime(t);
                                    setTimePickerOpen(false);
                                  }}
                                  className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-[14px] transition ${
                                    scheduleTime === t
                                      ? "bg-[var(--nav-hover-bg)] text-[var(--text-primary)] font-medium"
                                      : "text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)]"
                                  }`}
                                >
                                  {formatTimeForDisplay(t)}
                                  {scheduleTime === t && <Check className="size-4 shrink-0 text-[var(--text-secondary)]" />}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div ref={repeatDropdownRef} className="relative">
                          <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Repeat</label>
                          <button
                            type="button"
                            onClick={() => setRepeatDropdownOpen((o) => !o)}
                            className={inputBase + " flex w-full items-center justify-between text-left"}
                            aria-haspopup="listbox"
                            aria-expanded={repeatDropdownOpen}
                            aria-label="Repeat"
                          >
                            <span>{scheduleFrequency === "biweekly" ? "Every 2 weeks" : "Weekly"}</span>
                            <ChevronDown className={`size-4 shrink-0 text-[var(--text-muted)] transition ${repeatDropdownOpen ? "rotate-180" : ""}`} />
                          </button>
                          {repeatDropdownOpen && (
                            <ul
                              role="listbox"
                              className="absolute left-0 right-0 top-full z-10 mt-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-card)]"
                            >
                              {(["weekly", "biweekly"] as const).map((freq) => (
                                <li
                                  key={freq}
                                  role="option"
                                  aria-selected={scheduleFrequency === freq}
                                  onClick={() => {
                                    setScheduleFrequency(freq);
                                    setRepeatDropdownOpen(false);
                                  }}
                                  className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-[14px] transition ${
                                    scheduleFrequency === freq
                                      ? "bg-[var(--nav-hover-bg)] text-[var(--text-primary)] font-medium"
                                      : "text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)]"
                                  }`}
                                >
                                  {freq === "biweekly" ? "Every 2 weeks" : "Weekly"}
                                  {scheduleFrequency === freq && <Check className="size-4 shrink-0 text-[var(--text-secondary)]" />}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-center gap-2">
                  <button type="button" onClick={() => setScheduleModalOpen(false)} className={btnSecondary}>
                    Cancel
                  </button>
                  <button type="button" onClick={saveSchedule} className={btnPrimary}>
                    Save schedule
                  </button>
                </div>
              </div>
            </div>
          )}

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
