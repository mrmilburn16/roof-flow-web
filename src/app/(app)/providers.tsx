"use client";

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { ToastProvider } from "@/lib/toast/ToastProvider";
import { MockDbProvider } from "@/lib/mock/MockDbProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MockDbProvider>{children}</MockDbProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

