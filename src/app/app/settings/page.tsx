"use client";

import { useTheme } from "next-themes";
import {
  Laptop, Moon, Sun, User, ShieldCheck, Palette, Bell, CheckCircle2, Loader2
} from "lucide-react";
import { applyThemePreference } from "@/hooks/use-area-theme";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { authApi } from "@/lib/api";

const SECTIONS = [
  { id: "profile", label: "Profile Details", icon: User },
  { id: "security", label: "Security & Login", icon: ShieldCheck },
  { id: "appearance", label: "Appearance & Theme", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function ClientSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profile, updateProfile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  
  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password Form State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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
            Account Settings
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
              Update your personal information and contact details.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-8 flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-brand text-2xl font-bold text-white shadow-glow">
                {profile?.full_name?.substring(0, 2).toUpperCase() || "CC"}
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-orange">
                  {profile?.role === "client" ? "CLIENT ACCOUNT" : profile?.role?.toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSD Account: {profile?.csd_account || "Pending"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Full Name
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
                    KYC Status
                  </label>
                  <div className="flex h-[42px] items-center rounded-lg border border-input bg-muted/30 px-4 text-sm font-medium">
                    <span className={cn(
                      "flex items-center gap-2",
                      profile?.kyc_status === "approved" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500"
                    )}>
                      {profile?.kyc_status === "approved" ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4" />}
                      {profile?.kyc_status?.toUpperCase() || "PENDING"}
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
              Manage your password and secure your account.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="border-b border-border pb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-medium">Change Password</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Update your password to keep your account secure.
                  </p>
                </div>
                {!showPasswordForm && (
                  <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                    Update Password
                  </Button>
                )}
              </div>

              {showPasswordForm && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (newPassword !== confirmPassword) {
                      toast.error("New passwords do not match");
                      return;
                    }
                    if (newPassword.length < 8) {
                      toast.error("Password must be at least 8 characters");
                      return;
                    }
                    setChangingPassword(true);
                    try {
                      await authApi.changePassword(currentPassword, newPassword);
                      setPasswordSuccess(true);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setTimeout(() => {
                        setShowPasswordForm(false);
                        setPasswordSuccess(false);
                      }, 2000);
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : "Failed to update password";
                      toast.error("Password update failed", { description: message });
                    } finally {
                      setChangingPassword(false);
                    }
                  }}
                  className="rounded-xl border border-border bg-card p-4 space-y-4"
                >
                  {passwordSuccess ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Password updated successfully.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="current">Current password</Label>
                          <Input
                            id="current"
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new">New password</Label>
                          <Input
                            id="new"
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm">Confirm new password</Label>
                          <Input
                            id="confirm"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button type="submit" disabled={changingPassword}>
                          {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Update Password
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowPasswordForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-medium">Two-Factor Authentication (2FA)</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add an extra layer of security to your account.
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
              Customize the look and feel of your workspace.
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

        {/* Notifications */}
        <section id="notifications" className="scroll-mt-24 space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Notifications</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure how you receive alerts and updates.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <p className="text-base font-medium">Order Updates</p>
                <p className="text-sm text-muted-foreground">
                  Receive emails when your orders are executed or rejected.
                </p>
              </div>
              <Button variant="secondary" size="sm" className="pointer-events-none opacity-80">
                <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-500" />
                Enabled
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <p className="text-base font-medium">Marketing & News</p>
                <p className="text-sm text-muted-foreground">
                  Weekly market insights and platform updates.
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
