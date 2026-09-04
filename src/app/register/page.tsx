"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";

const Register = () => {
  const navigate = useRouter();
  const { signIn } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        accountType: "individual",
      });
      await signIn(email.trim(), password);
      toast.success("Account created — let's complete your onboarding");
      navigate.replace("/register/onboarding");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error during sign-up";
      toast.error("Sign-up failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
        Open an account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create your Constant Capital client account to start trading on the Ghana Stock
        Exchange.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              required
              autoComplete="given-name"
              placeholder="Kwame"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              required
              autoComplete="family-name"
              placeholder="Mensah"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" variant="premium" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
        You'll receive your CSD account number after onboarding.
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-bronze hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default Register;
