import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline — Constrade+" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-bronze/10">
        <WifiOff className="h-8 w-8 text-brand-bronze" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">
          You're offline
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Constrade+ needs an internet connection for live prices and trading.
          Reconnect and try again.
        </p>
      </div>
      <Button asChild variant="premium">
        <Link href="/app">Retry</Link>
      </Button>
    </main>
  );
}
