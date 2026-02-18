"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, ChevronDown, ChevronRight, ArrowDownRight, Info } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card } from "@/components/ui";

type Role = { id: string; name: string; parentRoleId?: string | null };

const INDENT = 32;

function ChartNode({
  role,
  allRoles,
  usersByRoleId,
  reportsToOptions,
  onReportsToChange,
  canEdit,
  depth,
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
        className={`rounded-[var(--radius-lg)] border bg-[var(--surface)] shadow-[var(--shadow-sm)] ${depth === 0 ? "border-[var(--border)]" : "border-[var(--border)] border-l-4 border-l-[var(--text-muted)]"}`}
      >
        <div className="flex flex-wrap items-start gap-3 px-4 py-3">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] transition mt-0.5"
              aria-expanded={open}
            >
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : (
            <span className="size-7 shrink-0" />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div>
              <span className="font-semibold text-[var(--text-primary)]">{role.name}</span>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`reports-to-${role.id}`} className="text-[12px] text-[var(--text-muted)]">
                  Reports to
                </label>
                <select
                  id={`reports-to-${role.id}`}
                  value={role.parentRoleId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onReportsToChange(role.id, v === "" ? null : v);
                  }}
                  className="rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input-bg)] py-1.5 pl-2 pr-8 text-[12px] text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
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
              </div>
            ) : (
              parentName && (
                <p className="flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
                  <ArrowDownRight className="size-3 shrink-0" aria-hidden />
                  Reports to {parentName}
                </p>
              )
            )}
            {people.length > 0 && (
              <>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] pt-0.5">
                  Filled by
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {people.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[12px] text-[var(--text-secondary)]"
                    >
                      {u.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
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

  const totalPeople = db.users.length;
  const roleCount = roles.length;

  return (
    <div className="space-y-8">
      <PageTitle
        title="Accountability Chart"
        subtitle="Who is accountable for what. Roles and reporting structure."
      />

      {/* How to read */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-3">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-[var(--text-muted)] mt-0.5" aria-hidden />
          <div className="min-w-0 text-[13px] text-[var(--text-secondary)]">
            <p className="font-medium text-[var(--text-primary)]">How to read this chart</p>
            <p className="mt-1">
              Each box is a <strong>role</strong>. The <strong>Owner</strong> is at the top. Roles below show &quot;Reports to&quot; (their parent) and &quot;Filled by&quot; (people in that role). Indented roles are direct reports. Use the dropdown on each role to change who it reports to.
            </p>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
              <Users className="size-5 text-[var(--text-muted)]" />
              Structure
              <span className="text-[13px] font-normal text-[var(--text-muted)]">
                {roleCount} role{roleCount !== 1 ? "s" : ""} · {totalPeople} person{totalPeople !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {canEdit && (
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Change &quot;Reports to&quot; in each role card to adjust the hierarchy. Assign people to roles on <Link href="/people" className="text-[var(--link)] underline hover:no-underline">People</Link>; manage permissions on <Link href="/roles" className="text-[var(--link)] underline hover:no-underline">Roles</Link>.
            </p>
          )}
        </div>
        <div className="p-5">
          {/* Owner: top seat */}
          {ownerRole && (
            <div className="mb-6">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Top of chart
              </p>
              <div className="rounded-[var(--radius-lg)] border-2 border-[var(--border)] bg-[var(--muted-bg)] px-4 py-3">
                <div className="font-semibold text-[var(--text-primary)]">{ownerRole.name}</div>
                {(usersByRoleId.get(ownerRole.id) ?? []).length > 0 ? (
                  <>
                    <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Filled by</p>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      {usersByRoleId.get(ownerRole.id)!.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center rounded-full bg-[var(--surface)] border border-[var(--border)] px-2.5 py-0.5 text-[12px] text-[var(--text-secondary)]"
                        >
                          {u.name}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-[12px] text-[var(--text-muted)]">No one assigned yet</p>
                )}
              </div>
            </div>
          )}

          {topLevelRoles.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--muted-bg)] px-5 py-8 text-center">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                No other roles in the chart yet
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Roles are defined in your database. Once you have roles besides Owner, they’ll appear here. Use the &quot;Reports to&quot; dropdown on each role to build the hierarchy. Assign people on <Link href="/people" className="text-[var(--link)] underline hover:no-underline">People</Link>; manage permissions on <Link href="/roles" className="text-[var(--link)] underline hover:no-underline">Roles</Link>.
              </p>
            </div>
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
