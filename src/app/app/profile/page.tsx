"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  LogOut,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthProvider";
import { onboardingApi } from "@/lib/api";
import type { KycProgress } from "@/lib/api.types";
import { ROLE_LABEL } from "@/lib/permissions";

const ProfilePage = () => {
  const { profile, updateProfile, signOut } = useAuth();
  const navigate = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [kyc, setKyc] = useState<KycProgress | null>(null);

  useEffect(() => {
    void onboardingApi.progress().then(setKyc).catch(() => {});
  }, []);

  if (!profile) return null;

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName, phone });
      toast.success("Profile updated");
    } catch {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const kycApproved = profile.kyc_status === "approved";
  const kycPct = kyc ? Math.round((kyc.completedSteps / kyc.totalSteps) * 100) : 0;

  const kycBadge = kycApproved
    ? { label: "KYC Approved", cls: "bg-success/10 text-success" }
    : profile.kyc_status === "pending"
      ? { label: "KYC In Progress", cls: "bg-brand-bronze/15 text-brand-bronze" }
      : { label: "KYC " + profile.kyc_status, cls: "bg-danger/10 text-danger" };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Profile" subtitle="Your account, KYC status, CSD registration and security." />

      {/* KYC completion banner */}
      <Card
        className={
          kycApproved
            ? "mb-6 border-success/30"
            : "mb-6 border-brand-bronze/30"
        }
      >
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {kycApproved ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" />
            ) : (
              <Loader2 className="mt-0.5 h-6 w-6 shrink-0 animate-spin text-brand-bronze" />
            )}
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-card-foreground">
                {kycApproved
                  ? "KYC complete — you're ready to trade"
                  : `KYC ${kyc ? `${kyc.completedSteps} of ${kyc.totalSteps} steps` : ""} completed`}
              </p>
              {kycApproved ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Your identity has been verified and your CSD account is active.
                </p>
              ) : (
                <>
                  <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-brand transition-all duration-300"
                      style={{ width: `${kycPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Trading is restricted until your account opening &amp; KYC is complete.
                  </p>
                </>
              )}
            </div>
          </div>
          <Button
            asChild
            variant={kycApproved ? "outline" : "premium"}
            size="sm"
            className="shrink-0"
          >
            <Link href="?kyc=true">
              {kycApproved ? "Review & update KYC" : "Continue application"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* KYC details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <ShieldCheck className="h-4 w-4 text-brand-bronze" /> KYC details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const rec = (v: unknown) =>
              (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
            const field = (o: Record<string, unknown>, key: string): string | null => {
              const v = o[key];
              return typeof v === "string" && v.trim() ? v : null;
            };
            const ind = rec(kyc?.data?.individualProfile);
            const corp = rec(kyc?.data?.corporateProfile);
            const emp = rec(kyc?.data?.employmentDetails);
            const tax = rec(kyc?.data?.taxDetails);
            const fin = rec(kyc?.data?.financialInfo);
            const bank = rec(kyc?.data?.bankDetails);
            const docs = Array.isArray(kyc?.data?.documents)
              ? (kyc!.data!.documents as { id: string; type: string; status: string; fileName?: string }[])
              : [];
            const hasAny =
              Object.keys(ind).length ||
              Object.keys(corp).length ||
              Object.keys(emp).length ||
              Object.keys(tax).length ||
              Object.keys(fin).length ||
              Object.keys(bank).length ||
              docs.length;

            const Item = ({ label, value }: { label: string; value?: string | null }) =>
              value ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-sm font-medium text-card-foreground">{value}</p>
                </div>
              ) : null;

            const mask = (v?: string | null) => (v ? `••••${v.slice(-4)}` : null);
            const dobRaw = field(ind, "dateOfBirth");
            const dob = dobRaw
              ? new Date(dobRaw).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : null;
            const idNumber =
              field(ind, "idDocumentType") === "PASSPORT"
                ? field(ind, "passportNumber")
                : field(ind, "ghanaCardNumber");

            if (!kyc) {
              return <p className="text-sm text-muted-foreground">Loading KYC details…</p>;
            }
            if (!hasAny) {
              return (
                <p className="text-sm text-muted-foreground">
                  No KYC details saved yet — open the wizard to complete your profile.
                </p>
              );
            }

            return (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                  {field(corp, "companyName") && <Item label="Company" value={field(corp, "companyName")} />}
                  {field(corp, "registrationNumber") && <Item label="Registration No." value={field(corp, "registrationNumber")} />}
                  <Item label="ID document" value={field(ind, "idDocumentType")?.replace(/_/g, " ")} />
                  <Item label="ID number" value={idNumber} />
                  <Item label="Date of birth" value={dob} />
                  <Item label="Nationality" value={field(ind, "nationality")} />
                  <Item label="Occupation" value={field(ind, "occupation")} />
                  <Item label="Employer" value={field(emp, "employerName")} />
                  <Item label="Source of funds" value={field(ind, "sourceOfFunds")?.replace(/_/g, " ")} />
                  <Item label="TIN" value={mask(field(tax, "tinNumber"))} />
                  <Item label="Bank" value={field(bank, "bankName")} />
                  <Item label="Account" value={mask(field(bank, "accountNumber"))} />
                  <Item label="Investment objectives" value={field(fin, "investmentObjectives")?.replace(/_/g, " ")} />
                  {field(ind, "residentialAddress") && <Item label="Residential address" value={field(ind, "residentialAddress")} />}
                </div>

                {docs.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Documents on file
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {docs.map((d) => (
                        <Badge
                          key={d.id}
                          className={
                            d.status === "APPROVED"
                              ? "bg-success/10 text-success"
                              : d.status === "REJECTED"
                                ? "bg-danger/10 text-danger"
                                : "bg-brand-bronze/15 text-brand-bronze"
                          }
                        >
                          {d.type.replace(/_/g, " ")} · {d.status.toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {kycApproved && (
                  <p className="text-xs text-muted-foreground">
                    Need to change something? Reopen the wizard — resubmitted details go back to
                    compliance for re-verification.
                  </p>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* CSD Form download */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-brand-bronze" />
            <div>
              <p className="font-display text-sm font-bold text-card-foreground">
                CSD Account Opening Form
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Download a filled-out PDF of your CSD Form 1 for your records or to submit to the depository.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              void onboardingApi.downloadCsdForm().then(() => {
                toast.success("CSD form downloaded");
              }).catch(() => {
                toast.error("Could not download CSD form");
              });
            }}
          >
            <Download className="h-4 w-4" /> Download CSD Form
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <UserRound className="h-4 w-4 text-brand-bronze" /> Personal details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 …" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile.email} disabled />
            </div>
            <Button variant="premium" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <CreditCard className="h-4 w-4 text-brand-bronze" /> CSD registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl bg-gradient-navy p-5 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                  CSD Account Number
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold tracking-wider">
                  {profile.csd_account || "—"}
                </p>
                <p className="mt-1 text-xs text-white/60">Central Securities Depository (Ghana) Ltd</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={kycBadge.cls}>{kycBadge.label}</Badge>
                <Badge className="bg-muted text-muted-foreground">{ROLE_LABEL[profile.role]}</Badge>
                {profile.onboarded && (
                  <Badge className="bg-success/10 text-success">Onboarded</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <ShieldCheck className="h-4 w-4 text-brand-bronze" /> Account access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your role determines which areas of the platform you can access. Contact
                support to change account details.
              </p>
              <Button
                variant="outline"
                onClick={async () => {
                  await signOut();
                  navigate.push("/");
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
