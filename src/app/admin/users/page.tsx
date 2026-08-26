"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadError } from "@/components/layout/LoadError";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { adminApi } from "@/lib/api";
import type { AdminUser, Role } from "@/lib/api.types";
import { formatDate, formatGHS } from "@/lib/format";

const ROLES: Role[] = ["client", "trader", "compliance", "admin"];

const AdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    void adminApi.users().then(setUsers).catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (userId: string, role: Role) => {
    try {
      await adminApi.updateUserRole(userId, role);
      toast.success("Role updated");
      load();
    } catch (err) {
      toast.error("Could not update role", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const filtered = (users ?? []).filter((u) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.csd_account ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Clients"
        subtitle="Manage users, roles and access levels across the platform."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email or CSD…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <LoadError message="We couldn't load the clients. Please try again." onRetry={load} />}

      <Card className="overflow-hidden">
        {!users ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No clients found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">Client</th>
                  <th className="hidden px-4 py-3 md:table-cell">CSD</th>
                  <th className="hidden px-4 py-3 lg:table-cell">KYC</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Cash</th>
                  <th className="hidden px-4 py-3 text-right md:table-cell">Orders</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Joined</th>
                  <th className="px-4 py-3 text-right">Access level</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.user_id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="px-6 py-3.5">
                      <p className="font-semibold">{u.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="hidden px-4 py-3.5 font-mono text-xs md:table-cell">
                      {u.csd_account || "—"}
                    </td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <Badge
                        className={
                          u.kyc_status === "approved"
                            ? "bg-success/10 text-success"
                            : u.kyc_status === "pending"
                              ? "bg-brand-bronze/15 text-brand-bronze"
                              : "bg-danger/10 text-danger"
                        }
                      >
                        {u.kyc_status}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3.5 text-right sm:table-cell">{formatGHS(u.cash)}</td>
                    <td className="hidden px-4 py-3.5 text-right md:table-cell">{u.orderCount}</td>
                    <td className="hidden px-4 py-3.5 text-muted-foreground lg:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        <Select value={u.role} onValueChange={(v) => void changeRole(u.user_id, v as Role)}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="capitalize">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-brand-bronze" />
        Access levels: client (self-service) · trader (markets & trading) · compliance
        (approvals & analytics) · admin (full control).
      </div>
    </div>
  );
};

export default AdminUsers;
