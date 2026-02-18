"use client";

import { usePathname } from "next/navigation";

const pathToTitle: Record<string, string> = {
  "/": "Overview",
  "/vision": "Vision",
  "/meetings": "Meetings",
  "/meetings/agendas": "Agendas",
  "/scorecard": "Scorecard",
  "/goals": "Goals",
  "/todos": "To-Dos",
  "/issues": "Issues",
  "/accountability": "Accountability Chart",
  "/profile": "Profile",
  "/people": "People",
  "/roles": "Roles",
  "/settings": "Settings",
  "/integrations": "Integrations",
  "/f/inbox": "Inbox",
};

export function AppPageTitle() {
  const pathname = usePathname();

  const title =
    pathToTitle[pathname] ??
    (pathname.startsWith("/meetings/agendas")
      ? "Agendas"
      : pathname.startsWith("/meetings/run")
        ? "Run meeting"
        : "Dashboard");

  return (
    <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
      {title}
    </h1>
  );
}
