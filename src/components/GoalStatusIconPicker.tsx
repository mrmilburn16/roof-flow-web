"use client";

import type { GoalStatus } from "@/lib/domain";
import { CheckCircle, AlertCircle, CheckSquare } from "lucide-react";

const STATUSES: GoalStatus[] = ["onTrack", "offTrack", "done"];

function label(s: GoalStatus) {
  switch (s) {
    case "onTrack": return "On track";
    case "offTrack": return "Off track";
    case "done": return "Done";
  }
}

/** Option 3 style: icon circles + label. On track = green CheckCircle, Off track = coral AlertCircle, Done = slate CheckSquare (distinct from On track). */
export function GoalStatusIconPicker({
  value,
  onChange,
  ariaLabel = "Goal status",
}: {
  value: GoalStatus;
  onChange: (s: GoalStatus) => void;
  ariaLabel?: string;
}) {
  const icons = {
    onTrack: CheckCircle,
    offTrack: AlertCircle,
    done: CheckSquare,
  };
  const activeCircleClass: Record<GoalStatus, string> = {
    onTrack: "bg-[var(--goal-btn-on-bg)] text-[var(--badge-success-text)] ring-2 ring-[var(--badge-success-text)]",
    offTrack: "bg-[var(--goal-btn-off-bg)] text-[var(--badge-warning-text)] ring-2 ring-[var(--badge-warning-text)]",
    done: "bg-[var(--goal-btn-done-bg)] text-[var(--goal-btn-done-text)] ring-2 ring-[var(--goal-btn-done-text)]",
  };
  const inactiveCircleClass = "bg-[var(--muted-bg)] text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)]";

  const alignments = ["justify-end", "justify-center", "justify-start"] as const;

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={ariaLabel}>
      {STATUSES.map((s, i) => {
        const isActive = value === s;
        const Icon = icons[s];
        return (
          <div key={s} className={`flex ${alignments[i]} min-w-0`}>
            <button
              type="button"
              onClick={() => onChange(s)}
              className="flex flex-col items-center gap-2 rounded-[var(--radius)] p-2 transition active:scale-[0.98]"
              aria-pressed={isActive}
            >
              <span
                key={s === "onTrack" ? (isActive ? "onTrack-active" : "onTrack-inactive") : undefined}
                className={`flex size-12 items-center justify-center rounded-full transition ${
                  isActive ? activeCircleClass[s] : inactiveCircleClass
                } ${s === "onTrack" && isActive ? "[animation:goal-on-track-in_0.35s_ease-out_forwards]" : ""}`}
              >
                <Icon className="size-6" strokeWidth={2.5} />
              </span>
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{label(s)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
