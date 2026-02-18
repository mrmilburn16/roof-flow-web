import { SidebarNav } from "@/components/SidebarNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppPageTitle } from "@/components/AppPageTitle";
import { PageTransition } from "@/components/PageTransition";
import { RequireAuth } from "@/components/RequireAuth";
import { Providers } from "./providers";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <RequireAuth>
        <div className="min-h-dvh">
          <div className="flex w-full gap-6 px-6 py-6">
            <aside
              className="sticky top-6 flex h-[calc(100dvh-3rem)] w-[240px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-xl)]"
              style={{
                background: "var(--sidebar-bg)",
                borderRight: "1px solid var(--sidebar-border)",
              }}
            >
              <div className="shrink-0 px-5 py-4">
                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  RoofFlow
                </div>
                <div className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                  Leadership Team
                </div>
              </div>
              <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
                <SidebarNav />
                <div className="mt-auto shrink-0">
                  <ThemeToggle />
                </div>
              </div>
            </aside>

            <main className="min-w-0 flex-1">
              <div className="px-8 pt-6 pb-2">
                <AppPageTitle />
              </div>
              <div className="px-8 py-8">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
        </div>
      </RequireAuth>
    </Providers>
  );
}
