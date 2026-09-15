"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  Gavel,
  IdCard,
  Landmark,
  Loader2,
  Mail,
  PiggyBank,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadError } from "@/components/layout/LoadError";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApi } from "@/lib/api";
import type {
  AdminBid,
  AdminKycDocument,
  AdminStats,
  AdminUserDetail,
} from "@/lib/api.types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const BACKEND_ROLES = ["INVESTOR", "ADMIN", "SUPER_ADMIN"] as const;
const PAGE_SIZES = [10, 25, 50];

const DOC_TYPE_LABELS: Record<string, string> = {
  GHANA_CARD: "Ghana Card",
  PASSPORT: "Passport",
  DRIVERS_LICENSE: "Driver's Licence",
  VOTER_ID: "Voter ID",
  TAX_CLEARANCE: "Tax Clearance Certificate",
  BANK_STATEMENT: "Bank Statement",
  UTILITY_BILL: "Proof of Residence (Utility Bill / Bank Statement)",
  COMPANY_CERTIFICATE: "Certificate of Incorporation",
  SELFIE: "Passport Photo",
  SIGNATURE: "Digital Signature",
};

type KycFilter = "ALL" | "PENDING" | "PARTIAL" | "APPROVED" | "REJECTED";
type RoleFilter = "ALL" | "INVESTOR" | "ADMIN" | "SUPER_ADMIN";
type DrawerTab = "profile" | "activity" | "documents";

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString("en-GB");
  }
  return String(value);
}

function recordValue(
  record: Record<string, unknown> | null | undefined,
  key: string,
): unknown {
  return record?.[key];
}

function fullName(user: AdminUserDetail): string {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
}

function identityInfo(user: AdminUserDetail): { type: string; number: string } {
  const ind = user.individualProfile;
  const corp = user.corporateProfile;
  if (ind) {
    const idNumber = ind.ghanaCardNumber || ind.passportNumber;
    return {
      type: idNumber ? "Ghana Card / ID" : "Individual",
      number: idNumber ? String(idNumber) : "—",
    };
  }
  if (corp) {
    return {
      type: "Certificate of Incorporation",
      number: corp.registrationNumber ? String(corp.registrationNumber) : "—",
    };
  }
  return { type: "Pending profile", number: "—" };
}

function kycBadgeClass(status: string): string {
  if (status === "APPROVED") return "bg-success/10 text-success";
  if (status === "REJECTED") return "bg-danger/10 text-danger";
  return "bg-brand-bronze/15 text-brand-bronze";
}

/* ─── Editable profile section (kept mounted while editing) ─── */

interface SectionField {
  key: string;
  label: string;
  value: unknown;
  type?: string;
  readOnly?: boolean;
}

interface ProfileSectionProps {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  fields: SectionField[];
  saveKey: string;
  missingLabel?: string;
  editingSection: string | null;
  collapsedSections: Record<string, boolean>;
  editDraft: Record<string, string>;
  isProcessing: boolean;
  onToggle: (id: string) => void;
  onStartEdit: (id: string, initial: Record<string, string>) => void;
  onCancelEdit: () => void;
  onSave: (id: string, payload: Record<string, unknown>) => void;
  onDraftChange: (draft: Record<string, string>) => void;
}

