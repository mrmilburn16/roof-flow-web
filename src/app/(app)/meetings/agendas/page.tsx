"use client";

import Link from "next/link";
import { Clock, Calendar, Play, ListTodo, Plus, Pencil } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card, btnPrimary, btnSecondary } from "@/components/ui";

const sectionLabels: Record<string, string> = {
  segue: "Check-in",
  scorecard: "Scorecard",
  goals: "Quarterly Goals",
  todos: "To-Dos",
  issues: "Issues",
  conclude: "Conclude",
};

const sectionDescriptions: Record<string, string> = {
  segue: "Quick personal and professional updates. Keep it brief.",
  scorecard: "Review KPIs and weekly numbers.",
  goals: "Review 90-day goals and on/off track status.",
  todos: "Review and assign to-dos.",
  issues: "Discuss and resolve issues (IDS).",
  conclude: "Recap to-dos, confirm owners, rate the meeting.",
};

function totalMinutes(sections: { durationMinutes: number }[]) {
  return sections.reduce((sum, s) => sum + s.durationMinutes, 0);
}

export default function AgendasPage() {
  const { db, hasPermission } = useMockDb();
  const templates = db.meetingTemplates;
  const canEdit = hasPermission("manage_team");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle
          title="Agendas"
          subtitle="Templates for your meetings. Each section has a suggested time so you stay on track."
        />
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Link href="/meetings/agendas/new" className={btnPrimary + " inline-flex gap-2"}>
              <Plus className="size-4" />
              Create template
            </Link>
          )}
          <Link href="/meetings" className={btnSecondary}>
            Back to Meetings
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        {templates.length === 0 ? (
          <div className={card + " p-10 text-center"}>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--muted-bg)]">
              <ListTodo className="size-6 text-[var(--text-muted)]" />
            </div>
            <p className="mt-4 text-[15px] font-medium text-[var(--text-primary)]">
              No agendas yet
            </p>
            <p className="mt-1 text-[14px] text-[var(--text-muted)]">
              {canEdit ? "Create a template to get started." : "Add templates in settings or seed starter data."}
            </p>
            {canEdit ? (
              <Link href="/meetings/agendas/new" className={btnPrimary + " mt-6 inline-flex gap-2"}>
                <Plus className="size-4" />
                Create template
              </Link>
            ) : (
              <Link href="/meetings/run" className={btnPrimary + " mt-6 inline-flex gap-2"}>
              <Play className="size-4" />
                Run meeting
              </Link>
            )}
          </div>
        ) : (
          templates.map((t) => {
            const total = totalMinutes(t.sections);
            return (
              <div key={t.id} className={card}>
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-[var(--text-muted)]" />
                      <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                        {t.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[var(--muted-bg)] px-2.5 py-1 text-[12px] font-medium text-[var(--text-secondary)]">
                        {total} min total
                      </span>
                      {canEdit && (
                        <Link
                          href={`/meetings/agendas/${t.id}/edit`}
                          className={btnSecondary + " inline-flex gap-1.5 text-[13px]"}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {t.sections.map((s, i) => (
                    <li key={s.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <span className="text-[14px] font-medium text-[var(--text-primary)]">
                            {i + 1}. {sectionLabels[s.kind] ?? s.title}
                          </span>
                          <p className="mt-0.5 text-[12px] leading-snug text-[var(--text-muted)]">
                            {sectionDescriptions[s.kind] ?? ""}
                          </p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                          <Clock className="size-3.5" />
                          {s.durationMinutes} min
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[var(--border)] px-5 py-4">
                  <Link href="/meetings/run" className={btnPrimary + " inline-flex gap-2"}>
                    <Play className="size-4" />
                    Run this meeting
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
