"use client";

import { Sun, Cloud, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { ThemeId } from "@/lib/theme/ThemeProvider";

const icons: Record<ThemeId, React.ComponentType<{ className?: string }>> = {
  dawn: Sun,
  slate: Cloud,
  onyx: Moon,
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Theme
      </div>
      <div className="mt-2 flex gap-1 rounded-[var(--radius)] bg-[var(--surface)] p-1 shadow-[var(--shadow-sm)]">
        {(["slate", "onyx", "dawn"] as const).map((id) => {
          const Icon = icons[id];
          const active = theme === id;
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              title={id}
              style={
                active
                  ? {
                      background: "var(--nav-active-bg)",
                      boxShadow: "var(--nav-active-shadow)",
                      color: "#ffffff",
                    }
                  : undefined
              }
              className={[
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[12px] font-medium transition",
                active
                  ? "!text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-secondary)]",
              ].join(" ")}
            >
              <Icon className="size-3.5" />
              <span className="capitalize">{id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
