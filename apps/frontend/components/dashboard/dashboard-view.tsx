"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldOff, Sparkles } from "lucide-react";

import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  PropertySelector,
  type CreatePropertyPayload,
  type PropertyOption,
  type TimeRangeValue
} from "@/components/dashboard/property-selector";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api-client";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import { OperationsTable } from "./operations-table";
import type { PropertiesResponse } from "@shared/api";

function resolveTrend(change?: number) {
  if (typeof change !== "number") {
    return "flat";
  }
  if (change > 0.001) {
    return "up";
  }
  if (change < -0.001) {
    return "down";
  }
  return "flat";
}

interface DashboardViewProps {
  role: "admin" | "viewer";
}

export function DashboardView({ role }: DashboardViewProps) {
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(30);
  const queryClient = useQueryClient();

  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const propertiesQuery = useQuery({ queryKey: ["properties"], queryFn: api.properties });

  const propertyOptions: PropertyOption[] = useMemo(() => {
    return (propertiesQuery.data?.properties ?? []).map((property) => ({
      ...property,
      propertyCode: property.propertyCode ?? property.id,
      region: property.region ?? property.state ?? ""
    }));
  }, [propertiesQuery.data?.properties]);

  const handleCreateProperty = async (payload: CreatePropertyPayload): Promise<PropertyOption> => {
    const normalizedCode = payload.code.trim().toUpperCase();
    const baseId = normalizedCode.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `property-${Date.now()}`;
    const existingIds = new Set(propertyOptions.map((option) => option.id));
    let candidate = baseId;
    let increment = 1;
    while (existingIds.has(candidate)) {
      candidate = `${baseId}-${increment++}`;
    }

    const city = payload.city?.trim() || "—";
    const state = payload.state?.trim()?.toUpperCase() || "—";

    const created: PropertyOption = {
      id: candidate,
      name: payload.name.trim(),
      city,
      state,
      propertyCode: normalizedCode,
      region: state
    };

    queryClient.setQueryData<PropertiesResponse | undefined>(["properties"], (previous) => {
      const next = previous ?? { properties: [] };
      return {
        properties: [
          ...next.properties,
          {
            id: created.id,
            name: created.name,
            city: created.city,
            state: created.state,
            propertyCode: normalizedCode,
            region: state
          }
        ]
      } satisfies PropertiesResponse;
    });

    return created;
  };

  const metricsParams = useMemo(
    () => ({ propertyId: selectedProperty ?? undefined, window: timeRange }),
    [selectedProperty, timeRange]
  );

  const occupancyQuery = useQuery({
    queryKey: ["occupancy", metricsParams.propertyId, metricsParams.window],
    queryFn: () => api.occupancy(metricsParams),
    enabled: Boolean(metricsParams.propertyId)
  });

  const pipelineQuery = useQuery({
    queryKey: ["pipeline", metricsParams.propertyId, metricsParams.window],
    queryFn: () => api.pipeline(metricsParams),
    enabled: Boolean(metricsParams.propertyId)
  });

  const costQuery = useQuery({
    queryKey: ["cost", metricsParams.propertyId, metricsParams.window],
    queryFn: () => api.cost(metricsParams),
    enabled: Boolean(metricsParams.propertyId)
  });

  const reviewsQuery = useQuery({
    queryKey: ["reviews", selectedProperty],
    queryFn: () => api.reviews(selectedProperty ?? undefined),
    enabled: Boolean(selectedProperty)
  });

  const alertsQuery = useQuery({
    queryKey: ["alerts", selectedProperty],
    queryFn: () => api.alerts(selectedProperty ?? undefined),
    enabled: Boolean(selectedProperty)
  });

  const isAnyLoading =
    propertiesQuery.isLoading ||
    occupancyQuery.isLoading ||
    pipelineQuery.isLoading ||
    costQuery.isLoading ||
    reviewsQuery.isLoading;

  const fallbackUser = {
    id: "dashboard-user",
    name: "",
    email: "",
    orgId: "internal"
  } as const;

  const selectedPropertyName = propertyOptions.find((option) => option.id === selectedProperty)?.name;
  const hasProperties = propertyOptions.length > 0;
  const shouldShowEmptyState = !selectedProperty || !hasProperties;

  return (
    <DashboardShell user={meQuery.data ?? fallbackUser} role={role}>
      <section>
        <PropertySelector
          properties={propertyOptions}
          selectedPropertyId={selectedProperty}
          onPropertyChange={setSelectedProperty}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          disabled={propertiesQuery.isLoading}
          onCreateProperty={handleCreateProperty}
        />
      </section>

      {propertiesQuery.isError ? (
        <section>
          <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
            We couldn&apos;t load your property list. Please retry in a moment.
            <div className="mt-3">
              <Button type="button" size="sm" variant="destructive" onClick={() => propertiesQuery.refetch()}>
                Try again
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {shouldShowEmptyState && !propertiesQuery.isError ? (
        <section>
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card/85 px-8 py-16 text-center shadow-sm">
            <Sparkles className="h-8 w-8 text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No properties yet. Add one to get started.</h3>
              <p className="text-sm text-muted-foreground">
                Create your first property or choose one above to see live metrics populate instantly.
              </p>
            </div>
            <Button
              type="button"
              className="rounded-full px-6"
              onClick={() => document.getElementById("property-select")?.focus()}
            >
              Add a property
            </Button>
          </div>
        </section>
      ) : null}

      {!shouldShowEmptyState ? (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Average occupancy"
            value={occupancyQuery.data ? formatPercent(occupancyQuery.data.occupancyRate) : "--"}
            helperText={
              occupancyQuery.data
                ? `${occupancyQuery.data.unitsOccupied} of ${occupancyQuery.data.totalUnits} units`
                : undefined
            }
            change={occupancyQuery.data?.change}
            trend={resolveTrend(occupancyQuery.data?.change)}
            trendPoints={occupancyQuery.data?.trend}
            trendFormatter={(value) => `${formatPercent(value)} occupancy`}
            testId="metric-occupancy"
            isLoading={occupancyQuery.isPending && !occupancyQuery.data}
            isError={occupancyQuery.isError}
            onRetry={() => occupancyQuery.refetch()}
          />
          <MetricCard
            title="Pipeline conversions"
            value={pipelineQuery.data ? `${pipelineQuery.data.applicationsApproved}` : "--"}
            helperText={
              pipelineQuery.data
                ? `${pipelineQuery.data.newLeads} leads • ${pipelineQuery.data.toursScheduled} tours`
                : undefined
            }
            change={
              pipelineQuery.data
                ? pipelineQuery.data.applicationsApproved / Math.max(1, pipelineQuery.data.newLeads) - 0.3
                : undefined
            }
            trend={resolveTrend(
              pipelineQuery.data
                ? pipelineQuery.data.applicationsApproved / Math.max(1, pipelineQuery.data.newLeads) - 0.3
                : undefined
            )}
            trendPoints={pipelineQuery.data?.trend}
            trendFormatter={(value) => `${value} conversions/day`}
            testId="metric-pipeline"
            isLoading={pipelineQuery.isPending && !pipelineQuery.data}
            isError={pipelineQuery.isError}
            onRetry={() => pipelineQuery.refetch()}
          />
          <MetricCard
            title="Cost per lead"
            value={costQuery.data ? formatCurrency(costQuery.data.costPerLead) : "--"}
            helperText={costQuery.data ? `Spend ${formatCurrency(costQuery.data.marketingSpend)}` : ""}
            change={costQuery.data?.spendChange}
            trend={resolveTrend(costQuery.data?.spendChange)}
            trendPoints={costQuery.data?.trend}
            trendFormatter={(value) => `${formatCurrency(value)} CPL`}
            testId="metric-cost"
            isLoading={costQuery.isPending && !costQuery.data}
            isError={costQuery.isError}
            onRetry={() => costQuery.refetch()}
          />
        </section>
      ) : null}

      {!shouldShowEmptyState ? (
        <section className="grid gap-5 lg:grid-cols-[1.6fr,1fr]">
          <DashboardCard
            title={selectedPropertyName ? `${selectedPropertyName} reviews` : "Resident feedback"}
            description="Latest resident sentiment and response coverage"
            action={
              <Button type="button" size="sm" variant="ghost" className="gap-2" onClick={() => reviewsQuery.refetch()}>
                <Loader2 className={cn("h-4 w-4", reviewsQuery.isFetching && "animate-spin")} />
                Refresh
              </Button>
            }
          >
            {reviewsQuery.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : null}
            {reviewsQuery.isError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <ShieldOff className="h-10 w-10 text-destructive" />
                <p className="text-sm text-muted-foreground">Unable to load reviews. Please retry in a moment.</p>
                <Button type="button" size="sm" onClick={() => reviewsQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : null}
            {!reviewsQuery.isLoading && !reviewsQuery.isError && reviewsQuery.data ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card-contrast/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Average rating</p>
                    <p className="text-3xl font-semibold text-foreground">
                      {reviewsQuery.data.summary.averageRating.toFixed(1)}
                    </p>
                  </div>
                  <Separator orientation="vertical" className="hidden h-12 sm:block" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Response rate</p>
                    <p className="text-xl font-semibold text-foreground">{formatPercent(reviewsQuery.data.summary.responseRate)}</p>
                  </div>
                  <Separator orientation="vertical" className="hidden h-12 sm:block" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reviews</p>
                    <p className="text-xl font-semibold text-foreground">{reviewsQuery.data.summary.reviewCount}</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {reviewsQuery.data.recent.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition hover:border-border"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{review.author}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.submittedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </DashboardCard>

          <AlertsPanel
            alerts={alertsQuery.data?.alerts}
            isLoading={alertsQuery.isLoading}
            isError={alertsQuery.isError}
            onRetry={() => alertsQuery.refetch()}
          />
        </section>
      ) : null}

      <section className="pb-6">
        <DashboardCard
          title="Portfolio performance"
          description="Track contracts, SLAs and incident load across properties"
          action={
            role === "admin" ? (
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Admins can add, edit or delete records directly in this table.</span>
                <Button asChild variant="outline" size="sm" className="h-8 rounded-full border-border px-3">
                  <Link href="/tables">Open as table</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Viewer mode: editing disabled
              </div>
            )
          }
          contentClassName="-mt-2"
        >
          <OperationsTable canEdit={role === "admin"} />
        </DashboardCard>
      </section>

      {isAnyLoading && !selectedProperty ? (
        <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Preparing your dashboard...
        </div>
      ) : null}
    </DashboardShell>
  );
}
