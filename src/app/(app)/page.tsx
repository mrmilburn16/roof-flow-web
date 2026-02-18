"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Calendar, CheckSquare, Target, AlertCircle, Play, TrendingUp } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { HomeQuickStats } from "@/components/HomeQuickStats";
import { PageTitle, card, cardHeader, cardValue, btnPrimary, btnSecondary } from "@/components/ui";

function formatWeek(weekOf: string) {
  const d = new Date(weekOf + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Default weekly meeting: Tuesday of the week at 9:00 AM. */
function formatMeetingDateAndTime(weekOf: string) {
  const monday = new Date(weekOf + "T12:00:00");
  const tuesday = new Date(monday);
  tuesday.setDate(tuesday.getDate() + 1);
  tuesday.setHours(9, 0, 0, 0);
  const dateStr = tuesday.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const timeStr = tuesday.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dateStr} at ${timeStr}`;
}

export default function HomePage() {
  const { db, weekOf, getMeetingRatingsAverage } = useMockDb();
  const meetingRatingAvg = getMeetingRatingsAverage();

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

  const nextMeetingCard = {
    header: "Next meeting",
    value: stats.meetingTitle,
    sub: formatMeetingDateAndTime(stats.weekOf),
    icon: Calendar,
    href: "/meetings/run",
    label: "Run meeting",
  };

  const otherCards = [
    {
      header: "Open to-dos",
      value: `${stats.openTodosCount} open`,
      sub: null,
      icon: CheckSquare,
      href: "/todos",
      label: "View to-dos",
    },
    {
      header: "Quarterly goals",
      value: stats.offTrackGoalsCount > 0 ? `${stats.offTrackGoalsCount} off track` : "On track",
      sub: `${db.goals.length} total`,
      icon: Target,
      href: "/goals",
      label: "Review goals",
    },
    {
      header: "Open issues",
      value: `${stats.openIssuesCount} to discuss`,
      sub: null,
      icon: AlertCircle,
      href: "/issues",
      label: "View issues",
    },
    {
      header: "Scorecard",
      value: stats.scorecardTotal > 0 ? `${stats.scorecardOnTrack}/${stats.scorecardTotal} on track` : "No KPIs",
      sub: "This week",
      icon: TrendingUp,
      href: "/scorecard",
      label: "View scorecard",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageTitle subtitle="Track to-dos, goals, and issues during the week. Run your weekly meeting to align and decide." />
        <HomeQuickStats
        stats={{
          openTodosCount: stats.openTodosCount,
          offTrackGoalsCount: stats.offTrackGoalsCount,
          openIssuesCount: stats.openIssuesCount,
          scorecardOnTrack: stats.scorecardOnTrack,
          scorecardTotal: stats.scorecardTotal,
        }}
        />
      </div>

      {/* Featured Next meeting + grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Hero card: Next meeting - spans 2 cols on large, primary CTA like competitors */}
        <div className={`${card} flex min-h-[140px] flex-col justify-between p-5 sm:col-span-2`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className={cardHeader}>{nextMeetingCard.header}</div>
              <div className={`${cardValue} mt-2`}>{nextMeetingCard.value}</div>
              {nextMeetingCard.sub && (
                <div className="mt-1 text-[13px] text-[var(--text-muted)]">{nextMeetingCard.sub}</div>
              )}
              {meetingRatingAvg != null && (
                <div className="mt-1 text-[13px] text-[var(--text-muted)]">
                  Avg. meeting rating <span className="font-medium text-[var(--text-primary)]">{meetingRatingAvg}</span>/10
                </div>
              )}
            </div>
            <Calendar className="size-8 shrink-0 text-[var(--text-muted)]" />
          </div>
          <div className="mt-5">
            <Link href={nextMeetingCard.href} className={btnPrimary + " inline-flex gap-2"}>
              <Play className="size-4" />
              {nextMeetingCard.label}
            </Link>
          </div>
        </div>

        {/* To-dos card - sits beside hero on lg */}
        <div className={`${card} flex min-h-[140px] flex-col justify-between p-5`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className={cardHeader}>{otherCards[0].header}</div>
              <div className={`${cardValue} mt-2`}>{otherCards[0].value}</div>
            </div>
            <CheckSquare className="size-5 shrink-0 text-[var(--text-muted)]" />
          </div>
          <div className="mt-5">
            <Link href={otherCards[0].href} className={btnSecondary + " inline-flex gap-2"}>
              {otherCards[0].label}
            </Link>
          </div>
        </div>

        {/* Row 2: Goals, Issues, Scorecard */}
        {otherCards.slice(1, 4).map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.href} className={`${card} flex min-h-[140px] flex-col justify-between p-5`}>
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
                <Link href={c.href} className={btnSecondary + " inline-flex gap-2"}>
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
