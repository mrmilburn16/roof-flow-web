"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import type { MeetingSection, MeetingSectionKind } from "@/lib/domain";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, btnPrimary, btnSecondary, inputBase } from "@/components/ui";

const SECTION_KINDS: MeetingSectionKind[] = [
  "segue",
  "scorecard",
  "goals",
  "todos",
  "issues",
  "conclude",
];

const KIND_LABELS: Record<MeetingSectionKind, string> = {
  segue: "Check-in",
  scorecard: "Scorecard",
  goals: "Quarterly Goals",
  todos: "To-Dos",
  issues: "Issues",
  conclude: "Conclude",
};

function newSection(kind: MeetingSectionKind = "segue"): MeetingSection {
  return {
    id: `ms_${crypto.randomUUID().slice(0, 8)}`,
    kind,
    title: KIND_LABELS[kind],
    durationMinutes: kind === "issues" ? 45 : kind === "conclude" ? 5 : 10,
  };
}

export default function EditAgendaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: templateId } = use(params);
  const { db, hasPermission, getMeetingTemplate, updateMeetingTemplate, deleteMeetingTemplate } = useMockDb();
  const { toast } = useToast();

  const template = getMeetingTemplate(templateId);
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<MeetingSection[]>([]);
  const [saved, setSaved] = useState(false);

  const canEdit = hasPermission("manage_team");

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setSections(template.sections.map((s) => ({ ...s })));
    }
  }, [templateId, template?.id]);

  function moveSection(index: number, dir: number) {
    const next = [...sections];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setSections(next);
  }

  function updateSection(index: number, patch: Partial<MeetingSection>) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function addSection() {
    setSections((prev) => [...prev, newSection()]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const t = title.trim();
    if (!t) {
      toast("Enter a template title", "error");
      return;
    }
    if (sections.length === 0) {
      toast("Add at least one section", "error");
      return;
    }
    updateMeetingTemplate(templateId, { title: t, sections });
    setSaved(true);
    toast("Template updated", "success");
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDelete() {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    deleteMeetingTemplate(templateId);
    toast("Template deleted", "success");
    router.push("/meetings/agendas");
  }

  if (!template) {
    return (
      <div className="space-y-8">
        <PageTitle title="Edit template" subtitle="Template not found." />
        <Link href="/meetings/agendas" className={btnSecondary}>
          Back to Agendas
        </Link>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-8">
        <PageTitle title="Edit template" subtitle="You don’t have permission to edit agendas." />
        <Link href="/meetings/agendas" className={btnSecondary}>
          Back to Agendas
        </Link>
      </div>
    );
  }

  const totalMinutes = sections.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle
          title="Edit template"
          subtitle="Change the title, sections, order, and durations."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleSave} className={btnPrimary}>
            {saved ? "Saved" : "Save changes"}
          </button>
          <Link href="/meetings/agendas" className={btnSecondary}>
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--badge-warning-text)] px-4 py-2.5 text-[13px] font-medium text-[var(--badge-warning-text)] hover:bg-[var(--badge-warning-bg)]"
          >
            <Trash2 className="size-4" />
            Delete template
          </button>
        </div>
      </div>

      <div className={card}>
        <div className="border-b border-[var(--border)] px-5 py-4">
          <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Template title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputBase + " max-w-md"}
          />
        </div>
        <div className="border-b border-[var(--border)] px-5 py-3 flex items-center justify-between">
          <span className="text-[13px] text-[var(--text-muted)]">
            {sections.length} section{sections.length !== 1 ? "s" : ""} · {totalMinutes} min total
          </span>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
          >
            <Plus className="size-4" />
            Add section
          </button>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {sections.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveSection(i, -1)}
                  disabled={i === 0}
                  className="rounded-[var(--radius)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Move up"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(i, 1)}
                  disabled={i === sections.length - 1}
                  className="rounded-[var(--radius)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Move down"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
              <select
                value={s.kind}
                onChange={(e) => {
                  const kind = e.target.value as MeetingSectionKind;
                  updateSection(i, { kind, title: KIND_LABELS[kind] });
                }}
                className={inputBase + " w-[160px]"}
              >
                {SECTION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={s.title}
                onChange={(e) => updateSection(i, { title: e.target.value })}
                className={inputBase + " min-w-[140px] flex-1 max-w-xs"}
                placeholder="Section title"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={s.durationMinutes}
                  onChange={(e) => updateSection(i, { durationMinutes: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className={inputBase + " w-20"}
                />
                <span className="text-[13px] text-[var(--text-muted)]">min</span>
              </div>
              <button
                type="button"
                onClick={() => removeSection(i)}
                className="rounded-[var(--radius)] p-2 text-[var(--text-muted)] hover:bg-[var(--badge-warning-bg)] hover:text-[var(--badge-warning-text)]"
                aria-label="Remove section"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
