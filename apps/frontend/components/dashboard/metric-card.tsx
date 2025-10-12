import { Loader2, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "flat";

export type MetricTrendPoint = {
  timestamp: string;
  value: number;
};

export interface MetricCardProps {
  title: string;
  value: string;
  helperText?: string;
  change?: number;
  trend?: TrendDirection;
  trendPoints?: MetricTrendPoint[];
  trendFormatter?: (value: number) => string;
  className?: string;
  testId?: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function MetricCard({
  title,
  value,
  helperText,
  change,
  trend = "flat",
  trendPoints,
  trendFormatter,
  className,
  testId,
  isLoading,
  isError,
  onRetry
}: MetricCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const trendColor = trend === "down" ? "text-danger" : trend === "up" ? "text-success" : "text-muted-foreground";

  return (
    <Card className={cn("h-full transition-shadow hover:shadow-md focus-within:shadow-md", className)} data-testid={testId}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6 pb-4">
        <div className="flex flex-col">
          <CardTitle className="text-[clamp(1.125rem,2vw,1.375rem)] font-semibold text-text/95">{title}</CardTitle>
          <span className="mt-3 text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-tight text-text">
            {isLoading || isError ? "--" : value}
          </span>
        </div>
        {!isLoading && !isError && TrendIcon ? <TrendIcon className={cn("h-5 w-5", trendColor)} /> : null}
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        {isLoading ? (
          <div className="flex h-24 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading metric…
          </div>
        ) : null}
        {isError ? (
          <div className="flex h-24 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <p>We couldn&apos;t load this metric.</p>
            {onRetry ? (
              <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}
        {!isLoading && !isError ? (
          <div className="space-y-3">
            {helperText ? <p className="text-[clamp(.9rem,1.5vw,1rem)] text-text/75">{helperText}</p> : null}
            {typeof change === "number" ? (
              <p className="text-[clamp(.9rem,1.5vw,1rem)] text-text/70">
                {change > 0 ? "+" : ""}
                {(change * 100).toFixed(1)}% vs. last period
              </p>
            ) : null}
            {trendPoints && trendPoints.length > 1 ? (
              <div className="rounded-2xl border border-border/60 bg-card-contrast/60 p-3 shadow-sm">
                <Sparkline points={trendPoints} formatter={trendFormatter} />
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface SparklineProps {
  points: MetricTrendPoint[];
  formatter?: (value: number) => string;
}

function Sparkline({ points, formatter }: SparklineProps) {
  const width = 220;
  const height = 80;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const latest = points[points.length - 1];

  return (
    <figure className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={formatter ? formatter(latest.value) : `Latest value ${latest.value}`}
        viewBox={`0 0 ${width} ${height}`}
        className="h-20 w-full"
      >
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        {formatter ? formatter(latest.value) : `Latest: ${latest.value}`}
      </figcaption>
    </figure>
  );
}
