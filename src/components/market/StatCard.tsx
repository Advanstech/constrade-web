import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  hint?: string;
  icon?: React.ReactNode;
  invert?: boolean;
}

export function StatCard({ label, value, change, hint, icon, invert }: StatCardProps) {
  return (
    <Card className="border-border/70 shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {icon}
        </div>
        <p className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {value}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {change !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
                change >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                invert && change < 0 && "bg-success/10 text-success",
                invert && change > 0 && "bg-danger/10 text-danger",
              )}
            >
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(change).toFixed(2)}%
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
