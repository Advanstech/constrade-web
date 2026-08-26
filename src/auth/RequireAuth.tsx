"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import type { ReactNode } from "react";
import type { Role } from "@/lib/api.types";
import { isStaff } from "@/lib/permissions";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-bronze" />
    </div>
  );
}

/** Gate: requires an authenticated session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) return <FullScreenLoader />;
  return <>{children}</>;
}

/** Gate: requires a minimum role. `staff` bypasses to allow trader/compliance/admin. */
export function RequireRole({
  children,
  minimum,
  staff,
  redirectTo = "/app",
}: {
  children: ReactNode;
  minimum?: Role;
  staff?: boolean;
  redirectTo?: string;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace("/login");
      return;
    }

    if (!loading && profile) {
      const ok = minimum
        ? (["client", "trader", "compliance", "admin"] as Role[]).indexOf(profile.role) >=
          (["client", "trader", "compliance", "admin"] as Role[]).indexOf(minimum)
        : staff
          ? isStaff(profile.role)
          : true;
          
      if (!ok) {
        router.replace(redirectTo);
      }
    }
  }, [loading, user, profile, minimum, staff, redirectTo, router]);

  if (loading || !user || !profile) return <FullScreenLoader />;
  
  const ok = minimum
    ? (["client", "trader", "compliance", "admin"] as Role[]).indexOf(profile.role) >=
      (["client", "trader", "compliance", "admin"] as Role[]).indexOf(minimum)
    : staff
      ? isStaff(profile.role)
      : true;
      
  if (!ok) return <FullScreenLoader />;
  
  return <>{children}</>;
}
