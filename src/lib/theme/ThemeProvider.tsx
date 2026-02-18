"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeId = "dawn" | "slate" | "onyx";

type ThemeMeta = {
  id: ThemeId;
  label: string;
  description: string;
};

export const THEMES: ThemeMeta[] = [
  { id: "slate", label: "Slate", description: "Cool, formal" },
  { id: "onyx", label: "Onyx", description: "Deep dark" },
  { id: "dawn", label: "Dawn", description: "Warm neutral light" },
];

const STORAGE_KEY = "roofflow-theme";

function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "slate";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "dawn" || raw === "slate" || raw === "onyx") return raw;
  return "slate";
}

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
};

const Ctx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("slate");

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useMemo(
    () => (id: ThemeId) => {
      setThemeState(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, id);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ theme, setTheme }),
    [theme, setTheme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
