"use client";

import { useMemo, useState } from "react";
import { Shield, Lock, Users, Save, Check } from "lucide-react";
import type { PermissionCode } from "@/lib/domain";
import { ALL_PERMISSION_CODES, PERMISSION_LABELS } from "@/lib/domain";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, btnPrimary } from "@/components/ui";

export default function RolesPage() {
  const { db, hasPermission, setRolePermissions } = useMockDb();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [dirty, setDirty] = useState<Record<string, PermissionCode[]>>({});

  const canManageRoles = hasPermission("manage_roles");
  const roles = useMemo(() => db.roles.filter((r) => r.name !== "Owner"), [db.roles]);
  const ownerRole = useMemo(() => db.roles.find((r) => r.name === "Owner"), [db.roles]);

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

  if (!canManageRoles) {
    return (
      <div className="space-y-8">
        <PageTitle title="Roles & permissions" subtitle="Manage what each role can do." />
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
      <PageTitle
        title="Roles & permissions"
        subtitle="Grant permissions to each role. Owner has all permissions and cannot be edited."
      />

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
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Editable roles</h2>
        <p className="text-[13px] text-[var(--text-muted)]">
          Toggle permissions for each role, then save all changes with the button below.
        </p>
        <div className="space-y-4">
          {roles.map((role) => {
            const effective = getEffectivePermissions(role.id);
            return (
              <div key={role.id} className={card}>
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--muted-bg)]">
                    <Users className="size-5 text-[var(--text-secondary)]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{role.name}</div>
                    <div className="text-[13px] text-[var(--text-muted)]">
                      {effective.length} permission{effective.length !== 1 ? "s" : ""} selected
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 p-5 sm:grid-cols-2">
                  {ALL_PERMISSION_CODES.map((code) => (
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
