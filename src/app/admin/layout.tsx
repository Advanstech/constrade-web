"use client";

import { RequireAuth, RequireRole } from "@/auth/RequireAuth";
import { AdminShell } from "@/components/layout/AdminShell";
import type { ReactNode } from "react";

export default function AdminPortalLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireRole staff redirectTo="/app/dashboard">
        <AdminShell>{children}</AdminShell>
      </RequireRole>
    </RequireAuth>
  );
}
