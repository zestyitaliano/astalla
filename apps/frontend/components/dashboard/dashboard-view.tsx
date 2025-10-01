"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import { DashboardShell } from "./dashboard-shell";

export function DashboardView() {
  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const occupancyQuery = useQuery({ queryKey: ["metrics", "occupancy"], queryFn: api.occupancy });
  const pipelineQuery = useQuery({ queryKey: ["metrics", "pipeline"], queryFn: api.pipeline });
  const costQuery = useQuery({ queryKey: ["metrics", "cost"], queryFn: api.cost });
  const reviewsQuery = useQuery({ queryKey: ["reviews", "latest"], queryFn: api.reviews });
  const reportQuery = useQuery({ queryKey: ["reports", "weekly"], queryFn: api.report });

  const isLoading =
    meQuery.isLoading ||
    occupancyQuery.isLoading ||
    pipelineQuery.isLoading ||
    costQuery.isLoading ||
    reviewsQuery.isLoading ||
    reportQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (meQuery.error || !meQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-500">Unable to load dashboard data.</p>
      </div>
    );
  }

  const occupancy = occupancyQuery.data;
  const pipeline = pipelineQuery.data;
  const cost = costQuery.data;
  const reviews = reviewsQuery.data;
  const report = reportQuery.data;

  if (
    occupancyQuery.error ||
    pipelineQuery.error ||
    costQuery.error ||
    reviewsQuery.error ||
    reportQuery.error ||
    !occupancy ||
    !pipeline ||
    !cost ||
    !reviews ||
    !report
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-500">Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <DashboardShell user={meQuery.data}>
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Occupancy"
          value={`${(occupancy.occupancyRate * 100).toFixed(1)}%`}
          helperText={`${occupancy.unitsOccupied} of ${occupancy.totalUnits} units occupied`}
          change={occupancy.change}
          trend={occupancy.change >= 0 ? "up" : "down"}
        />
        <MetricCard
          title="Pipeline Velocity"
          value={`${pipeline.applicationsApproved} approvals`}
          helperText={`${pipeline.newLeads} new leads → ${pipeline.applicationsStarted} apps started`}
          trend={pipeline.applicationsApproved >= pipeline.applicationsStarted ? "up" : "flat"}
        />
        <MetricCard
          title="Cost per Lead"
          value={`$${cost.costPerLead.toFixed(0)}`}
          helperText={`Marketing spend $${cost.marketingSpend.toLocaleString()}`}
          change={cost.spendChange}
          trend={cost.spendChange <= 0 ? "up" : "down"}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Review Pulse</CardTitle>
            <p className="text-sm text-muted-foreground">
              {reviews.summary.reviewCount} reviews • {(reviews.summary.averageRating).toFixed(1)} average rating
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.recent.map((review) => (
              <article key={review.id} className="space-y-1 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{review.author}</h3>
                  <span className={cn("text-sm", review.rating >= 4 ? "text-emerald-500" : "text-yellow-500")}>★ {review.rating}</span>
                </div>
                <p className="text-sm text-muted-foreground">{review.body}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(review.submittedAt).toLocaleString()}
                </p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Weekly Snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">
              Generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report.highlights.map((highlight, index) => (
                <li key={index} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Watchlist & Alerts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Properties requiring attention this week
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.watchlist.map((item) => (
              <div
                key={item.propertyId}
                className="flex items-center justify-between rounded-lg border bg-card/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.propertyName}</p>
                  <p className="text-xs text-muted-foreground">{item.issue}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    item.tag === "red"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-amber-500/10 text-amber-500"
                  )}
                >
                  {item.tag.toUpperCase()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  );
}
