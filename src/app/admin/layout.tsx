"use client";

import { RequireAuth, RequireRole } from "@/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

export default function AdminPortalLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireRole staff redirectTo="/app/dashboard">
        <AppShell>{children}</AppShell>
      </RequireRole>
    </RequireAuth>
  );
}
