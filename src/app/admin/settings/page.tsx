"use client";

import { useTheme } from "next-themes";
import { 
  Laptop, Moon, Sun, User, ShieldCheck, Palette, Bell, CheckCircle2, Loader2 
} from "lucide-react";
import { applyThemePreference } from "@/hooks/use-area-theme";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";

const SECTIONS = [
  { id: "profile", label: "Profile Details", icon: User },
  { id: "security", label: "Security & Login", icon: ShieldCheck },
  { id: "appearance", label: "Appearance & Theme", icon: Palette },
  { id: "notifications", label: "Staff Notifications", icon: Bell },
];

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profile, updateProfile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  
  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  // Scrollspy logic
  useEffect(() => {
    if (!mounted) return;
    
    const handleScroll = () => {
      const sectionElements = SECTIONS.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 150; // offset for header

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mounted]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleThemeChange = (val: string) => {
    setTheme(val);
    applyThemePreference(val as "light" | "dark" | "system");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateProfile) return;
    setSavingProfile(true);
    setProfileSuccess(false);
    try {
      await updateProfile({ full_name: fullName, phone });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      // ignore
    } finally {
      setSavingProfile(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 p-4 pt-8 md:flex-row sm:p-6 lg:p-8">
      
      {/* Sidebar Navigation */}
      <div className="w-full shrink-0 md:w-64">
        <div className="sticky top-24 flex flex-col gap-1">
          <h2 className="mb-4 px-3 text-2xl font-bold tracking-tight text-foreground">
            Admin Settings
          </h2>
          <nav className="flex flex-col gap-1">
            {SECTIONS.map((section) => {
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-brand-orange/10 text-brand-orange"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <section.icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        active ? "text-brand-orange" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {section.label}
                  </div>
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(247,130,24,0.8)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-16 pb-24">
        
        {/* Profile Details */}
        <section id="profile" className="scroll-mt-24 space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Profile Details</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Update your displayed staff information.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-8 flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-brand text-2xl font-bold text-white shadow-glow">
                {profile?.full_name?.substring(0, 2).toUpperCase() || "AD"}
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-orange">
                  {profile?.role?.toUpperCase() || "ADMIN"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Staff Account
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full rounded-lg border border-input bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground outline-none opacity-70 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-input bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assigned Role
                  </label>
                  <div className="flex h-[42px] items-center rounded-lg border border-input bg-muted/30 px-4 text-sm font-medium">
                    <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      {profile?.role?.toUpperCase() || "ADMIN"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 border-t border-border pt-5">
                {profileSuccess && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Profile updated
                  </span>
                )}
                <Button 
                  type="submit" 
                  disabled={savingProfile}
                  className="bg-brand-orange text-white hover:bg-brand-orange/90 w-full sm:w-auto px-8"
                >
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Profile
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Security & Login */}
        <section id="security" className="scroll-mt-24 space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Security & Login</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your password and secure your staff account.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <h4 className="text-base font-medium">Change Password</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Update your password to keep your admin access secure.
                </p>
              </div>
              <Button variant="outline">Update Password</Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-medium">Two-Factor Authentication (2FA)</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Mandatory for all staff and admin accounts.
                </p>
              </div>
              <Button variant="outline" disabled>Coming Soon</Button>
            </div>
          </div>
        </section>

        {/* Appearance & Theme */}
        <section id="appearance" className="scroll-mt-24 space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Appearance & Theme</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Customize the look and feel of the Admin Hub.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* System */}
              <button
                onClick={() => handleThemeChange("system")}
                className={cn(
                  "flex flex-col items-center gap-4 rounded-xl border-2 p-4 transition-all hover:bg-muted/50",
                  theme === "system" ? "border-brand-orange bg-brand-orange/5" : "border-border"
                )}
              >
                <div className="flex h-24 w-full items-center justify-center rounded-lg border border-border bg-gradient-to-br from-muted/50 to-muted shadow-sm">
                  <Laptop className={cn("h-8 w-8", theme === "system" ? "text-brand-orange" : "text-muted-foreground")} />
                </div>
                <div className="text-center">
                  <p className={cn("text-sm font-semibold", theme === "system" ? "text-brand-orange" : "text-foreground")}>System</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Syncs with OS</p>
                </div>
              </button>

              {/* Light */}
              <button
                onClick={() => handleThemeChange("light")}
                className={cn(
                  "flex flex-col items-center gap-4 rounded-xl border-2 p-4 transition-all hover:bg-muted/50",
                  theme === "light" ? "border-brand-orange bg-brand-orange/5" : "border-border"
                )}
              >
                <div className="flex h-24 w-full items-center justify-center rounded-lg border border-border bg-[#F8FAFC] shadow-sm">
                  <Sun className={cn("h-8 w-8", theme === "light" ? "text-brand-orange" : "text-slate-400")} />
                </div>
                <div className="text-center">
                  <p className={cn("text-sm font-semibold", theme === "light" ? "text-brand-orange" : "text-foreground")}>Light</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Classic interface</p>
                </div>
              </button>

              {/* Dark */}
              <button
                onClick={() => handleThemeChange("dark")}
                className={cn(
                  "flex flex-col items-center gap-4 rounded-xl border-2 p-4 transition-all hover:bg-muted/50",
                  theme === "dark" ? "border-brand-orange bg-brand-orange/5" : "border-border"
                )}
              >
                <div className="flex h-24 w-full items-center justify-center rounded-lg border border-[#1E293B] bg-[#0F172A] shadow-sm">
                  <Moon className={cn("h-8 w-8", theme === "dark" ? "text-brand-orange" : "text-slate-500")} />
                </div>
                <div className="text-center">
                  <p className={cn("text-sm font-semibold", theme === "dark" ? "text-brand-orange" : "text-foreground")}>Dark</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Night terminal</p>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Staff Notifications */}
        <section id="notifications" className="scroll-mt-24 space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Staff Notifications</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure alerts for client onboarding and orders.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <p className="text-base font-medium">KYC Approvals</p>
                <p className="text-sm text-muted-foreground">
                  Alert when a new client completes onboarding.
                </p>
              </div>
              <Button variant="secondary" size="sm" className="pointer-events-none opacity-80">
                <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-500" />
                Enabled
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <p className="text-base font-medium">Order Processing</p>
                <p className="text-sm text-muted-foreground">
                  Alert when new orders are placed or funded by clients.
                </p>
              </div>
              <Button variant="secondary" size="sm" className="pointer-events-none opacity-80">
                <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-500" />
                Enabled
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
