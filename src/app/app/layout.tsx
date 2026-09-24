"use client";

import { RequireAuth } from "@/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { KycWizardModal } from "@/components/kyc/KycWizardModal";
import { useAuth } from "@/auth/AuthProvider";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

function ClientPortalLayoutInner({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [kycOpen, setKycOpen] = useState(false);

  useEffect(() => {
    // Open if forced via URL
    const forceOpen = searchParams.get("kyc") === "true";
    if (forceOpen) {
      setKycOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <AppShell>{children}</AppShell>
      {kycOpen && <KycWizardModal open={kycOpen} onOpenChange={setKycOpen} />}
    </>
  );
}

export default function ClientPortalLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <ClientPortalLayoutInner>{children}</ClientPortalLayoutInner>
    </RequireAuth>
  );
}
