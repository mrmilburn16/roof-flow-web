"use client";

import { CheckSquare, Target, AlertCircle, TrendingUp } from "lucide-react";
import { card } from "@/components/ui";

export type HomeQuickStatsData = {
  openTodosCount: number;
  offTrackGoalsCount: number;
  openIssuesCount: number;
  scorecardOnTrack: number;
  scorecardTotal: number;
};

const iconCls = "size-4 shrink-0 opacity-90";

export function HomeQuickStats({ stats }: { stats: HomeQuickStatsData }) {
  const scoreVariant =
    stats.scorecardTotal <= 0
      ? ("neutral" as const)
      : stats.scorecardOnTrack >= stats.scorecardTotal
        ? ("success" as const)
        : stats.scorecardOnTrack <= 0
          ? ("warning" as const)
          : ("progress" as const);

  const scoreLabel =
    stats.scorecardTotal > 0
      ? `${stats.scorecardOnTrack}/${stats.scorecardTotal} on track`
      : "No KPIs";

  return (
    <div className={`${card} grid grid-cols-2 gap-4 px-4 py-3 sm:grid-cols-4`}>
      <span className="quickstat justify-center justify-self-center sm:justify-self-stretch" data-variant="neutral">
        <span className="quickstat-icon" aria-hidden>
          <CheckSquare className={iconCls} />
        </span>
        <span className="tabular-nums">{stats.openTodosCount}</span>
        <span className="font-medium opacity-90">
          to-do{stats.openTodosCount !== 1 ? "s" : ""} open
        </span>
      </span>

      {stats.offTrackGoalsCount > 0 ? (
        <span className="quickstat justify-center justify-self-center sm:justify-self-stretch" data-variant="warning">
          <span className="quickstat-icon" aria-hidden>
            <Target className={iconCls} />
          </span>
          <span className="tabular-nums">{stats.offTrackGoalsCount}</span>
          <span className="font-medium opacity-90">
            goal{stats.offTrackGoalsCount !== 1 ? "s" : ""} off track
          </span>
        </span>
      ) : (
        <span className="quickstat justify-center justify-self-center sm:justify-self-stretch" data-variant="success">
          <span className="quickstat-icon" aria-hidden>
            <Target className={iconCls} />
          </span>
          <span className="font-medium opacity-90">Goals on track</span>
        </span>
      )}

      <span className="quickstat justify-center justify-self-center sm:justify-self-stretch" data-variant="info">
        <span className="quickstat-icon" aria-hidden>
          <AlertCircle className={iconCls} />
        </span>
        <span className="tabular-nums">{stats.openIssuesCount}</span>
        <span className="font-medium opacity-90">
          issue{stats.openIssuesCount !== 1 ? "s" : ""} to discuss
        </span>
      </span>

      <span className="quickstat justify-center justify-self-center sm:justify-self-stretch" data-variant={scoreVariant}>
        <span className="quickstat-icon" aria-hidden>
          <TrendingUp className={iconCls} />
        </span>
        <span className="font-medium opacity-90">{scoreLabel}</span>
      </span>
    </div>
  );
}
