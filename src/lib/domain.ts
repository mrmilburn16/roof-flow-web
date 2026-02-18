/** Permission codes used for role-based access. Owner has all by convention. */
export type PermissionCode =
  | "cancel_meeting"
  | "run_meeting"
  | "manage_roles"
  | "manage_team"
  | "edit_goals"
  | "edit_scorecard"
  | "edit_todos"
  | "edit_issues"
  | "view_meetings";

export type Role = {
  id: string;
  name: string;
  permissionIds: PermissionCode[];
  /** Parent role id for Accountability Chart hierarchy. Null = top level. */
  parentRoleId?: string | null;
  createdAt: string; // ISO
};

export type User = {
  id: string;
  name: string;
  initials: string;
  roleId: string;
};

export type TodoStatus = "open" | "done";

export type TodoItem = {
  id: string;
  title: string;
  ownerId: string;
  dueDate?: string; // ISO date
  status: TodoStatus;
  notes?: string;
  createdAt: string; // ISO
};

export type IssueStatus = "open" | "resolved";

export type IssueItem = {
  id: string;
  title: string;
  status: IssueStatus;
  priority: number; // 1 = highest
  notes?: string;
  createdAt: string; // ISO
};

export type GoalStatus = "onTrack" | "offTrack" | "done";

export type QuarterlyGoal = {
  id: string;
  title: string;
  ownerId: string;
  status: GoalStatus;
  dueDate: string; // ISO date
  notes?: string;
  createdAt: string; // ISO
};

export type KpiDefinition = {
  id: string;
  title: string;
  ownerId: string;
  goal: number;
  unit: string; // "$", "%", "count"
  createdAt: string; // ISO
};

export type KpiEntry = {
  id: string;
  kpiId: string;
  weekOf: string; // ISO date for start-of-week
  value: number;
  note?: string;
  createdAt: string; // ISO
};

export type MeetingSectionKind =
  | "segue"
  | "scorecard"
  | "goals"
  | "todos"
  | "issues"
  | "conclude";

export type MeetingSection = {
  id: string;
  kind: MeetingSectionKind;
  title: string;
  durationMinutes: number;
};

export type MeetingTemplate = {
  id: string;
  title: string;
  sections: MeetingSection[];
  createdAt: string; // ISO
};

/** Human-readable labels for each permission. Used in Roles UI. */
export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  cancel_meeting: "Cancel meetings",
  run_meeting: "Run meetings",
  manage_roles: "Manage roles & permissions",
  manage_team: "Manage team members",
  edit_goals: "Edit goals",
  edit_scorecard: "Edit scorecard",
  edit_todos: "Edit to-dos",
  edit_issues: "Edit issues",
  view_meetings: "View meetings & agendas",
};

export const ALL_PERMISSION_CODES: PermissionCode[] = [
  "cancel_meeting",
  "run_meeting",
  "view_meetings",
  "manage_roles",
  "manage_team",
  "edit_goals",
  "edit_scorecard",
  "edit_todos",
  "edit_issues",
];

