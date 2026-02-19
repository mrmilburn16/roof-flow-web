"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { MeetingSectionKind } from "@/lib/domain";
import { Plus, Copy, Check, Square } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card, inputBase, btnPrimary, btnSecondary, StatusBadge } from "@/components/ui";
import { GoalStatusIconPicker } from "@/components/GoalStatusIconPicker";

function formatWeek(weekOf: string) {
  const d = new Date(weekOf + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatValue(value: number, unit: string) {
  if (unit === "$") return `$${value}`;
  if (unit === "%") return `${value}%`;
  return String(value);
}

function formatDueDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const msPerDay = 86400_000;
  const days = Math.round((dueDay.getTime() - today.getTime()) / msPerDay);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days} days`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function priorityStyle(priority: number): string {
  if (priority === 1) return "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]";
  return "bg-[var(--muted-bg)] text-[var(--text-secondary)]";
}

const sectionLabels: Record<MeetingSectionKind, string> = {
  segue: "Check-in",
  headlines: "Headlines",
  rockReview: "Rock Review",
  scorecard: "Scorecard",
  goals: "Quarterly Goals",
  todos: "To-Dos",
  issues: "Issues",
  conclude: "Conclude",
};

function isValidWeekParam(s: string | null): s is string {
  if (!s || typeof s !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function MeetingRunContent() {
  const searchParams = useSearchParams();
  const templateIdFromUrl = searchParams.get("template");
  const weekParam = searchParams.get("week");
  const {
    db,
    weekOf: currentWeekOf,
    createTodo,
    toggleTodo,
    createIssue,
    resolveIssue,
    setGoalStatus,
    upsertKpiEntry,
    setMeetingNotes,
    setMeetingFeedback,
    getMeetingTemplate,
  } = useMockDb();

  const weekOf = isValidWeekParam(weekParam) ? weekParam : currentWeekOf;
  const isViewingPastWeek = weekParam != null && weekOf < currentWeekOf;

  const meetingNotes = db.meetingNotes;
  const existingFeedback = db.meetingFeedback?.[weekOf];

  const template = useMemo(
    () => getMeetingTemplate(templateIdFromUrl ?? undefined) ?? db.meetingTemplates[0],
    [getMeetingTemplate, templateIdFromUrl, db.meetingTemplates],
  );
  const order = template?.sections?.map((s) => s.kind) ?? [];
  const sectionDurations = useMemo(() => {
    const map = new Map<MeetingSectionKind, number>();
    for (const s of template?.sections ?? []) map.set(s.kind, s.durationMinutes);
    return map;
  }, [template?.sections]);
  const [section, setSection] = useState<MeetingSectionKind>(order[0] ?? "segue");
  const [kpiDrafts, setKpiDrafts] = useState<Record<string, string>>({});
  const [showRecap, setShowRecap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recapRating, setRecapRating] = useState<number | "">(existingFeedback?.rating ?? "");
  const [recapComment, setRecapComment] = useState(existingFeedback?.comment ?? "");
  const [sendRecapToMe, setSendRecapToMe] = useState(true);
  const [postRecapToTeams, setPostRecapToTeams] = useState(false);
  const [recapSending, setRecapSending] = useState(false);
  const [recapSendError, setRecapSendError] = useState<string | null>(null);
  const [microsoftStatus, setMicrosoftStatus] = useState<{
    connected: boolean;
    teamsChannelId: string | null;
  } | null>(null);

  const openTodos = useMemo(
    () => db.todos.filter((t) => t.status === "open"),
    [db.todos],
  );
  const openIssues = useMemo(
    () =>
      db.issues
        .filter((i) => i.status === "open")
        .sort((a, b) => a.priority - b.priority),
    [db.issues],
  );
  const kpiValueById = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of db.kpiEntries)
      if (e.weekOf === weekOf) map.set(e.kpiId, e.value);
    return map;
  }, [db.kpiEntries, weekOf]);

  const userById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of db.users) map.set(u.id, u.name);
    return map;
  }, [db.users]);

  const recapText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`${template?.title ?? "Weekly Meeting"} — Week of ${weekOf}`);
    lines.push("");
    if (meetingNotes.trim()) {
      lines.push("NOTES");
      lines.push(meetingNotes.trim());
      lines.push("");
    }
    const open = db.todos.filter((t) => t.status === "open");
    if (open.length > 0) {
      lines.push("OPEN TO-DOS");
      open.forEach((t) => {
        const owner = t.ownerId ? (userById.get(t.ownerId) ?? t.ownerId) : "Unassigned";
        lines.push(`• ${t.title} (${owner})`);
      });
      lines.push("");
    }
    const resolved = db.issues.filter((i) => i.status === "resolved");
    if (resolved.length > 0) {
      lines.push("RESOLVED THIS SESSION");
      resolved.forEach((i) => lines.push(`• ${i.title}`));
    }
    return lines.join("\n");
  }, [template?.title, weekOf, meetingNotes, db.todos, db.issues, userById]);

  const handleCopyRecap = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(recapText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      setCopied(false);
    }
  }, [recapText]);

  useEffect(() => {
    if (showRecap) {
      setRecapRating(existingFeedback?.rating ?? "");
      setRecapComment(existingFeedback?.comment ?? "");
      setRecapSendError(null);
    }
  }, [showRecap, existingFeedback?.rating, existingFeedback?.comment]);

  useEffect(() => {
    if (!showRecap) return;
    let cancelled = false;
    fetch("/api/microsoft/status")
      .then((res) => res.json())
      .then((data: { connected?: boolean; teamsChannelId?: string | null }) => {
        if (!cancelled)
          setMicrosoftStatus({
            connected: Boolean(data?.connected),
            teamsChannelId: data?.teamsChannelId ?? null,
          });
      })
      .catch(() => {
        if (!cancelled) setMicrosoftStatus({ connected: false, teamsChannelId: null });
      });
    return () => {
      cancelled = true;
    };
  }, [showRecap]);

  const handleRecapDone = useCallback(async () => {
    const r = typeof recapRating === "number" ? recapRating : Number(recapRating);
    if (Number.isFinite(r) && r >= 1 && r <= 10) {
      setMeetingFeedback(weekOf, Math.round(r), recapComment.trim() || undefined);
    }
    const doEmail = sendRecapToMe && microsoftStatus?.connected;
    const doTeams = postRecapToTeams && microsoftStatus?.connected && microsoftStatus?.teamsChannelId;
    if (doEmail || doTeams) {
      setRecapSending(true);
      setRecapSendError(null);
      try {
        const subject = `${template?.title ?? "L10"} — Week of ${formatWeek(weekOf)}`;
        const res = await fetch("/api/microsoft/send-recap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject,
            body: recapText,
            sendCopyToMe: doEmail,
            postToTeams: doTeams,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok && data?.error) {
          setRecapSendError(data.error);
          return;
        }
      } catch (err) {
        setRecapSendError(err instanceof Error ? err.message : "Failed to send recap");
        return;
      } finally {
        setRecapSending(false);
      }
    }
    setShowRecap(false);
  }, [
    recapRating,
    recapComment,
    weekOf,
    setMeetingFeedback,
    sendRecapToMe,
    postRecapToTeams,
    microsoftStatus,
    template?.title,
    recapText,
  ]);

  return (
    <div className="space-y-6">
      {isViewingPastWeek && (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Viewing past meeting.</span>
          {" "}
          <Link href="/meetings" className="font-medium underline-offset-4 hover:underline">
            Back to meetings
          </Link>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle subtitle={`${template?.title ?? "Weekly Meeting"} · Week of ${formatWeek(weekOf)}`} />
        <div className="flex flex-wrap gap-2">
          <button
            className={btnSecondary}
            onClick={() => createIssue("New issue…")}
          >
            <Plus className="size-4" />
            Issue
          </button>
          <button
            className={btnSecondary}
            onClick={() => createTodo("New to-do…")}
          >
            <Plus className="size-4" />
            To-Do
          </button>
          <button
            className={btnPrimary}
            onClick={() => setShowRecap(true)}
          >
            Finish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr_300px]">
        {/* Agenda */}
        <aside className={card}>
          <div className="border-b border-[var(--border)] px-4 pt-3 pb-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Agenda
            </div>
          </div>
          <div className="flex flex-col gap-0.5 p-2">
            {(order.length
              ? order
              : (Object.keys(sectionLabels) as MeetingSectionKind[])
            ).map((k) => {
              const active = section === k;
              const mins = sectionDurations.get(k);
              return (
                <button
                  key={k}
                  onClick={() => setSection(k)}
                  className={[
                    "flex w-full items-center justify-between rounded-[var(--radius)] px-3 py-2.5 text-left text-[14px] font-medium transition",
                    active
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  <span>{sectionLabels[k]}</span>
                  {mins != null && (
                    <span
                      className={
                        active
                          ? "text-[12px] text-inherit opacity-90"
                          : "text-[12px] opacity-80"
                      }
                    >
                      {mins === 1 ? "1 min" : `${mins} mins`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Section content */}
        <section className={card}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">
              {sectionLabels[section]}
            </div>
          </div>
          <div className="p-5">
            {section === "segue" ? (
              <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
                Quick personal and professional updates. Keep it brief.
              </p>
            ) : null}

            {section === "headlines" ? (
              <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
                Quick wins and updates from each person. About 90 seconds per person. Share a headline, not a full report.
              </p>
            ) : null}

            {section === "rockReview" ? (
              <div className="space-y-4">
                {db.goals.length === 0 ? (
                  <p className="text-[14px] text-[var(--text-muted)]">
                    No Rocks yet. Add quarterly goals on the Goals page to review them here.
                  </p>
                ) : db.goals.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-[var(--radius)] border border-[var(--border)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[var(--text-primary)]">
                          {g.title}
                        </div>
                        <div className="mt-1 text-[13px] text-[var(--text-muted)]">
                          Due {formatDueDate(g.dueDate)}
                          {userById.get(g.ownerId) && ` · ${userById.get(g.ownerId)}`}
                        </div>
                        {g.notes?.trim() && (
                          <p className="mt-2 text-[13px] leading-snug text-[var(--text-secondary)]">
                            {g.notes}
                          </p>
                        )}
                      </div>
                      <StatusBadge
                        status={
                          g.status === "onTrack"
                            ? "success"
                            : g.status === "offTrack"
                              ? "warning"
                              : "done"
                        }
                        label={
                          g.status === "onTrack"
                            ? "On track"
                            : g.status === "offTrack"
                              ? "Off track"
                              : "Done"
                        }
                      />
                    </div>
                    <div className="mt-4">
                      <GoalStatusIconPicker
                        value={g.status}
                        onChange={(s) => setGoalStatus(g.id, s)}
                        ariaLabel={`Status for ${g.title}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {section === "scorecard" ? (
              <div className="space-y-4">
                {db.kpis.length === 0 ? (
                  <p className="text-[14px] text-[var(--text-muted)]">
                    No KPIs yet. Add them in Settings or seed starter data.
                  </p>
                ) : db.kpis.map((k) => {
                  const current = kpiValueById.get(k.id);
                  const good =
                    typeof current === "number" ? current >= k.goal : null;
                  const status =
                    good === null
                      ? ("neutral" as const)
                      : good
                        ? ("success" as const)
                        : ("warning" as const);
                  const label = good === null ? "Missing" : good ? "On" : "Off";
                  return (
                    <div
                      key={k.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[var(--text-primary)]">
                          {k.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-[13px] text-[var(--text-muted)]">
                            Goal {formatValue(k.goal, k.unit)}
                          </span>
                          {userById.get(k.ownerId) && (
                            <span className="text-[12px] text-[var(--text-muted)]">
                              {userById.get(k.ownerId)}
                            </span>
                          )}
                          <StatusBadge status={status} label={label} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          value={kpiDrafts[k.id] ?? (typeof current === "number" ? String(current) : "")}
                          onChange={(e) =>
                            setKpiDrafts((p) => ({ ...p, [k.id]: e.target.value }))
                          }
                          placeholder="Value"
                          className={`${inputBase} w-24`}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            const v = Number(
                              (e.target as HTMLInputElement).value.trim(),
                            );
                            if (!Number.isFinite(v)) return;
                            upsertKpiEntry(k.id, weekOf, v);
                            setKpiDrafts((p) => ({ ...p, [k.id]: "" }));
                          }}
                        />
                        <button
                          className={btnPrimary}
                          onClick={() => {
                            const raw = (kpiDrafts[k.id] ?? "").trim();
                            const v = Number(raw);
                            if (!Number.isFinite(v)) return;
                            upsertKpiEntry(k.id, weekOf, v);
                            setKpiDrafts((p) => ({ ...p, [k.id]: "" }));
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                })}
                {db.kpis.length > 0 && (
                  <p className="text-[13px] text-[var(--text-muted)]">
                    Press Enter in a value field to save quickly.
                  </p>
                )}
              </div>
            ) : null}

            {section === "goals" ? (
              <div className="space-y-4">
                {db.goals.length === 0 ? (
                  <p className="text-[14px] text-[var(--text-muted)]">
                    No quarterly goals yet. Add them on the Goals page.
                  </p>
                ) : db.goals.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-[var(--radius)] border border-[var(--border)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[var(--text-primary)]">
                          {g.title}
                        </div>
                        <div className="mt-1 text-[13px] text-[var(--text-muted)]">
                          Due {formatDueDate(g.dueDate)}
                          {userById.get(g.ownerId) && ` · ${userById.get(g.ownerId)}`}
                        </div>
                        {g.notes?.trim() && (
                          <p className="mt-2 text-[13px] leading-snug text-[var(--text-secondary)]">
                            {g.notes}
                          </p>
                        )}
                      </div>
                        <StatusBadge
                        status={
                          g.status === "onTrack"
                            ? "success"
                            : g.status === "offTrack"
                              ? "warning"
                              : "done"
                        }
                        label={
                          g.status === "onTrack"
                            ? "On track"
                            : g.status === "offTrack"
                              ? "Off track"
                              : "Done"
                        }
                      />
                    </div>
                    <div className="mt-4">
                      <GoalStatusIconPicker
                        value={g.status}
                        onChange={(s) => setGoalStatus(g.id, s)}
                        ariaLabel={`Status for ${g.title}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {section === "todos" ? (
              <div className="space-y-2">
                {openTodos.length === 0 ? (
                  <p className="text-[14px] text-[var(--text-muted)]">No open To-Dos.</p>
                ) : (
                  openTodos.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start gap-4 rounded-[var(--radius)] border border-[var(--border)] p-4 transition hover:bg-[var(--muted-bg)]"
                    >
                      <button
                        type="button"
                        className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTodo(t.id);
                        }}
                        title="Mark done"
                        aria-label={`Mark “${t.title}” as done`}
                      >
                        <Square className="size-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium text-[var(--text-primary)]">
                          {t.title}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
                          {t.dueDate && <span>Due {formatDueDate(t.dueDate)}</span>}
                          {t.ownerId && userById.get(t.ownerId) && (
                            <>
                              {t.dueDate && <span>·</span>}
                              <span>{userById.get(t.ownerId)}</span>
                            </>
                          )}
                          {t.source === "slack" && t.sourceMeta && (
                            <>
                              {(t.dueDate || t.ownerId) && <span>·</span>}
                              <span>From Slack{t.sourceMeta.slackUserDisplayName ? ` · @${t.sourceMeta.slackUserDisplayName}` : ""}</span>
                              {t.sourceMeta.slackMessageUrl && (
                                <a href={t.sourceMeta.slackMessageUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--badge-info-text)] hover:underline">
                                  View in Slack
                                </a>
                              )}
                            </>
                          )}
                        </div>
                        {t.notes?.trim() && (
                          <p className="mt-1 text-[13px] leading-snug text-[var(--text-secondary)]">
                            {t.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {section === "issues" ? (
              <div className="space-y-2">
                {openIssues.length === 0 ? (
                  <p className="text-[14px] text-[var(--text-muted)]">No open issues.</p>
                ) : (
                  openIssues.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-start gap-4 rounded-[var(--radius)] border border-[var(--border)] p-4"
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
                        {i.notes?.trim() && (
                          <p className="mt-1 max-w-2xl text-[13px] leading-snug text-[var(--text-secondary)] line-clamp-3">
                            {i.notes}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={btnSecondary + " shrink-0"}
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveIssue(i.id);
                        }}
                      >
                        Resolve
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {section === "conclude" ? (
              <div className="space-y-4">
                <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  Recap to-dos, confirm owners, and rate the meeting. Use
                  <strong className="text-[var(--text-primary)]"> Finish</strong> above to open the recap and copy it.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* Notes */}
        <aside className={card}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">Notes</div>
          </div>
          <div className="p-5">
            <textarea
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="Capture decisions, context, and takeaways here…"
              className={`${inputBase} min-h-[320px] resize-y outline-none transition-none focus:border-[var(--input-border)]`}
            />
            <p className="mt-2 text-[12px] text-[var(--text-muted)]">
              Notes stored per meeting once Firestore is connected.
            </p>
          </div>
        </aside>
      </div>

      {/* Recap modal */}
      {showRecap ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowRecap(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="recap-title"
        >
          <div
            className={`${card} max-h-[85vh] w-full max-w-lg overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 id="recap-title" className="text-[15px] font-semibold text-[var(--text-primary)]">
                Meeting recap
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                Week of {formatWeek(weekOf)}
              </p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {recapText || "No notes or to-dos yet."}
              </pre>
            </div>
            <div className="border-t border-[var(--border)] px-5 py-4 space-y-4">
              <div>
                <label htmlFor="recap-rating" className="block text-[13px] font-medium text-[var(--text-primary)]">
                  Rate this meeting (1–10)
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <input
                    id="recap-rating"
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    value={recapRating === "" ? "" : recapRating}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : Number(e.target.value);
                      setRecapRating(v);
                    }}
                    className={`${inputBase} w-20`}
                    placeholder="—"
                  />
                  <input
                    type="text"
                    value={recapComment}
                    onChange={(e) => setRecapComment(e.target.value)}
                    placeholder="Optional comment"
                    className={`${inputBase} min-w-[180px] flex-1`}
                  />
                </div>
              </div>
              {microsoftStatus?.connected && (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={sendRecapToMe}
                      onChange={(e) => setSendRecapToMe(e.target.checked)}
                      className="rounded border-[var(--border)]"
                    />
                    Send recap to my email
                  </label>
                  {microsoftStatus?.teamsChannelId && (
                    <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={postRecapToTeams}
                        onChange={(e) => setPostRecapToTeams(e.target.checked)}
                        className="rounded border-[var(--border)]"
                      />
                      Post recap to Teams channel
                    </label>
                  )}
                </div>
              )}
              {recapSendError && (
                <p className="text-[13px] text-[var(--badge-warning-text)]">
                  {recapSendError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyRecap}
                  className={btnSecondary + " flex items-center gap-2"}
                  disabled={recapSending}
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy to clipboard
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRecapDone()}
                  className={btnPrimary}
                  disabled={recapSending}
                >
                  {recapSending ? "Sending…" : "Done"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MeetingRunPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--text-muted)]">Loading…</div>}>
      <MeetingRunContent />
    </Suspense>
  );
}
