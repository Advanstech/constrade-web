"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";

const Login = () => {
  const navigate = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const profile = await signIn(email.trim(), password);
      toast.success("Welcome back");
      const destination = ["trader", "compliance", "admin"].includes(profile?.role ?? "")
        ? "/admin"
        : "/app";
      navigate.replace(destination);
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              className="text-xs font-medium text-brand-bronze hover:underline"
              onClick={() => toast.info("Password reset", { description: "Contact support@constantcap.com.gh" })}
            >
              Forgot password?
            </button>
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

        <Button type="submit" className="w-full" size="lg" variant="premium" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
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
