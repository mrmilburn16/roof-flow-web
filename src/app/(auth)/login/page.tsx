import { Suspense } from "react";
import { LoginClient } from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]">
          <div className="text-sm text-[var(--text-muted)]">Loading…</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}

