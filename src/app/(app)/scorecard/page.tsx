"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { TrendingUp, Calendar, Play, ChevronDown, Check } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { startOfWeek } from "@/lib/mock/mockData";
import { PageTitle, card, inputBase, btnPrimary, btnSecondary, StatusBadge } from "@/components/ui";

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekOf: string) {
  const d = new Date(weekOf + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isGood(_unit: string, value: number, goal: number) {
  return value >= goal;
}

function formatValue(value: number, unit: string) {
  if (unit === "$") return `$${value}`;
  if (unit === "%") return `${value}%`;
  return String(value);
}

const WEEK_OPTIONS_COUNT = 4;

export default function ScorecardPage() {
  const { db, weekOf: currentWeekOf, upsertKpiEntry } = useMockDb();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedWeekOf, setSelectedWeekOf] = useState(currentWeekOf);
  const [weekDropdownOpen, setWeekDropdownOpen] = useState(false);
  const weekDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!weekDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (weekDropdownRef.current && !weekDropdownRef.current.contains(e.target as Node)) {
        setWeekDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [weekDropdownOpen]);

  const weekOptions = useMemo(() => {
    const base = startOfWeek(new Date());
    return Array.from({ length: WEEK_OPTIONS_COUNT }, (_, i) => {
      const d = new Date(base.getTime() - i * 7 * 86400_000);
      return isoDateOnly(d);
    });
  }, []);

  const kpis = useMemo(() => db.kpis, [db.kpis]);
  const userById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of db.users) map.set(u.id, u.name);
    return map;
  }, [db.users]);

  const entryByKpi = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of db.kpiEntries) {
      if (e.weekOf === selectedWeekOf) map.set(e.kpiId, e.value);
    }
    return map;
  }, [db.kpiEntries, selectedWeekOf]);

  const summary = useMemo(() => {
    let onTrack = 0;
    let offTrack = 0;
    let missing = 0;
    for (const k of kpis) {
      const current = entryByKpi.get(k.id);
      if (typeof current !== "number") {
        missing++;
      } else if (isGood(k.unit, current, k.goal)) {
        onTrack++;
      } else {
        offTrack++;
      }
    }
    return { onTrack, offTrack, missing };
  }, [kpis, entryByKpi]);

  const handleSave = (kpiId: string) => {
    const raw = (drafts[kpiId] ?? "").trim();
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    upsertKpiEntry(kpiId, selectedWeekOf, v);
    setDrafts((p) => ({ ...p, [kpiId]: "" }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle
          title="Scorecard"
          subtitle="Track weekly KPIs. Owners update before the meeting."
        />
        <Link href="/meetings/run" className={btnSecondary + " inline-flex gap-2"}>
          <Play className="size-4" />
          Run meeting
        </Link>
      </div>

      {kpis.length === 0 ? (
        <div className={card + " p-10 text-center"}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--muted-bg)]">
            <TrendingUp className="size-6 text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-[var(--text-primary)]">
            No KPIs yet
          </p>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Add scorecard items in settings or seed starter data.
          </p>
        </div>
      ) : (
        <div className={card}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)]">
                  Weekly KPIs
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="relative inline-block" ref={weekDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setWeekDropdownOpen((o) => !o)}
                      className={`${inputBase} flex w-full min-w-[180px] items-center justify-between gap-2 pr-9 text-left text-[13px]`}
                      aria-label="Select week"
                      aria-expanded={weekDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="truncate">
                        {selectedWeekOf === currentWeekOf
                          ? `This week (${formatWeekLabel(selectedWeekOf)})`
                          : formatWeekLabel(selectedWeekOf)}
                      </span>
                    </button>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
                      aria-hidden
                    />
                    {weekDropdownOpen && (
                      <ul
                        className="absolute left-0 top-full z-10 mt-1 min-w-[180px] rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-card)]"
                        role="listbox"
                      >
                        {weekOptions.map((w) => {
                          const label = w === currentWeekOf ? `This week (${formatWeekLabel(w)})` : formatWeekLabel(w);
                          const selected = w === selectedWeekOf;
                          return (
                            <li key={w} role="option" aria-selected={selected}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedWeekOf(w);
                                  setWeekDropdownOpen(false);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--text-primary)] transition hover:bg-[var(--nav-hover-bg)]"
                              >
                                <span className="flex w-4 shrink-0 justify-center">
                                  {selected ? <Check className="size-4 text-[var(--text-primary)]" /> : null}
                                </span>
                                <span className={selected ? "font-medium" : ""}>{label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                    <Calendar className="size-3.5" />
                    {formatWeekLabel(selectedWeekOf)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-[12px]">
                <span className="text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--badge-success-text)]">{summary.onTrack} on</span>
                  {" · "}
                  <span className="font-semibold text-[var(--badge-warning-text)]">{summary.offTrack} off</span>
                  {summary.missing > 0 && (
                    <>
                      {" · "}
                      <span className="font-medium text-[var(--text-muted)]">{summary.missing} missing</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-[1fr_100px_100px_180px] gap-4 border-b border-[var(--border)] bg-[var(--muted-bg)] px-5 py-3 text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              <div>KPI</div>
              <div className="text-right">Goal</div>
              <div className="text-right">This week</div>
              <div className="text-right">Update</div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {kpis.map((k) => {
                const current = entryByKpi.get(k.id);
                const good =
                  typeof current === "number"
                    ? isGood(k.unit, current, k.goal)
                    : null;
                const status =
                  good === null
                    ? ("neutral" as const)
                    : good
                      ? ("success" as const)
                      : ("warning" as const);
                const label = good === null ? "Missing" : good ? "On" : "Off";
                const ownerName = userById.get(k.ownerId) ?? "";

                return (
                  <div
                    key={k.id}
                    className="grid min-w-[640px] grid-cols-[1fr_100px_100px_180px] items-center gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-[var(--text-primary)]">
                        {k.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={status} label={label} />
                        {ownerName && (
                          <span className="text-[12px] text-[var(--text-muted)]">
                            {ownerName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-[14px] text-[var(--text-secondary)]">
                      {formatValue(k.goal, k.unit)}
                    </div>
                    <div className="text-right text-[14px] font-semibold text-[var(--text-primary)]">
                      {typeof current === "number" ? (
                        formatValue(current, k.unit)
                      ) : (
                        <span className="font-normal text-[var(--text-muted)]">—</span>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <input
                        value={drafts[k.id] ?? ""}
                        onChange={(e) =>
                          setDrafts((p) => ({ ...p, [k.id]: e.target.value }))
                        }
                        placeholder="Value"
                        className={`${inputBase} w-20`}
                      />
                      <button
                        onClick={() => handleSave(k.id)}
                        className={btnPrimary}
                        disabled={!drafts[k.id]?.trim()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
