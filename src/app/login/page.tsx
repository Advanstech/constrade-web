"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AuthShell } from "@/components/auth/AuthShell";

const RESEND_COOLDOWN_SECONDS = 120;

const Login = () => {
  const navigate = useRouter();
  const { signIn, signInWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<"pin" | "password">("pin");
  const [pinSent, setPinSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const redirectFor = (role?: string) => {
    const destination = ["trader", "compliance", "admin"].includes(role ?? "")
      ? "/admin/dashboard"
      : "/app/dashboard";
    navigate.replace(destination);
  };

  const sendPin = async () => {
    setSubmitting(true);
    try {
      const res = await authApi.requestOtp(email, "LOGIN");
      setPinSent(true);
      setPin("");
      setResendIn(RESEND_COOLDOWN_SECONDS);
      toast.success("PIN sent", { description: res.message });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not send PIN";
      toast.error("PIN request failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const verifyPin = async (code: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const profile = await signInWithOtp(email.trim(), code);
      toast.success("Welcome back");
      redirectFor(profile?.role);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid or expired PIN";
      setPin("");
      toast.error("Sign-in failed", { description: message });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === "pin") {
      if (!pinSent) {
        await sendPin();
      } else if (pin.length === 6) {
        await verifyPin(pin);
      }
      return;
    }

    setSubmitting(true);
    try {
      const profile = await signIn(email.trim(), password);
      toast.success("Welcome back");
      redirectFor(profile?.role);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error during sign-in";
      toast.error("Sign-in failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to your Constant Capital brokerage account.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="email">Email address</Label>
            {pinSent && (
              <button
                type="button"
                onClick={() => {
                  setPinSent(false);
                  setPin("");
                  setResendIn(0);
                }}
                className="text-xs font-medium text-brand-bronze hover:underline"
              >
                Use a different email
              </button>
            )}
          </div>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            readOnly={pinSent && loginMethod === "pin"}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {loginMethod === "pin" ? (
          pinSent ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                <MailCheck className="h-4 w-4 shrink-0 text-brand-bronze" />
                <span>
                  We sent a 6-digit PIN to <span className="font-medium text-foreground">{email}</span>
                </span>
              </div>

              <div className="space-y-2">
                <Label>Enter PIN</Label>
                <InputOTP
                  maxLength={6}
                  value={pin}
                  onChange={setPin}
                  onComplete={(code) => void verifyPin(code)}
                  autoFocus
                  inputMode="numeric"
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-12 w-11 text-lg font-semibold" />
                    <InputOTPSlot index={1} className="h-12 w-11 text-lg font-semibold" />
                    <InputOTPSlot index={2} className="h-12 w-11 text-lg font-semibold" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="h-12 w-11 text-lg font-semibold" />
                    <InputOTPSlot index={4} className="h-12 w-11 text-lg font-semibold" />
                    <InputOTPSlot index={5} className="h-12 w-11 text-lg font-semibold" />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">
                  The PIN is valid for 10 minutes. Check your inbox and spam folder.
                </p>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={sendPin}
                  disabled={submitting || resendIn > 0}
                  className="text-sm font-medium text-brand-bronze hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendIn > 0 ? `Resend PIN in ${resendIn}s` : "Resend PIN"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                We&apos;ll email you a one-time 6-digit PIN.
              </p>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-brand-bronze hover:underline"
              >
                Forgot PIN?
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-brand-bronze hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          variant="premium"
          disabled={submitting || (loginMethod === "pin" && pinSent && pin.length !== 6)}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting
            ? pinSent && loginMethod === "pin"
              ? "Verifying…"
              : "Signing in…"
            : loginMethod === "pin"
              ? pinSent
                ? "Verify & Sign in"
                : "Send PIN"
              : "Sign in"}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setLoginMethod((prev) => (prev === "pin" ? "password" : "pin"))}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {loginMethod === "pin" ? "Sign in with password instead" : "Sign in with PIN instead"}
          </button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to Constant Capital?{" "}
        <Link href="/register" className="font-semibold text-brand-bronze hover:underline">
          Open an account
        </Link>
      </p>
    </AuthShell>
  );
};

export default Login;
