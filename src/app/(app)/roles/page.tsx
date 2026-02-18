"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Shield, Lock, Users, Save, Check, UserPlus, Pencil, Trash2 } from "lucide-react";
import type { PermissionCode } from "@/lib/domain";
import { PERMISSION_LABELS } from "@/lib/domain";

const PERMISSION_GROUPS: { label: string; codes: PermissionCode[] }[] = [
  { label: "Meetings", codes: ["cancel_meeting", "run_meeting", "view_meetings"] },
  {
    label: "Content",
    codes: ["edit_goals", "edit_scorecard", "edit_todos", "edit_issues"],
  },
  { label: "Admin", codes: ["manage_roles", "manage_team"] },
];
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, btnPrimary, btnSecondary, inputBase, Select } from "@/components/ui";

export default function RolesPage() {
  const { db, hasPermission, setRolePermissions, createRole, updateRole, deleteRole } = useMockDb();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [dirty, setDirty] = useState<Record<string, PermissionCode[]>>({});
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleParentId, setNewRoleParentId] = useState<string>("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const canManageRoles = hasPermission("manage_roles");
  const roles = useMemo(() => db.roles.filter((r) => r.name !== "Owner"), [db.roles]);
  const ownerRole = useMemo(() => db.roles.find((r) => r.name === "Owner"), [db.roles]);
  const usersCountByRoleId = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of db.users) m.set(u.roleId, (m.get(u.roleId) ?? 0) + 1);
    return m;
  }, [db.users]);
  const parentRoleOptions = useMemo(
    () => [{ id: "", name: "— Top level —" }, ...db.roles.filter((r) => r.name !== "Owner")],
    [db.roles],
  );

  function getEffectivePermissions(roleId: string): PermissionCode[] {
    if (dirty[roleId]) return dirty[roleId];
    return db.roles.find((r) => r.id === roleId)?.permissionIds ?? [];
  }

  function togglePermission(roleId: string, code: PermissionCode) {
    const current = getEffectivePermissions(roleId);
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    setDirty((prev) => ({ ...prev, [roleId]: next }));
  }

  const dirtyRoleIds = useMemo(() => Object.keys(dirty), [dirty]);
  const hasDirty = dirtyRoleIds.length > 0;

  async function saveAll() {
    if (!hasDirty) return;
    setSaving(true);
    try {
      for (const roleId of dirtyRoleIds) {
        const permissionIds =
          dirty[roleId] ?? db.roles.find((r) => r.id === roleId)?.permissionIds ?? [];
        setRolePermissions(roleId, permissionIds);
      }
      setDirty({});
      toast("Roles updated", "success");
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  function handleAddRole() {
    const name = newRoleName.trim();
    if (!name) {
      toast("Role name is required", "error");
      return;
    }
    createRole({
      name,
      parentRoleId: newRoleParentId || null,
    });
    setNewRoleName("");
    setNewRoleParentId("");
    setShowAddRole(false);
    toast("Role added", "success");
  }

  function startEditingRole(role: { id: string; name: string }) {
    setEditingRoleId(role.id);
    setEditingName(role.name);
  }

  function submitRoleName(roleId: string, currentName: string) {
    const name = editingName.trim();
    if (name && name !== currentName) {
      updateRole(roleId, { name });
      toast("Role renamed", "success");
    }
    setEditingRoleId(null);
    setEditingName("");
  }

  function handleDeleteRole(role: { id: string; name: string }) {
    const count = usersCountByRoleId.get(role.id) ?? 0;
    if (count > 0) {
      toast(
        `Cannot delete "${role.name}": ${count} user(s) have this role. Reassign them in People first.`,
        "error",
      );
      return;
    }
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      deleteRole(role.id);
      toast("Role deleted", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete role", "error");
    }
  }

  if (!canManageRoles) {
    return (
      <div className="space-y-8">
        <PageTitle subtitle="Manage what each role can do." />
        <div className={card + " p-10 text-center"}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--muted-bg)]">
            <Lock className="size-6 text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-[var(--text-primary)]">
            You don’t have permission to manage roles
          </p>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Only the owner (or someone with “Manage roles & permissions”) can change these settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageTitle subtitle="Grant permissions to each role. Owner has all permissions and cannot be edited." />

      {ownerRole && (
        <div className={card}>
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--muted-bg)]">
              <Shield className="size-5 text-[var(--text-secondary)]" />
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">{ownerRole.name}</div>
              <div className="text-[13px] text-[var(--text-muted)]">All permissions</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Editable roles</h2>
          {!showAddRole ? (
            <button
              type="button"
              onClick={() => setShowAddRole(true)}
              className={btnSecondary + " inline-flex gap-2"}
            >
              <UserPlus className="size-4" />
              Add role
            </button>
          ) : null}
        </div>
        <p className="text-[13px] text-[var(--text-muted)]">
          Toggle permissions for each role, then save all changes with the button below. To change
          who reports to whom, use the{" "}
          <Link href="/accountability" className="font-medium text-[var(--text-primary)] underline">
            Accountability Chart
          </Link>
          .
        </p>

        {showAddRole && (
          <div className={card + " border-2 border-dashed border-[var(--border)] p-5"}>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="new-role-name" className="mb-1 block text-[12px] font-medium text-[var(--text-muted)]">
                  Role name
                </label>
                <input
                  id="new-role-name"
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
                  placeholder="e.g. Install Lead"
                  className={inputBase}
                />
              </div>
              <div className="min-w-[180px]">
                <label htmlFor="new-role-parent" className="mb-1 block text-[12px] font-medium text-[var(--text-muted)]">
                  Reports to
                </label>
                <Select
                  id="new-role-parent"
                  aria-label="Reports to"
                  value={newRoleParentId}
                  onChange={setNewRoleParentId}
                  options={parentRoleOptions.map((o) => ({ value: o.id, label: o.name }))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddRole} className={btnPrimary}>
                  Add role
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRole(false);
                    setNewRoleName("");
                    setNewRoleParentId("");
                  }}
                  className={btnSecondary}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {roles.map((role) => {
            const effective = getEffectivePermissions(role.id);
            const userCount = usersCountByRoleId.get(role.id) ?? 0;
            const isEditingName = editingRoleId === role.id;
            return (
              <div key={role.id} className={card}>
                <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--muted-bg)]">
                      <Users className="size-5 text-[var(--text-secondary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {isEditingName ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => submitRoleName(role.id, role.name)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRoleName(role.id, role.name);
                            if (e.key === "Escape") {
                              setEditingRoleId(null);
                              setEditingName("");
                            }
                          }}
                          autoFocus
                          className={inputBase + " text-[15px] font-semibold"}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)]">{role.name}</span>
                          <button
                            type="button"
                            onClick={() => startEditingRole(role)}
                            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--text-primary)]"
                            aria-label="Rename role"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="text-[13px] text-[var(--text-muted)]">
                        {effective.length} permission{effective.length !== 1 ? "s" : ""} selected
                        {userCount > 0 && (
                          <span className="ml-2">
                            · {userCount} user{userCount !== 1 ? "s" : ""} have this role
                          </span>
                        )}
                        {" · "}
                        Reports to:{" "}
                        {role.parentRoleId
                          ? db.roles.find((r) => r.id === role.parentRoleId)?.name ?? "—"
                          : "Top level"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRole(role)}
                    className="shrink-0 rounded p-2 text-[var(--text-muted)] hover:bg-[var(--btn-danger-bg)] hover:text-[var(--btn-danger-text)] disabled:opacity-50"
                    aria-label={`Delete role ${role.name}`}
                    title={userCount > 0 ? "Reassign users in People first" : "Delete role"}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 md:grid-cols-3">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label} className="flex flex-col">
                      <div className="mb-2 pl-10 text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                        {group.label}
                      </div>
                      <div className="flex flex-col gap-2">
                        {group.codes.map((code) => (
                          <label
                            key={code}
                            className="flex cursor-pointer items-center gap-3 rounded-[var(--radius)] px-3 py-2 hover:bg-[var(--muted-bg)]"
                          >
                            <input
                              type="checkbox"
                              checked={effective.includes(code)}
                              onChange={() => togglePermission(role.id, code)}
                              className="size-4 shrink-0"
                            />
                            <span className="text-[13px] text-[var(--text-primary)]">
                              {PERMISSION_LABELS[code]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Save bar: show when there are unsaved changes or right after save */}
      {(hasDirty || savedJustNow) && (
        <div className="sticky bottom-0 left-0 right-0 z-10 -mx-8 -mb-8 mt-8 flex justify-end border-t border-[var(--border)] bg-[var(--surface)] px-8 py-4 shadow-[0 -1px 3px rgba(0,0,0,0.04)]">
          {savedJustNow ? (
            <div
              className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--badge-success-bg)] px-4 py-2.5 text-[13px] font-medium text-[var(--badge-success-text)]"
              role="status"
              aria-live="polite"
            >
              <Check className="size-4" />
              Saved
            </div>
          ) : (
            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className={btnPrimary + " inline-flex gap-2"}
            >
              <Save className="size-4" />
              {saving ? "Saving…" : "Save all changes"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
