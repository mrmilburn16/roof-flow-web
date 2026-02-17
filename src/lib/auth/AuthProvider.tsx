"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
  useFirebaseAuthEnabled,
} from "@/lib/firebase/client";

type AuthState = {
  enabled: boolean;
  configured: boolean;
  loading: boolean;
  user: User | null;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const enabled = useFirebaseAuthEnabled();
  const configured = isFirebaseConfigured();
  const auth = getFirebaseAuth();

  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || !configured || !auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, [auth, enabled, configured]);

  const loading = Boolean(enabled && configured && auth && !ready);

  const value = useMemo<AuthState>(
    () => ({ enabled, configured, loading, user }),
    [enabled, configured, loading, user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

