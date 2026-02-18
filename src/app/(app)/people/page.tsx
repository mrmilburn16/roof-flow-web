"use client";

import { useState } from "react";
import { UserPlus, Pencil, Trash2, Lock } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { useToast } from "@/lib/toast/ToastProvider";
import { PageTitle, card, btnPrimary, btnSecondary, inputBase } from "@/components/ui";

export default function PeoplePage() {
  const { db, hasPermission, createUser, updateUser, deleteUser } = useMockDb();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addRoleId, setAddRoleId] = useState(() => db.roles.find((r) => r.name === "Owner")?.id ?? db.roles[0]?.id ?? "");
  const [editName, setEditName] = useState("");
  const [editRoleId, setEditRoleId] = useState("");

  const canManage = hasPermission("manage_team");
  const roles = db.roles;

  function openEdit(user: { id: string; name: string; roleId: string }) {
    setEditingId(user.id);
    setEditName(user.name);
    setEditRoleId(user.roleId);
  }

  function saveEdit() {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) {
      toast("Name is required", "error");
      return;
    }
    updateUser(editingId, { name, roleId: editRoleId });
    setEditingId(null);
    toast("Person updated", "success");
  }

  function handleAdd() {
    const name = addName.trim();
    if (!name) {
      toast("Name is required", "error");
      return;
    }
    createUser({ name, roleId: addRoleId });
    setAddName("");
    setAddRoleId(db.roles[0]?.id ?? "");
    setShowAdd(false);
    toast("Person added", "success");
  }

  function handleDelete(userId: string) {
    deleteUser(userId);
    setDeleteConfirmId(null);
    toast("Person removed", "success");
  }

  if (!canManage) {
    return (
      <div className="space-y-8">
        <PageTitle title="People" subtitle="Manage team members and their roles." />
        <div className={card + " p-10 text-center"}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--muted-bg)]">
            <Lock className="size-6 text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-[var(--text-primary)]">
            You don’t have permission to manage people
          </p>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Only someone with “Manage team members” can add or edit people.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle
          title="People"
          subtitle="Add team members and assign them to roles. Changes appear on the Accountability Chart."
        />
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className={btnPrimary + " inline-flex gap-2"}
        >
          <UserPlus className="size-4" />
          Add person
        </button>
      </div>

      {showAdd && (
        <div className={card}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">New person</h2>
          </div>
          <div className="flex flex-wrap items-end gap-4 p-5">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Name</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className={inputBase}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="min-w-[160px]">
              <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Role</label>
              <select
                value={addRoleId}
                onChange={(e) => setAddRoleId(e.target.value)}
                className={inputBase + " w-full"}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleAdd} className={btnPrimary}>
                Add
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {db.users.map((user) => {
          const role = db.roles.find((r) => r.id === user.roleId);
          const isEditing = editingId === user.id;
          const isDeleteConfirm = deleteConfirmId === user.id;

          return (
            <div key={user.id} className={card}>
              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--muted-bg)] text-[14px] font-semibold text-[var(--text-secondary)]">
                  {user.initials}
                </div>
                {isEditing ? (
                  <>
                    <div className="min-w-[180px] flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={inputBase}
                        placeholder="Name"
                        autoFocus
                      />
                    </div>
                    <select
                      value={editRoleId}
                      onChange={(e) => setEditRoleId(e.target.value)}
                      className={inputBase + " min-w-[140px]"}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button type="button" onClick={saveEdit} className={btnPrimary}>
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className={btnSecondary}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[var(--text-primary)]">{user.name}</div>
                      <div className="text-[13px] text-[var(--text-muted)]">{role?.name ?? "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
                        aria-label={`Edit ${user.name}`}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </button>
                      {!isDeleteConfirm ? (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(user.id)}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-[13px] font-medium text-[var(--badge-warning-text)] hover:bg-[var(--badge-warning-bg)]"
                          aria-label={`Remove ${user.name}`}
                        >
                          <Trash2 className="size-3.5" />
                          Remove
                        </button>
                      ) : (
                        <span className="flex items-center gap-2 text-[13px]">
                          <span className="text-[var(--text-muted)]">Remove?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(user.id)}
                            className="font-medium text-[var(--badge-warning-text)] hover:underline"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="font-medium text-[var(--text-secondary)] hover:underline"
                          >
                            No
                          </button>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {db.users.length === 0 && (
        <div className={card + " p-10 text-center"}>
          <p className="text-[14px] text-[var(--text-muted)]">No people yet. Add someone to get started.</p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className={btnPrimary + " mt-4 inline-flex gap-2"}
          >
            <UserPlus className="size-4" />
            Add person
          </button>
        </div>
      )}
    </div>
  );
}