function ProfileSection({
  id,
  icon: Icon,
  title,
  fields,
  saveKey,
  missingLabel,
  editingSection,
  collapsedSections,
  editDraft,
  isProcessing,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDraftChange,
}: ProfileSectionProps) {
  const isEditing = editingSection === id;
  const isCollapsed = collapsedSections[id];
  const editable = fields.filter((f) => !f.readOnly);
  const hasData = fields.some((f) => f.value != null && f.value !== "");

  const initialDraft = () =>
    Object.fromEntries(
      editable.map((f) => {
        const v = f.value;
        if (v == null) return [f.key, ""];
        if (f.type === "date" && typeof v === "string") {
          return [f.key, v.split("T")[0]];
        }
        return [f.key, String(v)];
      }),
    );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        hasData
          ? "border-border bg-card"
          : "border-dashed border-border/70 bg-muted/20",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="flex flex-1 items-center gap-2.5 text-left"
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              hasData
                ? "bg-brand-bronze/10 text-brand-bronze"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          {!hasData && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Not filled
            </Badge>
          )}
          <span className="ml-auto text-muted-foreground">
            {isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </span>
        </button>
        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 h-7 w-7"
            title="Edit section"
            onClick={() => onStartEdit(id, initialDraft())}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-4 pb-4">
          {isEditing ? (
            <>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                {editable.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {f.label}
                    </label>
                    <Input
                      type={f.type || "text"}
                      value={editDraft[f.key] ?? ""}
                      onChange={(e) =>
                        onDraftChange({ ...editDraft, [f.key]: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={isProcessing}
                  onClick={() =>
                    onSave(
                      id,
                      saveKey === "__basic"
                        ? Object.fromEntries(
                            editable.map((f) => [
                              f.key,
                              editDraft[f.key]?.trim() || null,
                            ]),
                          )
                        : {
                            [saveKey]: Object.fromEntries(
                              editable.map((f) => [
                                f.key,
                                f.type === "date"
                                  ? editDraft[f.key] || null
                                  : editDraft[f.key]?.trim() ?? "",
                              ]),
                            ),
                          },
                    )
                  }
                >
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Save Changes
                </Button>
                <Button variant="outline" size="sm" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </>
          ) : hasData ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {fields
                .filter((f) => f.value != null && f.value !== "")
                .map((f) => (
                  <div
                    key={f.key}
                    className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {f.label}
                    </p>
                    <p className="truncate text-xs font-medium text-foreground">
                      {display(f.value)}
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <div className="py-5 text-center">
              <p className="text-xs text-muted-foreground">
                {missingLabel || "Not completed yet."}
              </p>
              <button
                type="button"
                onClick={() => onStartEdit(id, initialDraft())}
                className="mt-2 text-[11px] font-bold uppercase tracking-wider text-brand-bronze hover:underline"
              >
                Fill in on behalf of investor
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── KYC document card with signed-URL preview + review actions ─── */

function DocCard({
  doc,
  onStatusChange,
}: {
  doc: AdminKycDocument;
  onStatusChange: (updated: AdminKycDocument) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const label = DOC_TYPE_LABELS[doc.type] ?? doc.type.replace(/_/g, " ");
  const isImage = (url: string) => /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
  const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

  const fetchSignedUrl = async (): Promise<string | null> => {
    if (signedUrl) return signedUrl;
    setLoadingUrl(true);
    try {
      const { signedUrl: url } = await adminApi.documentUrl(doc.id);
      setSignedUrl(url);
      return url;
    } catch (err) {
      toast.error("Could not access document", {
        description: err instanceof Error ? err.message : undefined,
      });
      return null;
    } finally {
      setLoadingUrl(false);
    }
  };

  const handlePreview = async () => {
    const url = await fetchSignedUrl();
    if (url) setPreviewing(true);
  };

  const handleDownload = async () => {
    const url = await fetchSignedUrl();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.type}-${doc.id.slice(0, 8)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleStatus = async (status: "APPROVED" | "REJECTED") => {
    setUpdating(true);
    try {
      const updated = await adminApi.updateDocumentStatus(doc.id, status);
      onStatusChange({ ...doc, ...updated });
      toast.success(`Document marked as ${status.toLowerCase()}.`);
    } catch (err) {
      toast.error("Status update failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {previewing && signedUrl && (
        <div className="relative border-b border-border bg-muted/30">
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 z-10 h-7 w-7"
            onClick={() => setPreviewing(false)}
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
          {isImage(signedUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signedUrl} alt={label} className="max-h-72 w-full object-contain" />
          ) : isPdf(signedUrl) ? (
            <iframe src={signedUrl} title={label} className="h-72 w-full border-0" />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Preview not available — use download
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bronze/10 text-brand-bronze">
            <FileCheck2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{label}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge
                className={cn(
                  "text-[10px]",
                  doc.status === "APPROVED"
                    ? "bg-success/10 text-success"
                    : doc.status === "REJECTED"
                      ? "bg-danger/10 text-danger"
                      : "bg-brand-bronze/15 text-brand-bronze",
                )}
              >
                {doc.status}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {formatDate(doc.createdAt)}
              </span>
            </div>
            {doc.reviewNote && (
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                Note: {doc.reviewNote}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {doc.status !== "APPROVED" && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-success hover:bg-success hover:text-white"
              title="Approve document"
              disabled={updating}
              onClick={() => void handleStatus("APPROVED")}
            >
              {updating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {doc.status !== "REJECTED" && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-danger hover:bg-danger hover:text-white"
              title="Reject document"
              disabled={updating}
              onClick={() => void handleStatus("REJECTED")}
            >
              <AlertCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Preview"
            disabled={loadingUrl}
            onClick={() => void handlePreview()}
          >
            {loadingUrl ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Download"
            disabled={loadingUrl}
            onClick={() => void handleDownload()}
          >
            {loadingUrl ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserDetail[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<KycFilter>("ALL");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [me, setMe] = useState<{ role?: string } | null>(null);
  const [selected, setSelected] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userBids, setUserBids] = useState<AdminBid[]>([]);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("profile");

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingHardDelete, setPendingHardDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "INVESTOR" as (typeof BACKEND_ROLES)[number],
  });

  const isSuperAdmin = me?.role === "SUPER_ADMIN";
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    adminApi
      .me()
      .then((raw) => setMe({ role: raw.role }))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const load = useCallback(() => {
    setError(false);
    adminApi
      .listUsers({
        search: debouncedSearch || undefined,
        status: statusFilter,
        role: roleFilter,
      })
      .then((list) => setUsers(Array.isArray(list) ? list : []))
      .catch(() => {
        setError(true);
        setUsers([]);
      });
    adminApi
      .stats()
      .then(setStats)
      .catch(() => setStats(null));
  }, [debouncedSearch, statusFilter, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, roleFilter, pageSize]);

  const openUser = (user: AdminUserDetail) => {
    setSelected(user);
    setDrawerTab("profile");
    setEditingSection(null);
    setEditDraft({});
    setCollapsedSections({});
    setUserBids([]);
    setPendingDelete(false);
    setPendingHardDelete(false);

    if (user.isPendingEmailConfirmation) return;

    setDetailLoading(true);
    void Promise.all([
      adminApi.userDetail(user.id).catch(() => null),
      adminApi.bids(user.email).catch(() => []),
    ])
      .then(([detail, bids]) => {
        if (detail) setSelected(detail);
        setUserBids(bids ?? []);
      })
      .finally(() => setDetailLoading(false));
  };

  const saveSection = async (
    _section: string,
    payload: Record<string, unknown>,
  ) => {
    if (!selected) return;
    setActionLoading("section");
    try {
      const updated = await adminApi.updateUserProfile(selected.id, payload);
      setSelected(updated);
      setEditingSection(null);
      setEditDraft({});
      toast.success("Profile updated.");
      load();
    } catch (err) {
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleKyc = async (status: "APPROVED" | "REJECTED" | "PENDING") => {
    if (!selected) return;
    setActionLoading(status);
    try {
      const updated = await adminApi.updateUserKyc(selected.id, status);
      if (updated?.id) setSelected(updated);
      else
        setSelected((prev) => (prev ? { ...prev, kycStatus: status } : prev));
      toast.success(`KYC status updated to ${status.toLowerCase()}.`);
      load();
    } catch (err) {
      toast.error("Could not update KYC status", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatch = async () => {
    if (!selected) return;
    setActionLoading("dispatch");
    try {
      const result = await adminApi.dispatchNotice(selected.id);
      toast.success(
        result?.message ?? `CSD package dispatched to trading@constantcap.com.gh.`,
      );
    } catch (err) {
      toast.error("Failed to dispatch CSD package", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!pendingDelete) {
      setPendingDelete(true);
      return;
    }
    setActionLoading("delete");
    try {
      await adminApi.deleteUser(selected.id);
      toast.info(`${selected.email} anonymized per AML Act 1044.`);
      setSelected(null);
      load();
    } catch (err) {
      toast.error("Failed to anonymize user", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionLoading(null);
      setPendingDelete(false);
    }
  };

  const handleHardDelete = async () => {
    if (!selected) return;
    if (!pendingHardDelete) {
      setPendingHardDelete(true);
      return;
    }
    setActionLoading("hardDelete");
    try {
      await adminApi.hardDeleteUser(selected.id);
      toast.success(`${selected.email} permanently deleted.`);
      setSelected(null);
      load();
    } catch (err) {
      toast.error("Failed to delete user", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionLoading(null);
      setPendingHardDelete(false);
    }
  };

  const handleRoleChange = async (userId: string, role: (typeof BACKEND_ROLES)[number]) => {
    try {
      await adminApi.updateUserRole(userId, role);
      toast.success(`Role updated to ${role}.`);
      if (selected?.id === userId)
        setSelected((prev) => (prev ? { ...prev, role } : prev));
      load();
    } catch (err) {
      toast.error("Could not update role", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const runDownload = async (key: string, action: () => Promise<void>) => {
    setActionLoading(key);
    try {
      await action();
      toast.success("Download ready");
    } catch (err) {
      toast.error("Download failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const exportRegistry = async () => {
    setExporting(true);
    try {
      await adminApi.exportUsers();
      toast.success("Registry exported.");
    } catch (err) {
      toast.error("Export failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const provision = async () => {
    setActionLoading("provision");
    try {
      await adminApi.provisionUser(newUser);
      toast.success(`Account provisioned for ${newUser.email}.`);
      setProvisionOpen(false);
      setNewUser({ firstName: "", lastName: "", email: "", role: "INVESTOR" });
      load();
    } catch (err) {
      toast.error("Failed to provision account", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => users ?? [], [users]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageUsers = filtered.slice(start, start + pageSize);

  const counts = useMemo(
    () => ({
      total: stats?.totalUsers ?? filtered.length,
      pending:
        stats?.pendingKyc ??
        filtered.filter(
          (u) => u.kycStatus === "PENDING" || u.kycStatus === "PARTIAL",
        ).length,
      approved:
        stats?.approvedKyc ?? filtered.filter((u) => u.kycStatus === "APPROVED").length,
      rejected: filtered.filter((u) => u.kycStatus === "REJECTED").length,
      csd: filtered.filter((u) => Boolean(u.csdAccount?.csdNumber)).length,
    }),
    [stats, filtered],
  );

  const sectionProps = {
    editingSection,
    collapsedSections,
    editDraft,
    isProcessing: actionLoading === "section",
    onToggle: (id: string) =>
      setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] })),
    onStartEdit: (id: string, initial: Record<string, string>) => {
      setEditingSection(id);
      setEditDraft(initial);
    },
    onCancelEdit: () => {
      setEditingSection(null);
      setEditDraft({});
    },
    onSave: (id: string, payload: Record<string, unknown>) => void saveSection(id, payload),
    onDraftChange: setEditDraft,
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Investor Governance"
        subtitle="Compliance, CSD account-opening and access management for every investor on the platform."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RotateCcw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setProvisionOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Provision Account
            </Button>
            <Button
              variant="premium"
              size="sm"
              onClick={() => void exportRegistry()}
              disabled={exporting || !users?.length}
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export Trader Registry
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Investors", value: counts.total, icon: Users },
          { label: "Pending KYC", value: counts.pending, icon: ShieldAlert },
          { label: "KYC Approved", value: counts.approved, icon: ShieldCheck },
          { label: "Rejected", value: counts.rejected, icon: XCircle },
          { label: "CSD Linked", value: counts.csd, icon: WalletCards },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-bronze/10 text-brand-bronze">
                <Icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Registry table */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email or institution…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as KycFilter)}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value as RoleFilter)}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                {BACKEND_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <div className="p-4">
            <LoadError message="We couldn't load the investor registry." onRetry={load} />
          </div>
        ) : !users ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="px-6 py-3">Investor</TableHead>
                  <TableHead className="px-4 py-3">Identity</TableHead>
                  <TableHead className="px-4 py-3">KYC</TableHead>
                  <TableHead className="hidden px-4 py-3 md:table-cell">CSD</TableHead>
                  <TableHead className="px-4 py-3">Role</TableHead>
                  <TableHead className="hidden px-4 py-3 lg:table-cell">Joined</TableHead>
                  <TableHead className="px-6 py-3 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                      No investors match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageUsers.map((user) => {
                    const idInfo = identityInfo(user);
                    return (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer"
                        onClick={() => openUser(user)}
                      >
                        <TableCell className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white dark:bg-brand-bronze">
                              {(user.firstName || user.email).slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">
                                {fullName(user)}
                              </p>
                              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" /> {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <p className="text-xs font-medium text-foreground">{idInfo.type}</p>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {idInfo.number}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <Badge className={kycBadgeClass(user.kycStatus)}>
                            {user.isPendingEmailConfirmation
                              ? "Awaiting Email"
                              : user.kycStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden px-4 py-3.5 font-mono text-xs md:table-cell">
                          {display(recordValue(user.csdAccount, "csdNumber"))}
                        </TableCell>
                        <TableCell className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              void handleRoleChange(
                                user.id,
                                value as (typeof BACKEND_ROLES)[number],
                              )
                            }
                          >
                            <SelectTrigger className="h-8 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BACKEND_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role.replace("_", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden px-4 py-3.5 text-xs text-muted-foreground lg:table-cell">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="px-6 py-3.5 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
            <p className="text-xs text-muted-foreground">
              Showing {start + 1}–{Math.min(start + pageSize, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} rows
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-1 text-xs text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-brand-bronze" />
        Records retained per AML Act 1044. Downloads are restricted to authorized
        administrators.
      </div>

      {/* ── Investor drawer ── */}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 border-l-border bg-background p-0 sm:w-[760px] sm:max-w-none">
          {detailLoading && !selected?.kycDocuments ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading investor record…
            </div>
          ) : selected ? (
            <>
              {/* Drawer header */}
              <div className="border-b border-border bg-card px-6 py-5 pr-14">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-bronze/10 text-lg font-bold text-brand-bronze">
                      {(selected.firstName || selected.email).slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <SheetTitle className="text-lg">{fullName(selected)}</SheetTitle>
                      <SheetDescription className="mt-0.5 text-xs">
                        ID {selected.id.slice(0, 8).toUpperCase()} · {selected.email}
                      </SheetDescription>
                    </div>
                  </div>
                  <Badge className={kycBadgeClass(selected.kycStatus)}>
                    {selected.isPendingEmailConfirmation
                      ? "AWAITING EMAIL CONFIRMATION"
                      : `KYC ${selected.kycStatus}`}
                  </Badge>
                </div>
                {selected.isPendingEmailConfirmation && (
                  <p className="mt-3 rounded-lg bg-brand-bronze/10 px-3 py-2 text-xs text-brand-bronze">
                    This signup hasn't confirmed their email yet — no compliance
                    profile exists until they do.
                  </p>
                )}
              </div>

              {/* KYC actions banner */}
              {!selected.isPendingEmailConfirmation && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {selected.kycStatus === "APPROVED" ? (
                      <ShieldCheck className="h-4 w-4 text-success" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-brand-bronze" />
                    )}
                    <span className="font-semibold text-foreground">
                      Compliance Status
                    </span>
                    <span>· Verification actions apply immediately</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.kycStatus !== "APPROVED" && (
                      <Button
                        size="sm"
                        variant="success"
                        disabled={actionLoading !== null}
                        onClick={() => void handleKyc("APPROVED")}
                      >
                        {actionLoading === "APPROVED" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                    )}
                    {selected.kycStatus !== "REJECTED" && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={actionLoading !== null}
                        onClick={() => void handleKyc("REJECTED")}
                      >
                        {actionLoading === "REJECTED" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Reject
                      </Button>
                    )}
                    {selected.kycStatus !== "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading !== null}
                        onClick={() => void handleKyc("PENDING")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Re-open
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Drawer tabs */}
              <div className="flex gap-1 border-b border-border bg-card px-6 pt-3">
                {(
                  [
                    ["profile", "Profile"],
                    ["activity", `Activity (${userBids.length})`],
                    ["documents", `KYC Docs (${selected.kycDocuments?.length ?? 0})`],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDrawerTab(tab)}
                    className={cn(
                      "rounded-t-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
                      drawerTab === tab
                        ? "border-b-2 border-brand-bronze text-brand-bronze"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Drawer body */}
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {drawerTab === "profile" && (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Profile Type",
                          value: selected.corporateProfile
                            ? "Corporate"
                            : selected.individualProfile
                              ? "Individual"
                              : "Pending",
                        },
                        {
                          label: "Subscription",
                          value: `${selected.subscription?.tier ?? "FREE"}${
                            selected.subscription?.status
                              ? ` · ${selected.subscription.status}`
                              : ""
                          }`,
                        },
                        { label: "Joined", value: formatDate(selected.createdAt) },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl border border-border bg-muted/20 px-3 py-2.5"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-0.5 truncate text-xs font-bold text-foreground">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Personal details */}
                    <ProfileSection
                      {...sectionProps}
                      id="basic"
                      icon={UserRound}
                      title="Personal Details"
                      saveKey="__basic"
                      fields={[
                        { key: "firstName", label: "First Name", value: selected.firstName ?? null },
                        { key: "lastName", label: "Last Name", value: selected.lastName ?? null },
                        { key: "phone", label: "Phone", value: selected.phone ?? null },
                        { key: "email", label: "Email", value: selected.email, readOnly: true },
                      ]}
                      missingLabel="Basic user details not set."
                    />

                    {/* Individual KYC */}
                    {(selected.individualProfile ||
                      !selected.corporateProfile) && (
                      <ProfileSection
                        {...sectionProps}
                        id="individual"
                        icon={IdCard}
                        title="Individual KYC"
                        saveKey="individual"
                        fields={[
                          {
                            key: "idDocumentType",
                            label: "ID Doc Type",
                            value:
                              recordValue(selected.individualProfile, "idDocumentType") ??
                              "GHANA_CARD",
                            readOnly: true,
                          },
                          {
                            key: "ghanaCardNumber",
                            label: "Ghana Card No.",
                            value: recordValue(selected.individualProfile, "ghanaCardNumber"),
                          },
                          {
                            key: "passportNumber",
                            label: "Passport No.",
                            value: recordValue(selected.individualProfile, "passportNumber"),
                          },
                          {
                            key: "dateOfBirth",
                            label: "Date of Birth",
                            value: recordValue(selected.individualProfile, "dateOfBirth"),
                            type: "date",
                          },
                          {
                            key: "nationality",
                            label: "Nationality",
                            value: recordValue(selected.individualProfile, "nationality"),
                          },
                          {
                            key: "occupation",
                            label: "Occupation",
                            value: recordValue(selected.individualProfile, "occupation"),
                          },
                          {
                            key: "sourceOfFunds",
                            label: "Source of Funds",
                            value: recordValue(selected.individualProfile, "sourceOfFunds"),
                          },
                          {
                            key: "address",
                            label: "Address",
                            value: recordValue(selected.individualProfile, "address"),
                          },
                          {
                            key: "residentialAddress",
                            label: "Residential Address",
                            value: recordValue(selected.individualProfile, "residentialAddress"),
                          },
                          {
                            key: "mailingAddress",
                            label: "Mailing Address",
                            value: recordValue(selected.individualProfile, "mailingAddress"),
                          },
                          {
                            key: "secondaryPhone",
                            label: "Secondary Phone",
                            value: recordValue(selected.individualProfile, "secondaryPhone"),
                          },
                        ]}
                        missingLabel="Individual KYC profile not submitted."
                      />
                    )}

                    {/* Corporate KYC */}
                    {(selected.corporateProfile ||
                      selected.investorType === "CORPORATE") && (
                      <ProfileSection
                        {...sectionProps}
                        id="corporate"
                        icon={Building2}
                        title="Corporate KYC"
                        saveKey="corporate"
                        fields={[
                          {
                            key: "companyName",
                            label: "Company Name",
                            value: recordValue(selected.corporateProfile, "companyName"),
                          },
                          {
                            key: "registrationNumber",
                            label: "Reg. Number",
                            value: recordValue(selected.corporateProfile, "registrationNumber"),
                          },
                          {
                            key: "tinNumber",
                            label: "TIN Number",
                            value: recordValue(selected.corporateProfile, "tinNumber"),
                          },
                          {
                            key: "incorporationDate",
                            label: "Incorporation Date",
                            value: recordValue(selected.corporateProfile, "incorporationDate"),
                            type: "date",
                          },
                          {
                            key: "registeredAddress",
                            label: "Registered Address",
                            value: recordValue(selected.corporateProfile, "registeredAddress"),
                          },
                          {
                            key: "authorizedSignatory",
                            label: "Authorized Signatory",
                            value: recordValue(selected.corporateProfile, "authorizedSignatory"),
                          },
                        ]}
                        missingLabel="Corporate KYC profile not submitted."
                      />
                    )}

                    {/* Employment */}
                    <ProfileSection
                      {...sectionProps}
                      id="employment"
                      icon={Briefcase}
                      title="Employment Details"
                      saveKey="employment"
                      fields={[
                        { key: "employerName", label: "Employer", value: recordValue(selected.employmentDetails, "employerName") },
                        { key: "jobTitle", label: "Job Title", value: recordValue(selected.employmentDetails, "jobTitle") },
                        { key: "industry", label: "Industry", value: recordValue(selected.employmentDetails, "industry") },
                        { key: "duration", label: "Duration", value: recordValue(selected.employmentDetails, "duration") },
                      ]}
                      missingLabel="Employment details not submitted."
                    />

                    {/* Tax & compliance */}
                    <ProfileSection
                      {...sectionProps}
                      id="tax"
                      icon={Shield}
                      title="Tax & Compliance"
                      saveKey="tax"
                      fields={[
                        { key: "tinNumber", label: "TIN Number", value: recordValue(selected.taxDetails, "tinNumber") },
                        { key: "taxResidency", label: "Tax Residency", value: recordValue(selected.taxDetails, "taxResidency") },
                        {
                          key: "politicallyExposedPerson",
                          label: "PEP Status",
                          value: recordValue(selected.taxDetails, "politicallyExposedPerson"),
                          readOnly: true,
                        },
                      ]}
                      missingLabel="Tax information not submitted."
                    />

                    {/* Financial */}
                    <ProfileSection
                      {...sectionProps}
                      id="financial"
                      icon={WalletCards}
                      title="Financial Profile"
                      saveKey="financial"
                      fields={[
                        { key: "annualIncome", label: "Annual Income", value: recordValue(selected.financialInfo, "annualIncome") },
                        { key: "netWorth", label: "Net Worth", value: recordValue(selected.financialInfo, "netWorth") },
                        {
                          key: "investmentObjectives",
                          label: "Investment Objectives",
                          value: recordValue(selected.financialInfo, "investmentObjectives"),
                        },
                      ]}
                      missingLabel="Financial information not submitted."
                    />

                    {/* Bank */}
                    <ProfileSection
                      {...sectionProps}
                      id="bank"
                      icon={PiggyBank}
                      title="Bank Account"
                      saveKey="bank"
                      fields={[
                        { key: "bankName", label: "Bank Name", value: recordValue(selected.bankDetails, "bankName") },
                        { key: "branch", label: "Branch", value: recordValue(selected.bankDetails, "branch") },
                        { key: "accountName", label: "Account Name", value: recordValue(selected.bankDetails, "accountName") },
                        { key: "accountNumber", label: "Account No.", value: recordValue(selected.bankDetails, "accountNumber") },
                      ]}
                      missingLabel="Bank details not submitted."
                    />

                    {/* CSD */}
                    <ProfileSection
                      {...sectionProps}
                      id="csd"
                      icon={Landmark}
                      title="CSD Account"
                      saveKey="csd"
                      fields={[
                        { key: "csdNumber", label: "CSD Number", value: recordValue(selected.csdAccount, "csdNumber") },
                        { key: "brokerCode", label: "Broker Code", value: recordValue(selected.csdAccount, "brokerCode") },
                      ]}
                      missingLabel="CSD account not yet assigned."
                    />
                  </>
                )}

                {drawerTab === "activity" && (
                  <div>
                    <div className="mb-4 grid grid-cols-3 gap-3">
                      {[
                        { label: "Total Bids", value: String(userBids.length) },
                        {
                          label: "Accepted",
                          value: String(userBids.filter((b) => b.status === "ACCEPTED").length),
                        },
                        {
                          label: "Total Volume",
                          value: `GHS ${(
                            userBids.reduce((s, b) => s + Number(b.amount || 0), 0) / 1e6
                          ).toFixed(2)}M`,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl border border-border bg-muted/20 px-3 py-2.5"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-0.5 font-mono text-sm font-bold text-foreground">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    {userBids.length > 0 ? (
                      <div className="space-y-2">
                        {userBids.map((bid) => (
                          <div
                            key={bid.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {bid.auction?.instrumentName ||
                                  bid.auction?.securityType?.replace(/_/g, " ") ||
                                  "Treasury Security"}
                              </p>
                              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {formatDate(bid.createdAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm font-bold text-foreground">
                                GHS {Number(bid.amount || 0).toLocaleString()}
                              </p>
                              <p className="text-[10px] font-bold text-brand-bronze">
                                {Number(bid.rate).toFixed(2)}%
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                "shrink-0 text-[10px]",
                                bid.status === "ACCEPTED"
                                  ? "bg-success/10 text-success"
                                  : bid.status === "REJECTED"
                                    ? "bg-danger/10 text-danger"
                                    : "bg-brand-bronze/15 text-brand-bronze",
                              )}
                            >
                              {bid.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-border py-12 text-center">
                        <Gavel className="mx-auto mb-2 h-7 w-7 text-muted-foreground/30" />
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          No auction activity found for this investor
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {drawerTab === "documents" && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        void runDownload("kyc", () =>
                          adminApi.exportUserKyc(selected.id),
                        )
                      }
                      disabled={actionLoading === "kyc"}
                    >
                      {actionLoading === "kyc" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      Export KYC Profile (PDF)
                    </Button>
                    <Button
                      variant="premium"
                      className="w-full"
                      onClick={() =>
                        void runDownload("csd", () =>
                          adminApi.exportUserCsdForm(selected.id),
                        )
                      }
                      disabled={actionLoading === "csd"}
                    >
                      {actionLoading === "csd" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download CSD Account Form (PDF)
                    </Button>
                    {(selected.kycDocuments ?? []).length > 0 ? (
                      (selected.kycDocuments ?? []).map((doc) => (
                        <DocCard
                          key={doc.id}
                          doc={doc}
                          onStatusChange={(updated) =>
                            setSelected((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    kycDocuments: prev.kycDocuments.map((d) =>
                                      d.id === updated.id ? { ...d, ...updated } : d,
                                    ),
                                  }
                                : prev,
                            )
                          }
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-border py-12 text-center">
                        <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          No documents uploaded
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          The investor has not uploaded any KYC documents yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drawer footer actions */}
              <div className="flex items-center gap-2 border-t border-border bg-card p-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={actionLoading !== null || selected.isPendingEmailConfirmation}
                  title="Emails trading@constantcap.com.gh with the investor's CSD account-opening form attached"
                  onClick={() => void handleDispatch()}
                >
                  {actionLoading === "dispatch" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Dispatch CSD to Trading
                </Button>
                <Button
                  variant="danger"
                  disabled={actionLoading !== null}
                  className={pendingDelete ? "animate-pulse" : ""}
                  onClick={() => void handleDelete()}
                >
                  {actionLoading === "delete" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {pendingDelete ? "Confirm Anonymize" : "Anonymize"}
                </Button>
                {isSuperAdmin && (
                  <Button
                    variant="danger"
                    disabled={actionLoading !== null}
                    className={pendingHardDelete ? "animate-pulse" : ""}
                    onClick={() => void handleHardDelete()}
                  >
                    {actionLoading === "hardDelete" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {pendingHardDelete ? "Confirm Permanent Delete" : "Complete Delete"}
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ── Provision account modal ── */}
      <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Provision Account</DialogTitle>
            <DialogDescription>
              Create a platform account and send a Supabase invite so the user can set
              their password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  First Name
                </label>
                <Input
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Last Name
                </label>
                <Input
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Work Email
              </label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@institution.gh"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Role
              </label>
              <Select
                value={newUser.role}
                onValueChange={(value) =>
                  setNewUser({ ...newUser, role: value as (typeof BACKEND_ROLES)[number] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKEND_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvisionOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="premium"
              disabled={actionLoading === "provision" || !newUser.email}
              onClick={() => void provision()}
            >
              {actionLoading === "provision" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Generate Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
