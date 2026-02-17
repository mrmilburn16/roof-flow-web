"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Calendar, CheckSquare, Target, AlertCircle, Play, TrendingUp } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card, cardHeader, cardValue, btnPrimary, btnSecondary } from "@/components/ui";

function formatWeek(weekOf: string) {
  const d = new Date(weekOf + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function HomePage() {
  const { db, weekOf } = useMockDb();

  const stats = useMemo(() => {
    const openTodos = db.todos.filter((t) => t.status === "open");
    const offTrackGoals = db.goals.filter((g) => g.status === "offTrack");
    const openIssues = db.issues.filter((i) => i.status === "open");
    const template = db.meetingTemplates[0];
    const kpisOnTrack = db.kpis.filter((k) => {
      const entry = db.kpiEntries.find((e) => e.kpiId === k.id && e.weekOf === weekOf);
      return entry != null && entry.value >= k.goal;
    }).length;
    const kpisTotal = db.kpis.length;
    return {
      openTodosCount: openTodos.length,
      offTrackGoalsCount: offTrackGoals.length,
      openIssuesCount: openIssues.length,
      meetingTitle: template?.title ?? "Weekly Meeting",
      weekOf,
      weekFormatted: formatWeek(weekOf),
      scorecardOnTrack: kpisOnTrack,
      scorecardTotal: kpisTotal,
    };
  }, [db, weekOf]);

  const cards = [
    {
      header: "Next meeting",
      value: stats.meetingTitle,
      sub: `Week of ${stats.weekFormatted}`,
      icon: Calendar,
      href: "/meetings/run",
      label: "Run meeting",
      primary: true,
    },
    {
      header: "Open to-dos",
      value: `${stats.openTodosCount} open`,
      sub: null,
      icon: CheckSquare,
      href: "/todos",
      label: "View to-dos",
      primary: false,
    },
    {
      header: "Quarterly goals",
      value: stats.offTrackGoalsCount > 0 ? `${stats.offTrackGoalsCount} off track` : "On track",
      sub: `${db.goals.length} total`,
      icon: Target,
      href: "/goals",
      label: "Review goals",
      primary: false,
    },
    {
      header: "Open issues",
      value: `${stats.openIssuesCount} to discuss`,
      sub: null,
      icon: AlertCircle,
      href: "/issues",
      label: "View issues",
      primary: false,
    },
    {
      header: "Scorecard",
      value: stats.scorecardTotal > 0 ? `${stats.scorecardOnTrack}/${stats.scorecardTotal} on track` : "No KPIs",
      sub: `This week`,
      icon: TrendingUp,
      href: "/scorecard",
      label: "View scorecard",
      primary: false,
    },
  ];

  return (
    <div className="space-y-8">
      <PageTitle
        title="Home"
        subtitle="Capture during the week, then run the L10 and resolve."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.href} className={card + " p-5"}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className={cardHeader}>{c.header}</div>
                  <div className={`${cardValue} mt-2`}>{c.value}</div>
                  {c.sub && (
                    <div className="mt-1 text-[13px] text-[var(--text-muted)]">{c.sub}</div>
                  )}
                </div>
                <Icon className="size-5 shrink-0 text-[var(--text-muted)]" />
              </div>
              <div className="mt-5">
                <Link
                  href={c.href}
                  className={c.primary ? btnPrimary + " inline-flex gap-2" : btnSecondary + " inline-flex gap-2"}
                >
                  {c.primary && <Play className="size-4" />}
                  {c.label}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
