"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { enabled, configured, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return; // mock mode
    if (!configured) return; // allow UI to run until keys are set
    if (loading) return;
    if (!user) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
    }
  }, [enabled, configured, loading, user, pathname, router]);

  if (!enabled) return <>{children}</>;
  if (!configured) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-sm text-[var(--text-muted)]">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-sm text-[var(--text-muted)]">Redirecting to login…</div>
      </div>
    );
  }

  return <>{children}</>;
}

