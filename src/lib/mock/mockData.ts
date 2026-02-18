import type {
  FeedbackItem,
  IssueItem,
  KpiDefinition,
  KpiEntry,
  MeetingTemplate,
  QuarterlyGoal,
  Role,
  TodoItem,
  User,
} from "@/lib/domain";
import { ALL_PERMISSION_CODES } from "@/lib/domain";

export type MeetingRunStatus = "scheduled" | "canceled";

export type MeetingFeedback = {
  rating: number;
  comment?: string;
};

export type Vision = {
  purpose: string;
  coreValues: string[];
  focus: string;
};

export type MockDb = {
  users: User[];
  roles: Role[];
  todos: TodoItem[];
  issues: IssueItem[];
  goals: QuarterlyGoal[];
  kpis: KpiDefinition[];
  kpiEntries: KpiEntry[];
  meetingTemplates: MeetingTemplate[];
  meetingNotes: string;
  /** Week-of (ISO date) -> status. Defaults to "scheduled" when missing. */
  meetingRunStatus: Record<string, MeetingRunStatus>;
  /** Week-of (ISO date) -> rating and optional comment after meeting. */
  meetingFeedback: Record<string, MeetingFeedback>;
  vision: Vision;
  feedback: FeedbackItem[];
};

function iso(d: Date) {
  return d.toISOString();
}

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function startOfWeek(date = new Date()) {
  // Monday-start week
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function createInitialMockDb(): MockDb {
  const now = new Date();

  const roles: Role[] = [
    { id: "role_owner", name: "Owner", permissionIds: [...ALL_PERMISSION_CODES], parentRoleId: null, createdAt: iso(now) },
    {
      id: "role_sales",
      name: "Sales",
      permissionIds: ["run_meeting", "view_meetings", "cancel_meeting", "edit_goals", "edit_scorecard", "edit_todos", "edit_issues"],
      parentRoleId: "role_owner",
      createdAt: iso(now),
    },
    {
      id: "role_pm",
      name: "Project Manager",
      permissionIds: ["run_meeting", "view_meetings", "cancel_meeting", "edit_goals", "edit_scorecard", "edit_todos", "edit_issues"],
      parentRoleId: "role_owner",
      createdAt: iso(now),
    },
    {
      id: "role_crew_lead",
      name: "Crew Lead",
      permissionIds: ["view_meetings", "edit_todos", "edit_issues"],
      parentRoleId: "role_pm",
      createdAt: iso(now),
    },
    {
      id: "role_office",
      name: "Office Admin",
      permissionIds: ["run_meeting", "view_meetings", "edit_todos", "edit_issues"],
      parentRoleId: "role_owner",
      createdAt: iso(now),
    },
  ];

  const mike: User = { id: "u_mike", name: "Mike", initials: "MM", roleId: "role_owner" };

  const week0 = startOfWeek(now);
  const week1 = startOfWeek(new Date(now.getTime() - 7 * 86400_000));
  const week2 = startOfWeek(new Date(now.getTime() - 14 * 86400_000));

  const kpis: KpiDefinition[] = [
    {
      id: "kpi_leads",
      title: "Leads received",
      ownerId: mike.id,
      goal: 50,
      unit: "count",
      createdAt: iso(now),
    },
    {
      id: "kpi_sold",
      title: "Jobs sold",
      ownerId: mike.id,
      goal: 12,
      unit: "count",
      createdAt: iso(now),
    },
    {
      id: "kpi_gm",
      title: "Gross margin",
      ownerId: mike.id,
      goal: 35,
      unit: "%",
      createdAt: iso(now),
    },
  ];

  const kpiEntries: KpiEntry[] = [
    { id: "ke_1", kpiId: "kpi_leads", weekOf: isoDateOnly(week0), value: 52, createdAt: iso(now) },
    { id: "ke_2", kpiId: "kpi_sold", weekOf: isoDateOnly(week0), value: 9, createdAt: iso(now) },
    { id: "ke_3", kpiId: "kpi_gm", weekOf: isoDateOnly(week0), value: 34, createdAt: iso(now) },

    { id: "ke_4", kpiId: "kpi_leads", weekOf: isoDateOnly(week1), value: 47, createdAt: iso(now) },
    { id: "ke_5", kpiId: "kpi_sold", weekOf: isoDateOnly(week1), value: 13, createdAt: iso(now) },
    { id: "ke_6", kpiId: "kpi_gm", weekOf: isoDateOnly(week1), value: 36, createdAt: iso(now) },

    { id: "ke_7", kpiId: "kpi_leads", weekOf: isoDateOnly(week2), value: 61, createdAt: iso(now) },
    { id: "ke_8", kpiId: "kpi_sold", weekOf: isoDateOnly(week2), value: 11, createdAt: iso(now) },
    { id: "ke_9", kpiId: "kpi_gm", weekOf: isoDateOnly(week2), value: 33, createdAt: iso(now) },
  ];

  const todos: TodoItem[] = [
    {
      id: "td_1",
      title: "Confirm supplier pricing for shingles",
      ownerId: mike.id,
      dueDate: isoDateOnly(new Date(now.getTime() + 2 * 86400_000)),
      status: "open",
      createdAt: iso(now),
    },
    {
      id: "td_2",
      title: "Review job backlog for next 2 weeks",
      ownerId: mike.id,
      dueDate: isoDateOnly(new Date(now.getTime() + 1 * 86400_000)),
      status: "open",
      createdAt: iso(now),
    },
  ];

  const issues: IssueItem[] = [
    {
      id: "is_1",
      title: "Install crew starting late on Tuesdays",
      status: "open",
      priority: 1,
      notes: "Root cause: dispatch? materials? incentives?",
      createdAt: iso(new Date(now.getTime() - 3 * 86400_000)),
    },
    {
      id: "is_2",
      title: "Lead follow-up time > 2 hours",
      status: "open",
      priority: 2,
      createdAt: iso(new Date(now.getTime() - 1 * 86400_000)),
    },
  ];

  const goals: QuarterlyGoal[] = [
    {
      id: "g_1",
      title: "Reduce lead-to-contact time to under 30 minutes",
      ownerId: mike.id,
      status: "offTrack",
      dueDate: isoDateOnly(new Date(now.getTime() + 45 * 86400_000)),
      notes: "Need routing + call coverage plan.",
      createdAt: iso(now),
    },
    {
      id: "g_2",
      title: "Standardize job packet process for production",
      ownerId: mike.id,
      status: "onTrack",
      dueDate: isoDateOnly(new Date(now.getTime() + 60 * 86400_000)),
      createdAt: iso(now),
    },
  ];

  const meetingTemplates: MeetingTemplate[] = [
    {
      id: "mt_weekly",
      title: "Weekly Leadership Meeting",
      schedule: { type: "recurring", dayOfWeek: 2, time: "09:00", frequency: "weekly" },
      createdAt: iso(now),
      sections: [
        { id: "ms_1", kind: "segue", title: "Check-in", durationMinutes: 10 },
        { id: "ms_2", kind: "headlines", title: "Headlines", durationMinutes: 5 },
        { id: "ms_3", kind: "rockReview", title: "Rock Review", durationMinutes: 15 },
        { id: "ms_4", kind: "scorecard", title: "Scorecard", durationMinutes: 10 },
        { id: "ms_5", kind: "goals", title: "Quarterly Goals", durationMinutes: 10 },
        { id: "ms_6", kind: "todos", title: "To-Dos", durationMinutes: 10 },
        { id: "ms_7", kind: "issues", title: "Issues", durationMinutes: 45 },
        { id: "ms_8", kind: "conclude", title: "Conclude", durationMinutes: 5 },
      ],
    },
  ];

  return {
    users: [mike],
    roles,
    todos,
    issues,
    goals,
    kpis,
    kpiEntries,
    meetingTemplates,
    meetingNotes: "",
    meetingRunStatus: {},
    meetingFeedback: {},
    vision: {
      purpose: "",
      coreValues: [],
      focus: "",
    },
    feedback: [],
  };
}

