"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { TrendingUp, Calendar, Play, ChevronDown, Check, Plus, Pencil, Trash2, X } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { startOfWeek } from "@/lib/mock/mockData";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, inputBase, btnPrimary, btnSecondary, StatusBadge } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

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
const UNIT_OPTIONS = ["count", "$", "%"];

export default function ScorecardPage() {
  const { db, weekOf: currentWeekOf, upsertKpiEntry, createKpi, updateKpi, deleteKpi, hasPermission } = useMockDb();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedWeekOf, setSelectedWeekOf] = useState(currentWeekOf);
  const [weekDropdownOpen, setWeekDropdownOpen] = useState(false);
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [kpiTitle, setKpiTitle] = useState("");
  const [kpiGoal, setKpiGoal] = useState("");
  const [kpiUnit, setKpiUnit] = useState("count");
  const [kpiOwnerId, setKpiOwnerId] = useState("");
  const weekDropdownRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const canEditKpis = hasPermission("edit_scorecard");

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

  function openAddKpiModal() {
    setEditingKpiId(null);
    setKpiTitle("");
    setKpiGoal("");
    setKpiUnit("count");
    setKpiOwnerId(db.users[0]?.id ?? "");
    setKpiModalOpen(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  }

  function openEditKpiModal(k: { id: string; title: string; goal: number; unit: string; ownerId: string }) {
    setEditingKpiId(k.id);
    setKpiTitle(k.title);
    setKpiGoal(String(k.goal));
    setKpiUnit(k.unit);
    setKpiOwnerId(k.ownerId);
    setKpiModalOpen(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  }

  function handleSaveKpiModal() {
    const title = kpiTitle.trim();
    if (!title) {
      toast("Enter a KPI title", "info");
      titleRef.current?.focus();
      return;
    }
    const goal = Number(kpiGoal);
    if (!Number.isFinite(goal) || goal < 0) {
      toast("Enter a valid goal number", "info");
      return;
    }
    if (editingKpiId) {
      updateKpi(editingKpiId, { title, goal, unit: kpiUnit, ownerId: kpiOwnerId || undefined });
      toast("KPI updated", "success");
    } else {
      createKpi({ title, goal, unit: kpiUnit, ownerId: kpiOwnerId || db.users[0]?.id || "u_me" });
      toast("KPI added", "success");
    }
    setKpiModalOpen(false);
  }

  function handleDeleteKpi() {
    if (!editingKpiId) return;
    if (!confirm("Delete this KPI? All weekly values will be removed.")) return;
    deleteKpi(editingKpiId);
    toast("KPI removed", "success");
    setKpiModalOpen(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle subtitle="Track weekly KPIs. Owners update before the meeting." />
        <div className="flex flex-wrap items-center gap-2">
          {canEditKpis && (
            <button type="button" onClick={openAddKpiModal} className={btnPrimary + " inline-flex gap-2"}>
              <Plus className="size-4" />
              Add KPI
            </button>
          )}
          <Link href="/meetings/run" className={btnSecondary + " inline-flex gap-2"}>
            <Play className="size-4" />
            Run meeting
          </Link>
        </div>
      </div>

      {kpis.length === 0 ? (
        <div className={card + " p-10"}>
          <EmptyState
            icon={TrendingUp}
            title="No KPIs yet"
            description={canEditKpis ? "Add KPIs to track weekly numbers." : "Add scorecard items in settings or seed starter data."}
            action={canEditKpis ? (
              <button type="button" onClick={openAddKpiModal} className={btnPrimary + " inline-flex gap-2"}>
                <Plus className="size-4" />
                Add KPI
              </button>
            ) : undefined}
          />
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
            <div className="grid min-w-[640px] grid-cols-[1fr_100px_100px_180px] gap-4 border-b border-[var(--border)] bg-[var(--muted-bg)] px-5 py-3 text-[12px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
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
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-[var(--text-primary)]">
                          {k.title}
                        </span>
                        {canEditKpis && (
                          <button
                            type="button"
                            onClick={() => openEditKpiModal(k)}
                            className="rounded-[var(--radius)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
                            aria-label={`Edit ${k.title}`}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
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

      {kpiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kpi-modal-title"
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setKpiModalOpen(false)} aria-hidden />
          <div
            className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
            onKeyDown={(e) => e.key === "Escape" && setKpiModalOpen(false)}
          >
            <div className="flex items-center justify-between">
              <h2 id="kpi-modal-title" className="text-[16px] font-semibold text-[var(--text-primary)]">
                {editingKpiId ? "Edit KPI" : "Add KPI"}
              </h2>
              <button
                type="button"
                onClick={() => setKpiModalOpen(false)}
                className="rounded-[var(--radius)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveKpiModal();
              }}
            >
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Title</label>
                <input
                  ref={titleRef}
                  type="text"
                  value={kpiTitle}
                  onChange={(e) => setKpiTitle(e.target.value)}
                  placeholder="e.g. Leads received"
                  className={inputBase + " w-full"}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Goal</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={kpiGoal}
                    onChange={(e) => setKpiGoal(e.target.value)}
                    placeholder="0"
                    className={inputBase + " w-full"}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Unit</label>
                  <select
                    value={kpiUnit}
                    onChange={(e) => setKpiUnit(e.target.value)}
                    className={inputBase + " w-full"}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u === "$" ? "Dollars ($)" : u === "%" ? "Percent (%)" : "Count"}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Owner</label>
                <select
                  value={kpiOwnerId}
                  onChange={(e) => setKpiOwnerId(e.target.value)}
                  className={inputBase + " w-full"}
                >
                  {db.users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {editingKpiId && (
                  <button
                    type="button"
                    onClick={handleDeleteKpi}
                    className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--badge-warning-text)] px-4 py-2.5 text-[13px] font-medium text-[var(--badge-warning-text)] hover:bg-[var(--badge-warning-bg)]"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                )}
                <button type="submit" className={btnPrimary}>
                  {editingKpiId ? "Save changes" : "Add KPI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
