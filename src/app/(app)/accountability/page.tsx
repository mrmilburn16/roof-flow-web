"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Users, Info } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card } from "@/components/ui";

/** Set to false to show the full accountability chart. */
const ACCOUNTABILITY_CHART_COMING_SOON = true;

type Role = { id: string; name: string; parentRoleId?: string | null };

/** Build tree rows: each row is an array of { role, col }. Columns assigned so children sit under parent. */
function buildChartRows(roles: Role[]): { role: Role; col: number }[][] {
  const byId = new Map(roles.map((r) => [r.id, r]));
  const owner = roles.find((r) => r.name === "Owner");
  if (!owner) return [];

  const rows: Role[][] = [];
  let current: Role[] = [owner];
  while (current.length > 0) {
    rows.push(current);
    const next: Role[] = [];
    for (const p of current) {
      const children = roles.filter((r) => (r.parentRoleId ?? null) === p.id);
      next.push(...children);
    }
    current = next;
  }
  if (rows.length === 0) return [];

  const maxCols = Math.max(...rows.map((r) => r.length), 1);
  const result: { role: Role; col: number }[][] = [];

  for (let r = 0; r < rows.length; r++) {
    const rowRoles = rows[r];
    if (r === 0) {
      result.push([{ role: rowRoles[0], col: Math.floor(maxCols / 2) }]);
      continue;
    }
    const parentColByRoleId = new Map<string, number>();
    for (const { role, col } of result[r - 1]) parentColByRoleId.set(role.id, col);
    const byParent = new Map<string | null, Role[]>();
    for (const role of rowRoles) {
      const pid = role.parentRoleId ?? null;
      const list = byParent.get(pid) ?? [];
      list.push(role);
      byParent.set(pid, list);
    }
    const assigned: { role: Role; col: number }[] = [];
    for (const [, children] of byParent) {
      const parentId = children[0].parentRoleId ?? null;
      const parentCol = parentId != null ? parentColByRoleId.get(parentId) ?? 0 : Math.floor(maxCols / 2);
      const k = children.length;
      const startCol = Math.max(0, parentCol - Math.floor((k - 1) / 2));
      children.forEach((role, i) => assigned.push({ role, col: startCol + i }));
    }
    assigned.sort((a, b) => a.col - b.col);
    result.push(assigned);
  }

  return result;
}

/** Edges for SVG: (parentRow, parentCol) -> (childRow, childCol). */
function buildEdges(rows: { role: Role; col: number }[][]): { pr: number; pc: number; cr: number; cc: number }[] {
  const edges: { pr: number; pc: number; cr: number; cc: number }[] = [];
  const maxCols = Math.max(...rows.map((r) => r.length > 0 ? Math.max(...r.map((x) => x.col)) + 1 : 0), 1);
  for (let r = 1; r < rows.length; r++) {
    for (const { role, col: cc } of rows[r]) {
      const parentId = role.parentRoleId ?? null;
      if (parentId == null) continue;
      for (let i = 0; i < rows[r - 1].length; i++) {
        if (rows[r - 1][i].role.id === parentId) {
          const pr = r - 1;
          const pc = rows[r - 1][i].col;
          edges.push({ pr, pc, cr: r, cc });
          break;
        }
      }
    }
  }
  return edges;
}

const CARD_MIN_W = 140;
const ROW_H = 88;
const GAP = 16;

