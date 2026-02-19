/**
 * Export data as CSV or JSON. Resolves ownerId to owner name via db.users.
 * Used by Settings export UI; works with MockDb (mock or Firestore-backed).
 */

import type { MockDb } from "@/lib/mock/mockData";

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

function ownerName(db: MockDb, ownerId: string | undefined): string {
  if (!ownerId) return "";
  const u = db.users.find((x) => x.id === ownerId);
  return u?.name ?? ownerId;
}

/** To-dos CSV: Title, Owner, Due date, Status, Notes, Source, Slack channel, Slack message URL, Created at, Completed at */
export function exportTodosCSV(db: MockDb): string {
  const headers = [
    "Title",
    "Owner",
    "Due date",
    "Status",
    "Notes",
    "Source",
    "Slack channel",
    "Slack message URL",
    "Created at",
    "Completed at",
  ];
  const rows = db.todos.map((t) => [
    t.title ?? "",
    ownerName(db, t.ownerId),
    t.dueDate ?? "",
    t.status ?? "",
    t.notes ?? "",
    t.source ?? "app",
    t.sourceMeta?.slackChannelName ?? "",
    t.sourceMeta?.slackMessageUrl ?? "",
    t.createdAt ?? "",
    t.completedAt ?? "",
  ]);
  return toCSV(headers, rows);
}

/** Goals CSV: Title, Owner, Status, Due date, Notes, Created at */
export function exportGoalsCSV(db: MockDb): string {
  const headers = ["Title", "Owner", "Status", "Due date", "Notes", "Created at"];
  const rows = db.goals.map((g) => [
    g.title ?? "",
    ownerName(db, g.ownerId),
    g.status ?? "",
    g.dueDate ?? "",
    g.notes ?? "",
    g.createdAt ?? "",
  ]);
  return toCSV(headers, rows);
}

/** Scorecard CSV: KPI title, Owner, Goal, Unit, Week of, Value, Note, Created at (one row per KPI entry; definitions implied by first occurrence of each KPI) */
export function exportScorecardCSV(db: MockDb): string {
  const headers = ["KPI title", "Owner", "Goal", "Unit", "Week of", "Value", "Note", "Created at"];
  const kpiById = new Map(db.kpis.map((k) => [k.id, k]));
  const rows = db.kpiEntries.map((e) => {
    const kpi = kpiById.get(e.kpiId);
    return [
      kpi?.title ?? e.kpiId,
      kpi ? ownerName(db, kpi.ownerId) : "",
      kpi != null ? String(kpi.goal) : "",
      kpi?.unit ?? "",
      e.weekOf ?? "",
      String(e.value),
      e.note ?? "",
      e.createdAt ?? "",
    ];
  });
  return toCSV(headers, rows);
}

/** Full snapshot JSON for backup: todos, goals, issues, kpis, kpiEntries, meetingTemplates, meetingRunStatus, meetingFeedback, meetingNotes, vision, feedback, users, roles */
export function exportFullJSON(db: MockDb): string {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    todos: db.todos,
    goals: db.goals,
    issues: db.issues,
    kpis: db.kpis,
    kpiEntries: db.kpiEntries,
    meetingTemplates: db.meetingTemplates,
    meetingNotes: db.meetingNotes,
    meetingRunStatus: db.meetingRunStatus,
    meetingFeedback: db.meetingFeedback,
    vision: db.vision,
    feedback: db.feedback,
    users: db.users,
    roles: db.roles,
  };
  return JSON.stringify(snapshot, null, 2);
}

/** Trigger browser download of a string as a file */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
