"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
  useFirebaseAuthEnabled,
} from "@/lib/firebase/client";

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const enabled = useFirebaseAuthEnabled();
  const configured = isFirebaseConfigured();
  const auth = getFirebaseAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canUse = useMemo(
    () => Boolean(enabled && configured && auth),
    [enabled, configured, auth],
  );

  async function submit() {
    setError(null);
    if (!canUse || !auth) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      router.replace(next);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <div className="mx-auto flex max-w-md flex-col gap-8 px-6 py-20">
        <div>
          <div className="text-[14px] font-semibold text-[var(--text-primary)]">Roof Flow</div>
          <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            {enabled
              ? configured
                ? "Use your team email to access Roof Flow."
                : "Firebase isn’t configured yet. Add env keys, then enable auth."
              : "Auth is disabled (mock mode). Set NEXT_PUBLIC_USE_FIREBASE_AUTH=true to require login."}
          </p>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("signin")}
              className={[
                "flex-1 rounded-[var(--radius)] px-4 py-2.5 text-[14px] font-medium transition",
                mode === "signin"
                  ? "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--muted-bg)]",
              ].join(" ")}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("signup")}
              className={[
                "flex-1 rounded-[var(--radius)] px-4 py-2.5 text-[14px] font-medium transition",
                mode === "signup"
                  ? "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--muted-bg)]",
              ].join(" ")}
            >
              Sign up
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-[13px] font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="you@company.com"
                disabled={!canUse}
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-1.5 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="••••••••"
                disabled={!canUse}
              />
            </div>

            {error ? (
              <div className="rounded-[var(--radius)] bg-rose-50 px-4 py-3 text-[14px] text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              onClick={submit}
              disabled={!canUse || busy || !email.trim() || password.length < 6}
              className="w-full rounded-[var(--radius)] bg-[var(--btn-primary-bg)] px-4 py-2.5 text-[14px] font-medium text-[var(--btn-primary-text)] transition hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>

            <p className="text-[13px] text-[var(--text-muted)]">
              Minimum 6 characters (Firebase default).
            </p>
          </div>
        </div>

        <p className="text-[13px] text-[var(--text-muted)]">
          You can keep auth disabled while iterating on UI.
        </p>
      </div>
    </div>
  );
}

