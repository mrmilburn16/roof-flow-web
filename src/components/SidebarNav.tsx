"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  ClipboardList,
  TrendingUp,
  Target,
  CheckSquare,
  AlertCircle,
  Settings,
  Shield,
  Users,
  UserPlus,
  Compass,
  UserCircle,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/vision", label: "Vision", icon: Compass },
      { href: "/profile", label: "Profile", icon: UserCircle },
    ],
  },
  {
    label: "Meetings",
    items: [
      { href: "/meetings", label: "Meetings", icon: Calendar },
      { href: "/meetings/agendas", label: "Agendas", icon: ClipboardList },
    ],
  },
  {
    label: "Track",
    items: [
      { href: "/scorecard", label: "Scorecard", icon: TrendingUp },
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/todos", label: "To-Dos", icon: CheckSquare },
      { href: "/issues", label: "Issues", icon: AlertCircle },
      { href: "/accountability", label: "Accountability Chart", icon: Users },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/people", label: "People", icon: UserPlus },
      { href: "/roles", label: "Roles", icon: Shield },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const iconCls = "size-[18px] shrink-0";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-0">
      <div className="flex flex-col">
        {navGroups.map((group, index) => (
          <div
            key={group.label}
            className={
              index === 0
                ? "flex min-h-[88px] flex-col justify-center py-5"
                : "flex min-h-[88px] flex-col justify-center border-t border-[var(--border)] py-5"
            }
          >
            <div>
              <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {group.label}
              </div>
              <div className="flex flex-col gap-px">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-[14px] font-medium transition",
                        active
                          ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]",
                      ].join(" ")}
                    >
                      <Icon className={iconCls} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
