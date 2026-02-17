"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { GoalStatus, MeetingSectionKind, PermissionCode } from "@/lib/domain";
import type { MockDb, MeetingRunStatus } from "@/lib/mock/mockData";
import { createInitialMockDb, startOfWeek } from "@/lib/mock/mockData";
import { isFirebaseConfigured, getFirebaseDb } from "@/lib/firebase/client";
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth/AuthProvider";

type MockDbApi = {
  db: MockDb;
  me: { id: string; name: string };
  weekOf: string;

  /** True if current user's role has the permission (Owner has all). */
  hasPermission(code: PermissionCode): boolean;
  /** Status for the given week; defaults to "scheduled". */
  getMeetingRunStatus(weekOf: string): MeetingRunStatus;
  setMeetingRunStatus(weekOf: string, status: MeetingRunStatus): void;
  setRolePermissions(roleId: string, permissionIds: PermissionCode[]): void;

  createTodo(title: string): void;
  toggleTodo(todoId: string): void;

  createIssue(title: string): void;
  resolveIssue(issueId: string): void;
  reopenIssue(issueId: string): void;

  createGoal(title: string): void;
  setGoalStatus(goalId: string, status: GoalStatus): void;

  upsertKpiEntry(kpiId: string, weekOf: string, value: number): void;

  setMeetingNotes(notes: string): void;
  getMeetingTemplate(): MockDb["meetingTemplates"][number] | undefined;
  meetingSectionOrder(): MeetingSectionKind[];
};

const Ctx = createContext<MockDbApi | null>(null);

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function MockDbProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<MockDb>(() => createInitialMockDb());
  const authState = useAuth();

  const useFirestore =
    process.env.NEXT_PUBLIC_USE_FIRESTORE === "true" && isFirebaseConfigured();
  const firestore = useFirestore ? getFirebaseDb() : null;

  const companyId = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
  const teamId = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

  const weekOf = isoDateOnly(startOfWeek(new Date()));
  const meFromAuth = useMemo(() => {
    if (!authState.user) return null;
    return { id: authState.user.uid, name: authState.user.email ?? "User" };
  }, [authState.user]);

  // Firestore subscriptions (optional, enabled by env vars).
  useEffect(() => {
    if (!firestore) return;

    const base = (colName: string) =>
      collection(firestore, "companies", companyId, "teams", teamId, colName);

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(base("todos"), (snap) => {
        const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockDb["todos"];
        setDb((prev) => ({ ...prev, todos }));
      }),
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

    unsubs.push(
      onSnapshot(doc(firestore, "companies", companyId, "teams", teamId, "meetingRuns", weekOf), (snap) => {
        const data = snap.data();
        const notes = (data?.notes as string | undefined) ?? "";
        const status = (data?.status as MeetingRunStatus | undefined) ?? "scheduled";
        setDb((prev) => ({
          ...prev,
          meetingNotes: notes,
          meetingRunStatus: { ...prev.meetingRunStatus, [weekOf]: status },
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

      createTodo(title) {
        const now = new Date().toISOString();
        if (firestore) {
          const id = `td_${crypto.randomUUID().slice(0, 10)}`;
          const ref = docRef("todos", id);
          if (ref) {
            void setDoc(ref, {
              title,
              ownerId: me.id,
              status: "open",
              createdAt: now,
            });
            return;
          }
        }
        setDb((prev) => ({
          ...prev,
          todos: [
            {
              id: `td_${crypto.randomUUID().slice(0, 6)}`,
              title,
              ownerId: me.id,
              status: "open",
              createdAt: now,
            },
            ...prev.todos,
          ],
        }));
      },

      toggleTodo(todoId) {
        const existing = db.todos.find((t) => t.id === todoId);
        if (firestore && existing) {
          const ref = docRef("todos", todoId);
          if (ref) {
            void updateDoc(ref, {
              status: existing.status === "done" ? "open" : "done",
            });
            return;
          }
        }
        setDb((prev) => ({
          ...prev,
          todos: prev.todos.map((t) =>
            t.id === todoId
              ? { ...t, status: t.status === "done" ? "open" : "done" }
              : t,
          ),
        }));
      },

      createIssue(title) {
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

      createGoal(title) {
        const now = new Date();
        const due = new Date(now.getTime() + 75 * 86400_000);
        const ownerId = me?.id ?? db.users[0]?.id ?? "u_me";
        if (firestore) {
          const id = `g_${crypto.randomUUID().slice(0, 10)}`;
          const ref = docRef("goals", id);
          if (ref) {
            void setDoc(ref, {
              title,
              ownerId,
              status: "onTrack",
              dueDate: isoDateOnly(due),
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
              dueDate: isoDateOnly(due),
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

      getMeetingTemplate() {
        return db.meetingTemplates[0];
      },

      meetingSectionOrder() {
        const t = db.meetingTemplates[0];
        return t ? t.sections.map((s) => s.kind) : [];
      },
    };
  }, [companyId, db, firestore, meFromAuth, teamId, weekOf]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useMockDb() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMockDb must be used within MockDbProvider");
  return ctx;
}

