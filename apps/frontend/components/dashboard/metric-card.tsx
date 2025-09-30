import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "flat";

export interface MetricCardProps {
  title: string;
  value: string;
  helperText?: string;
  change?: number;
  trend?: TrendDirection;
  className?: string;
}

export function MetricCard({ title, value, helperText, change, trend = "flat", className }: MetricCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const trendColor = trend === "down" ? "text-red-500" : trend === "up" ? "text-emerald-500" : "text-muted-foreground";

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <span className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</span>
        </div>
        {TrendIcon ? <TrendIcon className={cn("h-5 w-5", trendColor)} /> : null}
      </CardHeader>
      <CardContent>
        {helperText ? <p className="text-sm text-muted-foreground">{helperText}</p> : null}
        {typeof change === "number" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {change > 0 ? "+" : ""}
            {(change * 100).toFixed(1)}% vs. last period
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
