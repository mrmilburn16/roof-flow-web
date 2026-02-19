"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AvatarColor, AvatarStyle, GoalStatus, MeetingSectionKind, PermissionCode, TodoSourceMetaSlack } from "@/lib/domain";
import type { MeetingSection, MeetingTemplate } from "@/lib/domain";
import type { MockDb, MeetingRunStatus, Vision } from "@/lib/mock/mockData";
import { createInitialMockDb, startOfWeek } from "@/lib/mock/mockData";
import { isFirebaseConfigured, getFirebaseDb } from "@/lib/firebase/client";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";
import { useAuth } from "@/lib/auth/AuthProvider";

type MockDbApi = {
  db: MockDb;
  me: { id: string; name: string };
  weekOf: string;
  firestore: { enabled: boolean; error: string | null };

  /** True if current user's role has the permission (Owner has all). */
  hasPermission(code: PermissionCode): boolean;
  /** Status for the given week; defaults to "scheduled". */
  getMeetingRunStatus(weekOf: string): MeetingRunStatus;
  setMeetingRunStatus(weekOf: string, status: MeetingRunStatus): void;
  setRolePermissions(roleId: string, permissionIds: PermissionCode[]): void;
  setRoleParent(roleId: string, parentRoleId: string | null): void;
  createRole(payload: { name: string; parentRoleId?: string | null }): void;
  updateRole(roleId: string, payload: { name?: string }): void;
  /** Throws if any user has this role. Caller should check user count and show error or reassign first. */
  deleteRole(roleId: string): void;

  createTodo(title: string, options?: { dueDate?: string; ownerId?: string; source?: "app" | "slack"; sourceMeta?: TodoSourceMetaSlack }): void;
  updateTodo(todoId: string, payload: { title?: string; dueDate?: string; ownerId?: string; notes?: string }): void;
  deleteTodo(todoId: string): void;
  toggleTodo(todoId: string): void;
  createFeedback(message: string, page: string, userName?: string): void;
  deleteFeedback(feedbackId: string): void;

  createIssue(title: string, notes?: string): void;
  resolveIssue(issueId: string): void;
  reopenIssue(issueId: string): void;

  createGoal(title: string, dueDate?: string): void;
  setGoalStatus(goalId: string, status: GoalStatus): void;

  upsertKpiEntry(kpiId: string, weekOf: string, value: number): void;
  createKpi(payload: { title: string; goal: number; unit: string; ownerId: string }): void;
  updateKpi(kpiId: string, payload: { title?: string; goal?: number; unit?: string; ownerId?: string }): void;
  deleteKpi(kpiId: string): void;

  setMeetingNotes(notes: string): void;
  setMeetingFeedback(weekOf: string, rating: number, comment?: string): void;
  getMeetingRatingsAverage(): number | null;
  getVision(): Vision;
  setVision(vision: Vision): void;
  getMeetingTemplate(templateId?: string): MockDb["meetingTemplates"][number] | undefined;
  meetingSectionOrder(): MeetingSectionKind[];

  createUser(payload: { name: string; roleId: string; email?: string; initials?: string }): void;
  updateUser(userId: string, payload: { name?: string; roleId?: string; email?: string; initials?: string; avatarUrl?: string; avatarStyle?: AvatarStyle; avatarColor?: AvatarColor }): void;
  deleteUser(userId: string): void;

  createMeetingTemplate(payload: { title: string; sections: MeetingSection[] }): void;
  updateMeetingTemplate(templateId: string, payload: { title?: string; sections?: MeetingSection[]; schedule?: import("@/lib/domain").MeetingSchedule | null }): void;
  deleteMeetingTemplate(templateId: string): void;
};

const Ctx = createContext<MockDbApi | null>(null);

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

const FEEDBACK_STORAGE_KEY = "roofflow_feedback";

