"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  FileText,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/auth/AuthProvider";
import { useAreaTheme } from "@/hooks/use-area-theme";
import { ROLE_LABEL } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const ADMIN_NAV = [
  { label: "Analytics", href: "/admin", icon: BarChart3 },
  { label: "Clients", href: "/admin/users", icon: Users },
  { label: "Order Approvals", href: "/admin/orders", icon: ClipboardCheck },
  { label: "Reports", href: "/admin/reports", icon: FileText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const COLLAPSE_KEY = "cc-admin-sidebar-collapsed";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function CCMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand font-display text-sm font-extrabold text-white shadow-glow">
      CC
    </span>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useAreaTheme("dark");

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const nav = (compact: boolean) => (
    <nav className={cn("flex flex-col gap-1 py-3", compact && "items-center")}>
      <SectionLabel compact={compact} label="Admin Hub" />
      {ADMIN_NAV.map((item) => (
        <SidebarLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          compact={compact}
        />
      ))}
      <div className="mt-8">
        <SectionLabel compact={compact} label="Switch View" />
        <SidebarLink
          href="/app/dashboard"
          icon={LayoutDashboard}
          label="Client Dashboard"
          compact={compact}
          isExternal
        />
      </div>
    </nav>
  );

  const handleSignOut = async () => {
    await signOut();
    navigate.push("/");
  };

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* We can omit the PriceTicker for the admin hub to save vertical space, or keep it. I'll omit it for a cleaner admin feel. */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out lg:flex",
            collapsed ? "w-[4.5rem]" : "w-60",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-center border-b border-sidebar-border bg-brand-navy/5">
            <Link href="/admin" aria-label="Admin Hub" className={cn(collapsed && "px-2")}>
              {collapsed ? <CCMark /> : <Logo compact className="scale-90" />}
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {nav(collapsed)}
            <div className="h-4" />
          </div>

          <div className="shrink-0 border-t border-sidebar-border p-3">
            <button
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {collapsed ? (
                <ChevronsRight className="h-5 w-5 shrink-0" />
              ) : (
                <>
                  <ChevronsLeft className="h-5 w-5 shrink-0" />
                  Collapse
                </>
              )}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange md:flex">
                  <ShieldCheck className="h-4 w-4" />
                  Admin Hub
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <NotificationCenter />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-1 pr-2 outline-none ring-ring transition hover:bg-sidebar-accent focus-visible:ring-2">
                    <Avatar className="h-8 w-8 bg-gradient-brand text-white">
                      <AvatarFallback className="bg-gradient-brand text-white text-xs font-bold">
                        {initials(profile?.full_name || "CC")}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">
                      {profile?.full_name || profile?.email}
                    </span>
                    <span className="text-xs font-normal text-brand-orange">
                      {profile ? ROLE_LABEL[profile.role] : ""}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate.push("/app/dashboard")}>
                    <LayoutDashboard className="h-4 w-4" /> Client Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
              <Logo compact tone="white" className="scale-75" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {nav(false)}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ label, compact }: { label: string; compact: boolean }) {
  if (compact) {
    return <div className="mx-auto my-1 h-px w-8 bg-sidebar-border" />;
  }
  return (
    <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
      {label}
    </p>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  compact,
  isExternal,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  compact: boolean;
  isExternal?: boolean;
}) {
  const pathname = usePathname();
  const isExact = href === "/admin";
  const isActive = !isExternal && (isExact ? pathname === "/admin" || pathname === "/admin/dashboard" : pathname?.startsWith(href));
  
  const link = (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-md py-2.5 text-sm font-medium transition-colors",
        compact ? "justify-center px-0" : "gap-3 px-3",
        isActive
          ? "bg-brand-orange/10 text-brand-orange"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-brand-orange" : "text-sidebar-foreground/50")} />
      {!compact && label}
    </Link>
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return link;
}
