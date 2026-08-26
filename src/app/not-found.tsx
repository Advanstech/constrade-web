"use client";
import { usePathname } from "next/navigation";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";


const NotFound = () => {
  const location = usePathname();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location,
    );
  }, [location]);

  return (
    <div className="bg-gradient-navy flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="pointer-events-none absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-brand-bronze/20 blur-3xl" />
      <Logo tone="white" className="relative scale-90" />
      <p className="relative mt-8 font-display text-7xl font-extrabold text-white">404</p>
      <h1 className="relative mt-2 font-display text-xl font-bold text-white">
        Page not found
      </h1>
      <p className="relative mt-2 max-w-sm text-sm text-white/60">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Button asChild variant="premium" className="relative mt-8">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" /> Back to Constant Capital
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;
