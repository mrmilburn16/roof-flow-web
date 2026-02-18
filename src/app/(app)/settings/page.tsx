"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import { Settings, Palette, Database, Zap, Shield } from "lucide-react";
import { createInitialMockDb, startOfWeek } from "@/lib/mock/mockData";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { THEMES } from "@/lib/theme/ThemeProvider";
import { PageTitle, card, btnPrimary, StatusBadge, inputBase } from "@/components/ui";

export default function SettingsPage() {
  const firestore = getFirebaseDb();
  const configured = isFirebaseConfigured();
  const companyId = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
  const teamId = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";
  const authEnabled = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === "true";
  const useFirestore = process.env.NEXT_PUBLIC_USE_FIRESTORE === "true";
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const scope = useMemo(() => ({ companyId, teamId }), [companyId, teamId]);

  async function seed() {
    setMsg(null);
    if (!configured || !firestore) {
      setMsg({ type: "error", text: "Firebase is not configured. Add env keys first." });
      return;
    }
    setBusy(true);
    try {
      const db = createInitialMockDb();
      const base = (colName: string) =>
        collection(
          firestore,
          "companies",
          scope.companyId,
          "teams",
          scope.teamId,
          colName,
        );

      await Promise.all([
        ...db.todos.map((t) =>
          setDoc(
            doc(base("todos"), t.id),
            { ...t, id: undefined },
            { merge: true },
          ),
        ),
        ...db.issues.map((i) =>
          setDoc(
            doc(base("issues"), i.id),
            { ...i, id: undefined },
            { merge: true },
          ),
        ),
        ...db.goals.map((g) =>
          setDoc(
            doc(base("goals"), g.id),
            { ...g, id: undefined },
            { merge: true },
          ),
        ),
        ...db.kpis.map((k) =>
          setDoc(
            doc(base("kpis"), k.id),
            { ...k, id: undefined },
            { merge: true },
          ),
        ),
        ...db.kpiEntries.map((e) =>
          setDoc(
            doc(base("kpiEntries"), e.id),
            { ...e, id: undefined },
            { merge: true },
          ),
        ),
        ...db.meetingTemplates.map((t) =>
          setDoc(
            doc(base("meetingTemplates"), t.id),
            { ...t, id: undefined },
            { merge: true },
          ),
        ),
        ...db.roles.map((r) =>
          setDoc(
            doc(base("roles"), r.id),
            { ...r, id: undefined },
            { merge: true },
          ),
        ),
        ...db.users.map((u) =>
          setDoc(
            doc(base("users"), u.id),
            { ...u, id: undefined },
            { merge: true },
          ),
        ),
      ]);

      const weekOf = startOfWeek(new Date()).toISOString().slice(0, 10);
      await setDoc(
        doc(
          firestore,
          "companies",
          scope.companyId,
          "teams",
          scope.teamId,
          "meetingRuns",
          weekOf,
        ),
        { notes: "" },
        { merge: true },
      );

      setMsg({ type: "success", text: "Seeded Firestore with starter roofing data." });
    } catch (e: unknown) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Seeding failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle
        title="Settings"
        subtitle="Appearance, data source, and starter data."
      />

      <div className="space-y-6">
        {/* App */}
        <div className={card}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)]">
              <Settings className="size-4" />
              App
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--text-primary)]">
                  <Palette className="size-4 text-[var(--text-muted)]" />
                  Theme
                </div>
                <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                  App appearance. You can also change it in the sidebar.
                </p>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as "dawn" | "slate" | "onyx")}
                className={inputBase + " min-w-[140px] capitalize"}
                aria-label="Theme"
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {t.description}
                  </option>
                ))}
              </select>
            </div>
            {authEnabled && user && (
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-3">
                <div className="text-[12px] font-medium text-[var(--text-muted)]">Signed in</div>
                <div className="mt-0.5 text-[14px] font-medium text-[var(--text-primary)]">
                  {user.email ?? "User"}
                </div>
              </div>
            )}
            <Link
              href="/roles"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Shield className="size-4" />
              Roles & permissions
            </Link>
          </div>
        </div>

        {/* Data & Firebase */}
        <div className={card}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)]">
              <Database className="size-4" />
              Data & Firebase
            </h2>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-[var(--border)] p-4">
              <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Firebase
              </div>
              <div className="mt-2">
                <StatusBadge
                  status={configured ? "success" : "warning"}
                  label={configured ? "Configured" : "Not configured"}
                />
              </div>
            </div>
            <div className="rounded-[var(--radius)] border border-[var(--border)] p-4">
              <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Mode
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge
                  status={useFirestore ? "success" : "neutral"}
                  label={useFirestore ? "Firestore" : "Mock"}
                />
                <StatusBadge
                  status={authEnabled ? "success" : "neutral"}
                  label={authEnabled ? "Auth on" : "Auth off"}
                />
              </div>
            </div>
            <div className="sm:col-span-2 rounded-[var(--radius)] border border-[var(--border)] p-4">
              <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Scope
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-[14px] text-[var(--text-primary)]">
                <span><span className="text-[var(--text-muted)]">Company</span> {scope.companyId}</span>
                <span><span className="text-[var(--text-muted)]">Team</span> {scope.teamId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Starter data */}
        <div className={card}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)]">
              <Zap className="size-4" />
              Seed starter data
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-[14px] text-[var(--text-secondary)]">
              Writes roofing-focused starter data into Firestore for{" "}
              <span className="font-medium text-[var(--text-primary)]">{scope.companyId}</span>
              {" / "}
              <span className="font-medium text-[var(--text-primary)]">{scope.teamId}</span>.
            </p>
            <ul className="list-inside list-disc text-[13px] text-[var(--text-muted)] space-y-1">
              <li>Weekly Leadership Meeting template (Check-in → Scorecard → Goals → To-Dos → Issues → Conclude)</li>
              <li>3 KPIs (Leads, Jobs sold, Gross margin)</li>
              <li>2 quarterly goals, 2 to-dos, 2 issues</li>
              <li>Roles (Owner, Sales, Project Manager, Crew Lead, Office Admin) and 1 user</li>
              <li>Sample KPI entries for current and past weeks</li>
            </ul>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={seed}
                disabled={busy}
                className={btnPrimary}
              >
                {busy ? "Seeding…" : "Seed Firestore"}
              </button>
              <span className="text-[13px] text-[var(--text-muted)]">
                Requires Firebase env keys.
              </span>
            </div>
            {msg && (
              <div
                className={`rounded-[var(--radius)] px-4 py-3 text-[14px] ${
                  msg.type === "success"
                    ? "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]"
                    : "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]"
                }`}
              >
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
