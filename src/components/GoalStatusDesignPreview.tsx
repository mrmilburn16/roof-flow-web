"use client";

import { useState } from "react";
import type { GoalStatus } from "@/lib/domain";
import {
  goalStatusButtonBase,
  goalStatusActive,
  goalStatusInactive,
} from "@/components/ui";
import { CheckCircle, AlertCircle, Circle } from "lucide-react";

const STATUSES: GoalStatus[] = ["onTrack", "offTrack", "done"];

function label(s: GoalStatus) {
  switch (s) {
    case "onTrack": return "On track";
    case "offTrack": return "Off track";
    case "done": return "Done";
  }
}

/** Option 1: Refined pills (current) */
function Option1RefinedPills({
  value,
  onChange,
}: {
  value: GoalStatus;
  onChange: (s: GoalStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
      {STATUSES.map((s) => {
        const isActive = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={
              isActive
                ? `${goalStatusButtonBase} ${goalStatusActive[s]}`
                : `${goalStatusButtonBase} ${goalStatusInactive}`
            }
            aria-pressed={isActive}
          >
            {label(s)}
          </button>
        );
      })}
    </div>
  );
}

/** Option 2: Soft chips — no border on selected, light grey unselected */
function Option2SoftChips({
  value,
  onChange,
}: {
  value: GoalStatus;
  onChange: (s: GoalStatus) => void;
}) {
  const activeClass: Record<GoalStatus, string> = {
    onTrack: "bg-[var(--goal-btn-on-bg)] text-[var(--badge-success-text)]",
    offTrack: "bg-[var(--goal-btn-off-bg)] text-[var(--badge-warning-text)]",
    done: "bg-[var(--goal-btn-done-bg)] text-[var(--badge-neutral-text)]",
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
      {STATUSES.map((s) => {
        const isActive = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={
              "inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition active:scale-[0.98] " +
              (isActive
                ? activeClass[s] + " border-0"
                : "border-0 bg-[var(--muted-bg)] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)]")
            }
            aria-pressed={isActive}
          >
            {label(s)}
          </button>
        );
      })}
    </div>
  );
}

