"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MeetingSectionKind } from "@/lib/domain";
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

const DEFAULT_TITLES: Record<MeetingSectionKind, string> = {
  segue: "Check-in",
  scorecard: "Scorecard",
  goals: "Quarterly Goals",
  todos: "To-Dos",
  issues: "Issues",
  conclude: "Conclude",
};

const DEFAULT_DURATIONS: Record<MeetingSectionKind, number> = {
  segue: 10,
  scorecard: 10,
  goals: 10,
  todos: 10,
  issues: 45,
  conclude: 5,
};

function defaultSections(): { id: string; kind: MeetingSectionKind; title: string; durationMinutes: number }[] {
  return SECTION_KINDS.map((kind, i) => ({
    id: `ms_${i}_${crypto.randomUUID().slice(0, 6)}`,
    kind,
    title: DEFAULT_TITLES[kind],
    durationMinutes: DEFAULT_DURATIONS[kind],
  }));
}

export default function NewAgendaPage() {
  const router = useRouter();
  const { hasPermission, createMeetingTemplate } = useMockDb();
  const { toast } = useToast();
  const [title, setTitle] = useState("Weekly Leadership Meeting");
  const [sections] = useState(defaultSections);

  const canEdit = hasPermission("manage_team");

  function handleSave() {
    const t = title.trim();
    if (!t) {
      toast("Enter a template title", "error");
      return;
    }
    createMeetingTemplate({ title: t, sections });
    toast("Template created", "success");
    router.push("/meetings/agendas");
  }

  if (!canEdit) {
    return (
      <div className="space-y-8">
        <PageTitle title="Create template" subtitle="You don’t have permission to create agendas." />
        <Link href="/meetings/agendas" className={btnSecondary}>
          Back to Agendas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle
          title="Create template"
          subtitle="Add a new meeting agenda template. You can edit sections after saving."
        />
        <div className="flex gap-2">
          <button type="button" onClick={handleSave} className={btnPrimary}>
            Create template
          </button>
          <Link href="/meetings/agendas" className={btnSecondary}>
            Cancel
          </Link>
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
            placeholder="e.g. Weekly Leadership Meeting"
          />
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-[var(--text-muted)]">
            Default sections: {SECTION_KINDS.map((k) => DEFAULT_TITLES[k]).join(" → ")}. Edit the template after
            creating to change order, titles, or durations.
          </p>
        </div>
      </div>
    </div>
  );
}
