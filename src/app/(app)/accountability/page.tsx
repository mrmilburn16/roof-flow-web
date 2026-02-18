"use client";

import { useMemo, useState } from "react";
import { Users, ChevronDown, ChevronRight, ArrowDownRight } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card } from "@/components/ui";

type Role = { id: string; name: string; parentRoleId?: string | null };

const INDENT = 28;

function ChartNode({
  role,
  allRoles,
  usersByRoleId,
  reportsToOptions,
  onReportsToChange,
  canEdit,
  depth,
  isLast,
}: {
  role: Role;
  allRoles: Role[];
  usersByRoleId: Map<string, { id: string; name: string }[]>;
  reportsToOptions: { id: string; name: string }[];
  onReportsToChange: (roleId: string, parentRoleId: string | null) => void;
  canEdit: boolean;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const children = useMemo(
    () => allRoles.filter((r) => (r.parentRoleId ?? null) === role.id),
    [allRoles, role.id],
  );
  const people = usersByRoleId.get(role.id) ?? [];
  const hasChildren = children.length > 0;
  const parentName = role.parentRoleId
    ? reportsToOptions.find((o) => o.id === role.parentRoleId)?.name ?? null
    : null;

  return (
    <div
      className="relative flex-1 min-w-0"
      style={{ paddingLeft: depth > 0 ? INDENT : 0 }}
    >
      <div
        className={`rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] ${depth === 0 ? "border-[var(--border)]" : "border-l-2 border-l-[var(--border)]"}`}
      >
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] transition"
                  aria-expanded={open}
                >
                  {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              ) : (
                <span className="size-7 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">{role.name}</span>
                  {parentName && (
                    <span className="flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
                      <ArrowDownRight className="size-3" />
                      {parentName}
                    </span>
                  )}
                </div>
                {people.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {people.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[12px] text-[var(--text-secondary)]"
                      >
                        {u.name}
                      </span>
                    ))}
                  </div>
              )}
            </div>
            {canEdit && (
                <select
                  value={role.parentRoleId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onReportsToChange(role.id, v === "" ? null : v);
                  }}
                  className="shrink-0 rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input-bg)] py-1.5 pl-2 pr-7 text-[12px] text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
                  aria-label={`Reports to (${role.name})`}
                >
                  <option value="">Top level</option>
                  {reportsToOptions
                    .filter((o) => o.id !== role.id)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                </select>
              )}
        </div>
      </div>
      {open && hasChildren && (
        <div className="mt-3 space-y-3 pl-0">
          {children.map((c, i) => (
            <ChartNode
              key={c.id}
              role={c}
              allRoles={allRoles}
              usersByRoleId={usersByRoleId}
              reportsToOptions={reportsToOptions}
                onReportsToChange={onReportsToChange}
                canEdit={canEdit}
                depth={depth + 1}
              />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountabilityPage() {
  const { db, hasPermission, setRoleParent } = useMockDb();
  const canEdit = hasPermission("manage_roles");

  const roles = useMemo(() => db.roles, [db.roles]);
  const topLevelRoles = useMemo(
    () =>
      roles.filter(
        (r) =>
          r.id !== "role_owner" &&
          (r.parentRoleId == null || r.parentRoleId === "" || r.parentRoleId === "role_owner"),
      ),
    [roles],
  );
  const ownerRole = useMemo(() => roles.find((r) => r.name === "Owner"), [roles]);
  const usersByRoleId = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const u of db.users) {
      const list = map.get(u.roleId) ?? [];
      list.push({ id: u.id, name: u.name });
      map.set(u.roleId, list);
    }
    return map;
  }, [db.users]);
  const reportsToOptions = useMemo(() => roles.map((r) => ({ id: r.id, name: r.name })), [roles]);

  const handleReportsToChange = (roleId: string, parentRoleId: string | null) => {
    setRoleParent(roleId, parentRoleId);
  };

  return (
    <div className="space-y-8">
      <PageTitle
        title="Accountability Chart"
        subtitle="Who is accountable for what. Roles and reporting structure."
      />

      <div className={card}>
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
            <Users className="size-5 text-[var(--text-muted)]" />
            Structure
          </div>
          {canEdit && (
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Change &quot;Reports to&quot; in each role card to adjust the hierarchy.
            </p>
          )}
        </div>
        <div className="p-5">
          {/* Owner: top seat */}
          {ownerRole && (
            <div className="mb-6">
              <div className="rounded-[var(--radius-lg)] border-2 border-[var(--border)] bg-[var(--muted-bg)] px-4 py-3">
                <div className="font-semibold text-[var(--text-primary)]">{ownerRole.name}</div>
                {(usersByRoleId.get(ownerRole.id) ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {usersByRoleId.get(ownerRole.id)!.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center rounded-full bg-[var(--surface)] border border-[var(--border)] px-2.5 py-0.5 text-[12px] text-[var(--text-secondary)]"
                      >
                        {u.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {topLevelRoles.length === 0 ? (
            <p className="text-[14px] text-[var(--text-muted)]">
              No other roles yet. Add roles in Settings and set &quot;Reports to&quot; here.
            </p>
          ) : (
            <div className="space-y-2">
              {topLevelRoles.map((r, i) => (
                <ChartNode
                  key={r.id}
                  role={r}
                  allRoles={roles}
                  usersByRoleId={usersByRoleId}
                  reportsToOptions={reportsToOptions}
                  onReportsToChange={handleReportsToChange}
                  canEdit={canEdit}
                  depth={0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