function loadPersistedFeedback(): import("@/lib/domain").FeedbackItem[] {
  if (typeof window === "undefined") return [];
  if (process.env.NEXT_PUBLIC_USE_FIRESTORE === "true") return [];
  try {
    const s = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!s) return [];
    const p = JSON.parse(s);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function MockDbProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<MockDb>(() => createInitialMockDb());
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const authState = useAuth();

  const useFirestore =
    process.env.NEXT_PUBLIC_USE_FIRESTORE === "true" && isFirebaseConfigured();
  const firestore = useFirestore ? getFirebaseDb() : null;

  // Hydrate feedback from localStorage on client (mock mode only)
  useEffect(() => {
    if (firestore) return;
    const persisted = loadPersistedFeedback();
    if (persisted.length > 0) {
      setDb((prev) => ({ ...prev, feedback: persisted }));
    }
  }, [firestore]);

  const companyId = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
  const teamId = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

  const weekOf = isoDateOnly(startOfWeek(new Date()));
  const meFromAuth = useMemo(() => {
    if (!authState.user) return null;
    return { id: authState.user.uid, name: authState.user.email ?? "User" };
  }, [authState.user]);

  // Firestore subscriptions (optional, enabled by env vars).
  useEffect(() => {
    if (!firestore) {
      setFirestoreError(null);
      return;
    }

    const base = (colName: string) =>
      collection(firestore, "companies", companyId, "teams", teamId, colName);

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        base("todos"),
        (snap) => {
          const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["todos"];
          setDb((prev) => ({ ...prev, todos }));
        },
        (err) => {
          console.error("[Firestore] onSnapshot(todos) failed", err);
          setFirestoreError(typeof (err as any)?.message === "string" ? (err as any).message : String(err));
        },
      ),
    );

    unsubs.push(
      onSnapshot(base("issues"), (snap) => {
        const issues = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["issues"];
        setDb((prev) => ({ ...prev, issues }));
      }),
    );

    unsubs.push(
      onSnapshot(base("goals"), (snap) => {
        const goals = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["goals"];
        setDb((prev) => ({ ...prev, goals }));
      }),
    );

    unsubs.push(
      onSnapshot(base("kpis"), (snap) => {
        const kpis = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["kpis"];
        setDb((prev) => ({ ...prev, kpis }));
      }),
    );

    unsubs.push(
      onSnapshot(base("kpiEntries"), (snap) => {
        const kpiEntries = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["kpiEntries"];
        setDb((prev) => ({ ...prev, kpiEntries }));
      }),
    );

    unsubs.push(
      onSnapshot(base("meetingTemplates"), (snap) => {
        const meetingTemplates = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["meetingTemplates"];
        setDb((prev) => ({ ...prev, meetingTemplates }));
      }),
    );

    const meetingRunsRef = collection(firestore, "companies", companyId, "teams", teamId, "meetingRuns");
    unsubs.push(
      onSnapshot(meetingRunsRef, (snap) => {
        const statusMap: Record<string, MeetingRunStatus> = {};
        const feedbackMap: Record<string, { rating: number; comment?: string }> = {};
        let notesForCurrentWeek = "";
        snap.docs.forEach((d) => {
          const data = d.data();
          const weekKey = d.id;
          const status = (data?.status as MeetingRunStatus | undefined) ?? "scheduled";
          statusMap[weekKey] = status;
          const rating = data?.rating as number | undefined;
          if (rating != null && Number.isFinite(rating)) {
            feedbackMap[weekKey] = { rating, comment: data?.comment as string | undefined };
          }
          if (weekKey === weekOf) {
            notesForCurrentWeek = (data?.notes as string | undefined) ?? "";
          }
        });
        setDb((prev) => ({
          ...prev,
          meetingNotes: notesForCurrentWeek,
          meetingRunStatus: statusMap,
          meetingFeedback: feedbackMap,
        }));
      }),
    );

    unsubs.push(
      onSnapshot(base("roles"), (snap) => {
        const roles = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["roles"];
        setDb((prev) => ({ ...prev, roles }));
      }),
    );

    unsubs.push(
      onSnapshot(base("users"), (snap) => {
        const users = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["users"];
        setDb((prev) => ({ ...prev, users }));
      }),
    );

    unsubs.push(
      onSnapshot(base("feedback"), (snap) => {
        const feedback = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["feedback"];
        setDb((prev) => ({ ...prev, feedback }));
      }),
    );

    const visionRef = doc(firestore, "companies", companyId, "teams", teamId, "vision", "default");
    unsubs.push(
      onSnapshot(visionRef, (snap) => {
        const data = snap.data();
        const vision: Vision = {
          purpose: (data?.purpose as string) ?? "",
          coreValues: Array.isArray(data?.coreValues) ? data.coreValues : [],
          focus: (data?.focus as string) ?? "",
        };
        setDb((prev) => ({ ...prev, vision }));
      }),
    );

    return () => {
      for (const u of unsubs) u();
    };
  }, [firestore, companyId, teamId, weekOf]);

  const api = useMemo<MockDbApi>(() => {
    const me = meFromAuth ?? (db.users[0] ?? { id: "u_me", name: "Me", initials: "ME" });

    const docRef = (colName: string, id: string) => {
      if (!firestore) return null;
      return doc(firestore, "companies", companyId, "teams", teamId, colName, id);
    };

    const meUser = db.users.find((u) => u.id === me.id);
    const meRole = meUser ? db.roles.find((r) => r.id === meUser.roleId) : null;
    const isOwner = meRole?.name === "Owner";

    return {
      db,
      me: { id: me.id, name: me.name },
      weekOf,
      firestore: { enabled: Boolean(firestore), error: firestoreError },

      hasPermission(code) {
        if (isOwner) return true;
        if (!meRole) return false;
        return meRole.permissionIds.includes(code);
      },

      getMeetingRunStatus(weekOfKey) {
        return db.meetingRunStatus[weekOfKey] ?? "scheduled";
      },

      setMeetingRunStatus(weekOfKey, status) {
        setDb((prev) => ({
          ...prev,
          meetingRunStatus: { ...prev.meetingRunStatus, [weekOfKey]: status },
        }));
        if (firestore) {
          const ref = doc(
            firestore,
            "companies",
            companyId,
            "teams",
            teamId,
            "meetingRuns",
            weekOfKey,
          );
          void setDoc(ref, { status }, { merge: true });
        }
      },

      setRolePermissions(roleId, permissionIds) {
        setDb((prev) => ({
          ...prev,
          roles: prev.roles.map((r) =>
            r.id === roleId ? { ...r, permissionIds } : r,
          ),
        }));
        if (firestore) {
          const ref = docRef("roles", roleId);
          if (ref) void updateDoc(ref, { permissionIds });
        }
      },

      setRoleParent(roleId, parentRoleId) {
        setDb((prev) => ({
          ...prev,
          roles: prev.roles.map((r) =>
            r.id === roleId ? { ...r, parentRoleId } : r,
          ),
        }));
        if (firestore) {
          const ref = docRef("roles", roleId);
          if (ref) void updateDoc(ref, { parentRoleId });
        }
      },

      createRole(payload) {
        const name = payload.name.trim();
        if (!name) return;
        const now = new Date().toISOString();
        const id = `role_${crypto.randomUUID().slice(0, 8)}`;
        const parentRoleId = payload.parentRoleId ?? null;
        const role = {
          id,
          name,
          permissionIds: [] as PermissionCode[],
          parentRoleId,
          createdAt: now,
        };
        if (firestore) {
          const ref = docRef("roles", id);
          if (ref) {
            void setDoc(ref, { id, name, permissionIds: [], parentRoleId, createdAt: now });
            return;
          }
        }
        setDb((prev) => ({ ...prev, roles: [...prev.roles, role] }));
      },

      updateRole(roleId, payload) {
        const existing = db.roles.find((r) => r.id === roleId);
        if (!existing || existing.name === "Owner") return;
        const name = payload.name?.trim();
        if (name === undefined || name === existing.name) return;
        const next = { ...existing, name };
        setDb((prev) => ({
          ...prev,
          roles: prev.roles.map((r) => (r.id === roleId ? next : r)),
        }));
        if (firestore) {
          const ref = docRef("roles", roleId);
          if (ref) void updateDoc(ref, { name: next.name });
        }
      },

      deleteRole(roleId) {
        const role = db.roles.find((r) => r.id === roleId);
        if (!role || role.name === "Owner") return;
        const usersWithRole = db.users.filter((u) => u.roleId === roleId);
        if (usersWithRole.length > 0) {
          throw new Error(
            `Cannot delete role "${role.name}": ${usersWithRole.length} user(s) have this role. Reassign them first in People.`,
          );
        }
        setDb((prev) => ({
          ...prev,
          roles: prev.roles.filter((r) => r.id !== roleId),
        }));
        if (firestore) {
          const ref = docRef("roles", roleId);
          if (ref) void deleteDoc(ref);
        }
      },

      createTodo(title, options) {
        const now = new Date().toISOString();
        const ownerId =
          options?.source === "slack" && options?.ownerId === undefined
            ? undefined
            : (options?.ownerId ?? me.id);
        const payload = {
          title,
          ...(ownerId !== undefined && ownerId !== "" ? { ownerId } : {}),
          status: "open" as const,
          createdAt: now,
          ...(options?.dueDate !== undefined ? { dueDate: options.dueDate } : {}),
          ...(options?.source !== undefined ? { source: options.source } : {}),
          ...(options?.sourceMeta !== undefined ? { sourceMeta: options.sourceMeta } : {}),
        };
        if (firestore) {
          const id = `td_${crypto.randomUUID().slice(0, 10)}`;
          const ref = docRef("todos", id);
          if (ref) {
            void setDoc(ref, payload);
            return;
          }
        }
        setDb((prev) => ({
          ...prev,
          todos: [
            {
              id: `td_${crypto.randomUUID().slice(0, 6)}`,
              title,
              ownerId: payload.ownerId,
              status: "open",
              createdAt: now,
              dueDate: options?.dueDate,
              source: options?.source,
              sourceMeta: options?.sourceMeta,
            },
            ...prev.todos,
          ],
        }));
      },

      updateTodo(todoId, payload) {
        const existing = db.todos.find((t) => t.id === todoId);
        if (!existing) return;
        const updates: Partial<typeof existing> = {};
        if (payload.title !== undefined) updates.title = payload.title.trim();
        if (payload.dueDate !== undefined) updates.dueDate = payload.dueDate || undefined;
        if (payload.ownerId !== undefined) updates.ownerId = payload.ownerId || undefined;
        if (payload.notes !== undefined) updates.notes = payload.notes.trim() || undefined;
        if (Object.keys(updates).length === 0) return;
        if (firestore) {
          const ref = docRef("todos", todoId);
          if (ref) void updateDoc(ref, updates);
        }
        setDb((prev) => ({
          ...prev,
          todos: prev.todos.map((t) =>
            t.id === todoId ? { ...t, ...updates } : t,
          ),
        }));
      },

      deleteTodo(todoId) {
        if (firestore) {
          const ref = docRef("todos", todoId);
          if (ref) void deleteDoc(ref);
        }
        setDb((prev) => ({
          ...prev,
          todos: prev.todos.filter((t) => t.id !== todoId),
        }));
      },

      toggleTodo(todoId) {
        const existing = db.todos.find((t) => t.id === todoId);
        const now = new Date().toISOString();
        const isMarkingDone = existing?.status !== "done";
        if (firestore && existing) {
          const ref = docRef("todos", todoId);
          if (ref) {
            void updateDoc(ref, isMarkingDone
              ? { status: "done", completedAt: now, completedBy: me.id }
              : { status: "open", completedAt: deleteField(), completedBy: deleteField() },
            );
            return;
          }
        }
        setDb((prev) => ({
          ...prev,
          todos: prev.todos.map((t) =>
            t.id === todoId
              ? isMarkingDone
                ? { ...t, status: "done", completedAt: now, completedBy: me.id }
                : { ...t, status: "open", completedAt: undefined, completedBy: undefined }
              : t,
          ),
        }));
      },

      createFeedback(message, page, userName) {
        const trimmed = message?.trim();
        if (!trimmed) return;
        const now = new Date().toISOString();
        const id = `fb_${crypto.randomUUID().slice(0, 8)}`;
        const item = {
          id,
          userId: me.id,
          userName: (userName?.trim() || me.name) as string,
          page,
          message: trimmed,
          createdAt: now,
        };
        if (firestore) {
          const ref = doc(firestore, "companies", companyId, "teams", teamId, "feedback", id);
          void setDoc(ref, item);
        }
        setDb((prev) => {
          const next = [item, ...prev.feedback];
          if (!firestore) {
            try {
              localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(next));
            } catch {
              /* ignore */
            }
          }
          return { ...prev, feedback: next };
        });
      },

      deleteFeedback(feedbackId) {
        if (firestore) {
          const ref = doc(firestore, "companies", companyId, "teams", teamId, "feedback", feedbackId);
          void deleteDoc(ref);
        }
        setDb((prev) => {
          const next = prev.feedback.filter((f) => f.id !== feedbackId);
          if (!firestore) {
            try {
              localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(next));
            } catch {
              /* ignore */
            }
          }
          return { ...prev, feedback: next };
        });
      },

      createIssue(title, notes) {
        const now = new Date().toISOString();
        const nextPriority =
          Math.max(1, ...db.issues.map((i) => i.priority), 0) + 1;
        if (firestore) {
          const id = `is_${crypto.randomUUID().slice(0, 10)}`;
          const ref = docRef("issues", id);
          if (ref) {
            void setDoc(ref, {
              title,
              status: "open",
              priority: Math.min(5, nextPriority),
              createdAt: now,
              ...(notes != null && notes.trim() && { notes: notes.trim() }),
            });
            return;
          }
        }
        setDb((prev) => ({
          ...prev,
          issues: [
            {
              id: `is_${crypto.randomUUID().slice(0, 6)}`,
              title,
              status: "open",
              priority: Math.min(5, nextPriority),
              createdAt: now,
              ...(notes != null && notes.trim() && { notes: notes.trim() }),
            },
            ...prev.issues,
          ],
        }));
      },

      resolveIssue(issueId) {
        if (firestore) {
          const ref = docRef("issues", issueId);
          if (ref) {
            void updateDoc(ref, { status: "resolved" });
            return;
          }
        }
        setDb((prev) => ({
          ...prev,
          issues: prev.issues.map((i) =>
            i.id === issueId ? { ...i, status: "resolved" } : i,
          ),
        }));
      },

      reopenIssue(issueId) {
        if (firestore) {
          const ref = docRef("issues", issueId);
          if (ref) {
            void updateDoc(ref, { status: "open" });
            return;
          }
        }
        setDb((prev) => ({
          ...prev,
          issues: prev.issues.map((i) =>
            i.id === issueId ? { ...i, status: "open" } : i,
          ),
        }));
      },

      createGoal(title, dueDateParam) {
        const now = new Date();
        const defaultDue = new Date(now.getTime() + 75 * 86400_000);
        const dueDate = (dueDateParam?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dueDateParam))
          ? dueDateParam
          : isoDateOnly(defaultDue);
        const ownerId = me?.id ?? db.users[0]?.id ?? "u_me";
        if (firestore) {
          const id = `g_${crypto.randomUUID().slice(0, 10)}`;
          const ref = docRef("goals", id);
          if (ref) {
            void setDoc(ref, {
              title,
              ownerId,
              status: "onTrack",
              dueDate,
              createdAt: now.toISOString(),
            });
            return;
          }
        }
        setDb((prev) => ({
          ...prev,
          goals: [
            {
              id: `g_${crypto.randomUUID().slice(0, 6)}`,
              title,
              ownerId,
              status: "onTrack",
              dueDate,
              createdAt: now.toISOString(),
            },
            ...prev.goals,
          ],
        }));
      },

      setGoalStatus(goalId, status) {
        setDb((prev) => ({
          ...prev,
          goals: prev.goals.map((g) => (g.id === goalId ? { ...g, status } : g)),
        }));
        if (firestore) {
          const ref = docRef("goals", goalId);
          if (ref) void updateDoc(ref, { status });
        }
      },

      upsertKpiEntry(kpiId, weekOfValue, value) {
        const now = new Date().toISOString();
        if (firestore) {
          const id = `${kpiId}__${weekOfValue}`;
          const ref = docRef("kpiEntries", id);
          if (ref) {
            void setDoc(
              ref,
              { kpiId, weekOf: weekOfValue, value, createdAt: now },
              { merge: true },
            );
            return;
          }
        }
        setDb((prev) => {
          const existingIdx = prev.kpiEntries.findIndex(
            (e) => e.kpiId === kpiId && e.weekOf === weekOfValue,
          );
          if (existingIdx >= 0) {
            const next = [...prev.kpiEntries];
            next[existingIdx] = { ...next[existingIdx], value };
            return { ...prev, kpiEntries: next };
          }
          return {
            ...prev,
            kpiEntries: [
              { id: `ke_${crypto.randomUUID().slice(0, 6)}`, kpiId, weekOf: weekOfValue, value, createdAt: now },
              ...prev.kpiEntries,
            ],
          };
        });
      },

      createKpi(payload) {
        const now = new Date().toISOString();
        const id = `kpi_${crypto.randomUUID().slice(0, 8)}`;
        const kpi = {
          id,
          title: payload.title.trim(),
          ownerId: payload.ownerId,
          goal: Number(payload.goal) || 0,
          unit: payload.unit.trim() || "count",
          createdAt: now,
        };
        if (firestore) {
          const ref = docRef("kpis", id);
          if (ref) {
            void setDoc(ref, { title: kpi.title, ownerId: kpi.ownerId, goal: kpi.goal, unit: kpi.unit, createdAt: now });
            return;
          }
        }
        setDb((prev) => ({ ...prev, kpis: [...prev.kpis, kpi] }));
      },

      updateKpi(kpiId, payload) {
        const existing = db.kpis.find((k) => k.id === kpiId);
        if (!existing) return;
        const next = {
          ...existing,
          ...(payload.title !== undefined && { title: payload.title.trim() }),
          ...(payload.goal !== undefined && { goal: Number(payload.goal) || existing.goal }),
          ...(payload.unit !== undefined && { unit: payload.unit.trim() || existing.unit }),
          ...(payload.ownerId !== undefined && { ownerId: payload.ownerId }),
        };
        setDb((prev) => ({
          ...prev,
          kpis: prev.kpis.map((k) => (k.id === kpiId ? next : k)),
        }));
        if (firestore) {
          const ref = docRef("kpis", kpiId);
          if (ref) {
            const updates: Record<string, unknown> = {};
            if (payload.title !== undefined) updates.title = next.title;
            if (payload.goal !== undefined) updates.goal = next.goal;
            if (payload.unit !== undefined) updates.unit = next.unit;
            if (payload.ownerId !== undefined) updates.ownerId = next.ownerId;
            if (Object.keys(updates).length) void updateDoc(ref, updates);
          }
        }
      },

      deleteKpi(kpiId) {
        setDb((prev) => ({
          ...prev,
          kpis: prev.kpis.filter((k) => k.id !== kpiId),
          kpiEntries: prev.kpiEntries.filter((e) => e.kpiId !== kpiId),
        }));
        if (firestore) {
          const ref = docRef("kpis", kpiId);
          if (ref) void deleteDoc(ref);
          const entriesToDelete = db.kpiEntries.filter((e) => e.kpiId === kpiId);
          for (const e of entriesToDelete) {
            const entryRef = docRef("kpiEntries", `${e.kpiId}__${e.weekOf}`);
            if (entryRef) void deleteDoc(entryRef);
          }
        }
      },

      setMeetingNotes(notes) {
        if (firestore) {
          const ref = doc(
            firestore,
            "companies",
            companyId,
            "teams",
            teamId,
            "meetingRuns",
            weekOf,
          );
          void setDoc(ref, { notes }, { merge: true });
          return;
        }
        setDb((prev) => ({ ...prev, meetingNotes: notes }));
      },

      setMeetingFeedback(weekOfKey, ratingValue, commentText) {
        setDb((prev) => ({
          ...prev,
          meetingFeedback: {
            ...prev.meetingFeedback,
            [weekOfKey]: { rating: ratingValue, comment: commentText },
          },
        }));
        if (firestore) {
          const ref = doc(
            firestore,
            "companies",
            companyId,
            "teams",
            teamId,
            "meetingRuns",
            weekOfKey,
          );
          void setDoc(ref, { rating: ratingValue, comment: commentText ?? null }, { merge: true });
        }
      },

      getMeetingRatingsAverage() {
        const entries = Object.values(db.meetingFeedback ?? {});
        if (entries.length === 0) return null;
        const sum = entries.reduce((a, e) => a + e.rating, 0);
        return Math.round((sum / entries.length) * 10) / 10;
      },

      getVision() {
        return db.vision ?? { purpose: "", coreValues: [], focus: "" };
      },

      setVision(visionPayload) {
        setDb((prev) => ({ ...prev, vision: visionPayload }));
        if (firestore) {
          const ref = doc(firestore, "companies", companyId, "teams", teamId, "vision", "default");
          void setDoc(ref, visionPayload, { merge: true });
        }
      },

      getMeetingTemplate(templateId?: string) {
        if (templateId) return db.meetingTemplates.find((t) => t.id === templateId);
        return db.meetingTemplates[0];
      },

      meetingSectionOrder() {
        const t = db.meetingTemplates[0];
        return t ? t.sections.map((s) => s.kind) : [];
      },

      createUser(payload) {
        const name = payload.name.trim();
        const email = payload.email?.trim() || undefined;
        const initials =
          payload.initials?.trim().slice(0, 4) ||
          name
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 4) ||
          "??";
        const id = `u_${crypto.randomUUID().slice(0, 8)}`;
        const user = { id, name, initials, roleId: payload.roleId, ...(email && { email }) };
        if (firestore) {
          const ref = docRef("users", id);
          if (ref) {
            void setDoc(ref, { name, initials, roleId: payload.roleId, ...(email && { email }) });
            return;
          }
        }
        setDb((prev) => ({ ...prev, users: [...prev.users, user] }));
      },

      updateUser(userId, payload) {
        const existing = db.users.find((u) => u.id === userId);
        if (!existing) return;
        const next = {
          ...existing,
          ...(payload.name !== undefined && { name: payload.name.trim() }),
          ...(payload.roleId !== undefined && { roleId: payload.roleId }),
          ...(payload.email !== undefined && { email: payload.email?.trim() || undefined }),
          ...(payload.initials !== undefined && { initials: payload.initials.trim().slice(0, 4) }),
          ...(payload.avatarUrl !== undefined && { avatarUrl: payload.avatarUrl || undefined }),
          ...(payload.avatarStyle !== undefined && { avatarStyle: payload.avatarStyle }),
          ...(payload.avatarColor !== undefined && { avatarColor: payload.avatarColor }),
        };
        setDb((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? next : u)),
        }));
        if (firestore) {
          const ref = docRef("users", userId);
          if (ref) {
            const updates: Record<string, string | undefined> = {};
            if (payload.name !== undefined) updates.name = next.name;
            if (payload.roleId !== undefined) updates.roleId = next.roleId;
            if (payload.email !== undefined) updates.email = next.email;
            if (payload.initials !== undefined) updates.initials = next.initials;
            if (payload.avatarUrl !== undefined) updates.avatarUrl = next.avatarUrl;
            if (payload.avatarStyle !== undefined) updates.avatarStyle = next.avatarStyle;
            if (payload.avatarColor !== undefined) updates.avatarColor = next.avatarColor;
            if (Object.keys(updates).length) void updateDoc(ref, updates);
            return;
          }
        }
      },

      deleteUser(userId) {
        setDb((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== userId) }));
        if (firestore) {
          const ref = docRef("users", userId);
          if (ref) void deleteDoc(ref);
        }
      },

      createMeetingTemplate(payload) {
        const id = `mt_${crypto.randomUUID().slice(0, 8)}`;
        const template: MeetingTemplate = {
          id,
          title: payload.title.trim(),
          sections: payload.sections.map((s) => ({ ...s, id: s.id || `ms_${crypto.randomUUID().slice(0, 6)}` })),
          createdAt: new Date().toISOString(),
        };
        if (firestore) {
          const ref = docRef("meetingTemplates", id);
          if (ref) {
            void setDoc(ref, { title: template.title, sections: template.sections, createdAt: template.createdAt });
            return;
          }
        }
        setDb((prev) => ({ ...prev, meetingTemplates: [...prev.meetingTemplates, template] }));
      },

      updateMeetingTemplate(templateId, payload) {
        const existing = db.meetingTemplates.find((t) => t.id === templateId);
        if (!existing) return;
        const next: MeetingTemplate = {
          ...existing,
          ...(payload.title !== undefined && { title: payload.title.trim() }),
          ...(payload.sections !== undefined && {
            sections: payload.sections.map((s) => ({ ...s, id: s.id || `ms_${crypto.randomUUID().slice(0, 6)}` })),
          }),
          ...(payload.schedule !== undefined && { schedule: payload.schedule ?? undefined }),
        };
        setDb((prev) => ({
          ...prev,
          meetingTemplates: prev.meetingTemplates.map((t) => (t.id === templateId ? next : t)),
        }));
        if (firestore) {
          const ref = docRef("meetingTemplates", templateId);
          if (ref) {
            const updates: Record<string, unknown> = {};
            if (payload.title !== undefined) updates.title = next.title;
            if (payload.sections !== undefined) updates.sections = next.sections;
            if (payload.schedule !== undefined) updates.schedule = next.schedule ?? null;
            if (Object.keys(updates).length) void updateDoc(ref, updates);
          }
        }
      },

      deleteMeetingTemplate(templateId) {
        setDb((prev) => ({
          ...prev,
          meetingTemplates: prev.meetingTemplates.filter((t) => t.id !== templateId),
        }));
        if (firestore) {
          const ref = docRef("meetingTemplates", templateId);
          if (ref) void deleteDoc(ref);
        }
      },
    };
  }, [companyId, db, firestore, firestoreError, meFromAuth, teamId, weekOf]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useMockDb() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMockDb must be used within MockDbProvider");
  return ctx;
}