function OrgChartCard({
  role,
  people,
  reportsToOptions,
  onReportsToChange,
  canEdit,
  isOwner,
}: {
  role: Role;
  people: { id: string; name: string }[];
  reportsToOptions: { id: string; name: string }[];
  onReportsToChange: (roleId: string, parentRoleId: string | null) => void;
  canEdit: boolean;
  isOwner: boolean;
}) {
  const parentName = role.parentRoleId
    ? reportsToOptions.find((o) => o.id === role.parentRoleId)?.name ?? null
    : null;

  return (
    <div
      className={`rounded-[var(--radius-lg)] border-2 px-3 py-2.5 text-center shadow-[var(--shadow-sm)] ${
        isOwner
          ? "border-[var(--border)] bg-[var(--muted-bg)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
      style={{ minWidth: CARD_MIN_W }}
    >
      <div className="font-semibold text-[var(--text-primary)] text-[14px]">{role.name}</div>
      {canEdit && !isOwner ? (
        <div className="mt-1.5">
          <label htmlFor={`reports-to-${role.id}`} className="sr-only">Reports to</label>
          <select
            id={`reports-to-${role.id}`}
            value={role.parentRoleId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onReportsToChange(role.id, v === "" ? null : v);
            }}
            className="w-full rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input-bg)] py-1 px-2 text-[11px] text-[var(--text-secondary)] focus:ring-1 focus:ring-[var(--ring)]"
          >
            <option value="">Top level</option>
            {reportsToOptions.filter((o) => o.id !== role.id).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      ) : (
        parentName && (
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Reports to {parentName}</p>
        )
      )}
      {people.length > 0 && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-1">
          {people.map((u) => (
            <span
              key={u.id}
              className="inline-flex rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
            >
              {u.name}
            </span>
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
  const chartRows = useMemo(() => buildChartRows(roles), [roles]);
  const edges = useMemo(() => buildEdges(chartRows), [chartRows]);
  const maxCols = useMemo(() => {
    if (chartRows.length === 0) return 1;
    return Math.max(...chartRows.flatMap((r) => r.map((x) => x.col)), 0) + 1;
  }, [chartRows]);

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

  if (ACCOUNTABILITY_CHART_COMING_SOON) {
    return (
      <div className="space-y-8">
        <PageTitle subtitle="Who is accountable for what. Roles and reporting structure." />
        <p className="text-[13px] text-[var(--text-muted)]">
          Edit permissions for each role in{" "}
          <Link href="/roles" className="font-medium text-[var(--text-primary)] underline">Roles</Link>.
        </p>
        <div className={card}>
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[var(--muted-bg)]">
              <Users className="size-7 text-[var(--text-muted)]" />
            </div>
            <p className="mt-4 text-[16px] font-semibold text-[var(--text-primary)]">Coming soon</p>
            <p className="mt-1 max-w-sm text-[14px] text-[var(--text-muted)]">
              This page is coming soon. Manage roles and permissions in{" "}
              <Link href="/roles" className="font-medium text-[var(--text-primary)] underline">Roles</Link> in the meantime.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (chartRows.length === 0) {
    return (
      <div className="space-y-8">
        <PageTitle subtitle="Who is accountable for what. Roles and reporting structure." />
        <p className="text-[13px] text-[var(--text-muted)]">
          Edit permissions for each role in{" "}
          <Link href="/roles" className="font-medium text-[var(--text-primary)] underline">Roles</Link>.
        </p>
        <div className={card}>
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--muted-bg)] px-5 py-12 text-center">
            <p className="text-[14px] font-medium text-[var(--text-primary)]">No roles in the chart yet</p>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Add roles in <Link href="/roles" className="text-[var(--link)] underline hover:no-underline">Roles</Link> and set who they report to.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const gridW = maxCols * (CARD_MIN_W + GAP) - GAP;
  const totalH = chartRows.length * (ROW_H + GAP) - GAP;

  return (
    <div className="space-y-8">
      <PageTitle subtitle="Who is accountable for what. Roles and reporting structure." />
      <p className="text-[13px] text-[var(--text-muted)]">
        Edit permissions for each role in{" "}
        <Link href="/roles" className="font-medium text-[var(--text-primary)] underline">Roles</Link>.
      </p>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-3">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-[var(--text-muted)] mt-0.5" aria-hidden />
          <div className="min-w-0 text-[13px] text-[var(--text-secondary)]">
            <p className="font-medium text-[var(--text-primary)]">Org chart</p>
            <p className="mt-1">
              Each box is a <strong>role</strong>; lines show reporting. The <strong>Owner</strong> is at the top. Change &quot;Reports to&quot; on a role to move it. Assign people on <Link href="/people" className="text-[var(--link)] underline hover:no-underline">People</Link>; permissions on <Link href="/roles" className="text-[var(--link)] underline hover:no-underline">Roles</Link>.
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
        </div>
        <div className="p-6 overflow-x-auto">
          <div
            className="relative mx-auto"
            style={{
              width: gridW,
              minHeight: totalH,
            }}
          >
            {/* SVG connector lines */}
            <svg
              className="absolute left-0 top-0 pointer-events-none"
              width={gridW}
              height={totalH}
              style={{ overflow: "visible" }}
            >
              {edges.map((_, i) => {
                const colCenter = (c: number) => c * (CARD_MIN_W + GAP) + CARD_MIN_W / 2;
                const y0 = _.pr * (ROW_H + GAP) + ROW_H;
                const y1 = _.cr * (ROW_H + GAP);
                const x0 = colCenter(_.pc);
                const x1 = colCenter(_.cc);
                const yMid = (y0 + y1) / 2;
                const path = `M ${x0} ${y0} L ${x0} ${yMid} L ${x1} ${yMid} L ${x1} ${y1}`;
                return (
                  <path
                    key={i}
                    d={path}
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeOpacity="0.4"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* Grid of role cards */}
            <div className="relative flex flex-col gap-4">
              {chartRows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${maxCols}, minmax(0, ${CARD_MIN_W}px))`,
                    width: gridW,
                  }}
                >
                  {Array.from({ length: maxCols }, (_, colIndex) => {
                    const cell = row.find((c) => c.col === colIndex);
                    if (!cell) return <div key={colIndex} />;
                    const isOwner = cell.role.name === "Owner";
                    return (
                      <div key={cell.role.id} className="flex justify-center">
                        <OrgChartCard
                          role={cell.role}
                          people={usersByRoleId.get(cell.role.id) ?? []}
                          reportsToOptions={reportsToOptions}
                          onReportsToChange={handleReportsToChange}
                          canEdit={canEdit}
                          isOwner={isOwner}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