/** Option 3: Icon + label circles */
function Option3IconCircles({
  value,
  onChange,
}: {
  value: GoalStatus;
  onChange: (s: GoalStatus) => void;
}) {
  const icons = {
    onTrack: CheckCircle,
    offTrack: AlertCircle,
    done: Circle,
  };
  const activeCircleClass: Record<GoalStatus, string> = {
    onTrack: "bg-[var(--goal-btn-on-bg)] text-[var(--badge-success-text)] ring-2 ring-[var(--badge-success-text)] ring-offset-2",
    offTrack: "bg-[var(--goal-btn-off-bg)] text-[var(--badge-warning-text)] ring-2 ring-[var(--badge-warning-text)] ring-offset-2",
    done: "bg-[var(--goal-btn-done-bg)] text-[var(--badge-neutral-text)] ring-2 ring-[var(--badge-neutral-text)] ring-offset-2",
  };
  const inactiveCircleClass = "bg-[var(--muted-bg)] text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)]";
  return (
    <div className="flex flex-wrap gap-8" role="group" aria-label="Status">
      {STATUSES.map((s) => {
        const isActive = value === s;
        const Icon = icons[s];
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="flex flex-col items-center gap-2 rounded-[var(--radius)] p-2 transition active:scale-[0.98]"
            aria-pressed={isActive}
          >
            <span
              className={`flex size-12 items-center justify-center rounded-full transition ${
                isActive ? activeCircleClass[s] : inactiveCircleClass
              }`}
            >
              <Icon className="size-6" strokeWidth={2.5} />
            </span>
            <span className="text-[12px] font-medium text-[var(--text-primary)]">{label(s)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Option 4: Segmented bar */
function Option4SegmentedBar({
  value,
  onChange,
}: {
  value: GoalStatus;
  onChange: (s: GoalStatus) => void;
}) {
  const activeClass: Record<GoalStatus, string> = {
    onTrack: "bg-[var(--goal-btn-on-bg)] text-[var(--badge-success-text)]",
    offTrack: "bg-[var(--goal-btn-off-bg)] text-[var(--badge-warning-text)]",
    done: "bg-[var(--goal-btn-done-bg)] text-[var(--badge-neutral-text)]",
  };
  return (
    <div
      className="inline-flex rounded-[var(--radius)] border border-[var(--border)] overflow-hidden bg-[var(--muted-bg)]"
      role="group"
      aria-label="Status"
    >
      {STATUSES.map((s) => {
        const isActive = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`min-w-0 flex-1 border-0 border-r border-[var(--border)] last:border-r-0 px-4 py-2.5 text-[13px] font-medium transition active:scale-[0.98] ${
              isActive ? activeClass[s] : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)]"
            }`}
            aria-pressed={isActive}
          >
            {label(s)}
          </button>
        );
      })}
    </div>
  );
}

/** Option 5: Dropdown */
function Option5Dropdown({
  value,
  onChange,
}: {
  value: GoalStatus;
  onChange: (s: GoalStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeClass: Record<GoalStatus, string> = {
    onTrack: "bg-[var(--goal-btn-on-bg)] text-[var(--badge-success-text)] border-[var(--badge-success-text)]",
    offTrack: "bg-[var(--goal-btn-off-bg)] text-[var(--badge-warning-text)] border-[var(--badge-warning-text)]",
    done: "bg-[var(--goal-btn-done-bg)] text-[var(--badge-neutral-text)] border-[var(--badge-neutral-text)]",
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2.5 text-[13px] font-medium transition ${activeClass[value]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${label(value)}. Click to change.`}
      >
        {label(value)}
        <svg className="size-3.5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
          <ul
            className="absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-card)]"
            role="listbox"
          >
            {STATUSES.map((s) => (
              <li key={s} role="option" aria-selected={value === s}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-[13px] font-medium transition hover:bg-[var(--muted-bg)] ${
                    value === s
                      ? s === "onTrack"
                        ? "bg-[var(--goal-btn-on-bg)] text-[var(--badge-success-text)]"
                        : s === "offTrack"
                          ? "bg-[var(--goal-btn-off-bg)] text-[var(--badge-warning-text)]"
                          : "bg-[var(--goal-btn-done-bg)] text-[var(--badge-neutral-text)]"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {label(s)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const OPTIONS: { title: string; Component: React.ComponentType<{ value: GoalStatus; onChange: (s: GoalStatus) => void }> }[] = [
  { title: "Option 1: Refined pills", Component: Option1RefinedPills },
  { title: "Option 2: Soft chips (no border when selected)", Component: Option2SoftChips },
  { title: "Option 3: Icon + label circles", Component: Option3IconCircles },
  { title: "Option 4: Segmented bar", Component: Option4SegmentedBar },
  { title: "Option 5: Dropdown", Component: Option5Dropdown },
];

export function GoalStatusDesignPreview() {
  const [values, setValues] = useState<Record<number, GoalStatus>>({
    0: "onTrack",
    1: "offTrack",
    2: "done",
    3: "onTrack",
    4: "offTrack",
  });

  return (
    <div className="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] bg-[var(--muted-bg)] p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Status control design options (preview)
      </h3>
      <p className="mt-1 text-[12px] text-[var(--text-muted)]">
        Click each control to change status. Pick one to use in the app.
      </p>
      <div className="mt-4 space-y-5">
        {OPTIONS.map((opt, i) => {
          const Value = values[i] ?? "onTrack";
          const Component = opt.Component;
          return (
            <div
              key={i}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">
                {opt.title}
              </div>
              <div className="text-[14px] font-medium text-[var(--text-primary)]">
                Example goal: Hit Q1 revenue target
              </div>
              <div className="mt-3">
                <Component
                  value={Value}
                  onChange={(s) => setValues((prev) => ({ ...prev, [i]: s }))}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
