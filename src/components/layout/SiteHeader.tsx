"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAreaTheme } from "@/hooks/use-area-theme";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Markets", href: "/#markets" },
  { label: "Services", href: "/#services" },
  { label: "Research", href: "/#research" },
  { label: "Regulators", href: "/#regulators" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // Marketing site defaults to light (unless the user picked a theme).
  useAreaTheme("light");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "glass border-b border-border shadow-card" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Constant Capital home">
          <Logo compact tone={scrolled ? "navy" : "white"} className="scale-90" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                scrolled
                  ? "text-foreground/80 hover:bg-muted hover:text-foreground"
                  : "text-white/85 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle
            className={cn(
              "hidden sm:inline-flex",
              !scrolled && "text-white hover:bg-white/10 hover:text-white",
            )}
          />
          {user ? (
            <Button asChild variant="premium" size="sm" className="hidden sm:inline-flex">
              <Link href="/app">My Portfolio</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "hidden sm:inline-flex",
                  !scrolled && "text-white hover:bg-white/10 hover:text-white",
                )}
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="premium" size="sm">
                <Link href="/register">Open an Account</Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("lg:hidden", !scrolled && "text-white hover:bg-white/10 hover:text-white")}
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/85 hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              {!user && (
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
              <Button asChild variant="premium" className="flex-1">
                <Link href={user ? "/app" : "/register"}>
                  {user ? "My Portfolio" : "Open an Account"}
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
