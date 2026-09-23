"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";
import { authApi } from "@/lib/api";

type Step = "email" | "code" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authApi.requestOtp(email.trim(), "PASSWORD_RESET");
      toast.success("Reset PIN sent", {
        description: "Check your email and phone for the 6-digit PIN.",
      });
      setStep("code");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not send reset PIN";
      toast.error("Failed to send PIN", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error("Enter the 6-digit PIN");
      return;
    }
    setStep("password");
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password too short", { description: "Use at least 8 characters" });
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), code.trim(), password);
      toast.success("Password reset", { description: "You are now signed in." });
      setStep("done");
      setTimeout(() => router.replace("/app/dashboard"), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not reset password";
      toast.error("Reset failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-6 flex items-center gap-2">
        <Link href="/login" className="text-xs font-medium text-muted-foreground hover:text-brand-bronze">
          <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
          Back to sign in
        </Link>
      </div>

      <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
        {step === "email" && "Reset your password"}
        {step === "code" && "Enter the reset PIN"}
        {step === "password" && "Choose a new password"}
        {step === "done" && "Password updated"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {step === "email" && "We will send a 6-digit PIN to your email and phone."}
        {step === "code" && "Enter the PIN we sent to your registered email and phone."}
        {step === "password" && "Create a strong password for your Constant Capital account."}
        {step === "done" && "You are being signed in…"}
      </p>

      {step === "done" ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="mt-4 text-sm text-muted-foreground">Redirecting to your dashboard…</p>
        </div>
      ) : (
        <form
          onSubmit={
            step === "email" ? requestCode : step === "code" ? verifyCode : resetPassword
          }
          className="mt-8 space-y-5"
        >
          {step === "email" && (
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {step === "code" && (
            <div className="space-y-2">
              <Label htmlFor="code">6-digit PIN</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-xs text-muted-foreground">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={requestCode}
                  className="font-medium text-brand-bronze hover:underline"
                  disabled={loading}
                >
                  Resend PIN
                </button>
              </p>
            </div>
          )}

          {step === "password" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-brand-bronze"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" variant="premium" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === "email" && (loading ? "Sending PIN…" : "Send reset PIN")}
            {step === "code" && "Continue"}
            {step === "password" && (loading ? "Resetting…" : "Reset password")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
