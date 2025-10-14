"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldOff, Sparkles } from "lucide-react";

import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { MetricCard, type MetricTrendPoint } from "@/components/dashboard/metric-card";
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
import { useTablesQuery, type TableRecord } from "@/lib/tablesQuery";
import { cn } from "@/lib/utils";

import { OperationsTable } from "./operations-table";
import type { PropertiesResponse } from "@shared/api";

const numberFormatter = new Intl.NumberFormat("en-US");

function resolveValue(record: TableRecord | undefined, keys: string[]): unknown {
  if (!record) {
    return undefined;
  }

  const normalized = keys
    .map((key) => key?.trim().toLowerCase())
    .filter((key): key is string => Boolean(key));

  for (const candidate of normalized) {
    for (const [entryKey, entryValue] of Object.entries(record.values)) {
      if (entryKey.toLowerCase() === candidate) {
        return entryValue;
      }
    }
  }

  return undefined;
}

function resolveString(record: TableRecord | undefined, keys: string[]): string | null {
  const value = resolveValue(record, keys);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function resolveNumber(record: TableRecord | undefined, keys: string[]): number | null {
  const value = resolveValue(record, keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const sanitized = value.replace(/[^0-9+\-.,]/g, "");
    if (!sanitized) {
      return null;
    }
    const parsed = Number(sanitized.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseTrendPointsValue(raw: unknown): MetricTrendPoint[] | undefined {
  const toArray = (input: unknown): unknown[] | null => {
    if (Array.isArray(input)) {
      return input;
    }
    if (typeof input === "string" && input.trim()) {
      try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const items = toArray(raw);
  if (!items?.length) {
    return undefined;
  }

  const points: MetricTrendPoint[] = [];

  items.forEach((entry, index) => {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      points.push({ timestamp: String(index), value: entry });
      return;
    }

    if (!entry || typeof entry !== "object") {
      return;
    }

    const record = entry as Record<string, unknown>;
    const rawValue = record.value ?? record.metric ?? record.amount ?? record.count;
    const numericValue =
      typeof rawValue === "number"
        ? rawValue
        : typeof rawValue === "string"
          ? Number(rawValue.replace(/,/g, ""))
          : null;

    if (numericValue === null || Number.isNaN(numericValue)) {
      return;
    }

    const rawTimestamp = record.timestamp ?? record.date ?? record.period ?? record.label;
    const timestamp =
      typeof rawTimestamp === "string" && rawTimestamp.trim().length
        ? rawTimestamp
        : String(index);

    points.push({ timestamp, value: numericValue });
  });

  return points.length ? points : undefined;
}

function resolveTrendPoints(record: TableRecord | undefined, keys: string[]): MetricTrendPoint[] | undefined {
  const value = resolveValue(record, keys);
  return parseTrendPointsValue(value);
}

function buildMetricMap(records: TableRecord[], keys: string[]): Map<string, TableRecord> {
  const map = new Map<string, TableRecord>();
  for (const record of records) {
    const identifier = resolveString(record, keys);
    if (!identifier) {
      continue;
    }
    map.set(identifier.toLowerCase(), record);
  }
  return map;
}

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

  const metricsTableId = process.env.NEXT_PUBLIC_TABLES_METRICS_TABLE_ID ?? null;
  const metricsViewId = process.env.NEXT_PUBLIC_TABLES_METRICS_VIEW_ID ?? null;
  const metricsPropertyHint = (process.env.NEXT_PUBLIC_TABLES_METRICS_PROPERTY_COLUMN ?? "property_id").trim();
  const metricsMetricHint = (process.env.NEXT_PUBLIC_TABLES_METRICS_METRIC_COLUMN ?? "metric").trim();
  const occupancyKeyHint = (process.env.NEXT_PUBLIC_TABLES_METRICS_OCCUPANCY_KEY ?? "occupancy").trim();
  const pipelineKeyHint = (process.env.NEXT_PUBLIC_TABLES_METRICS_PIPELINE_KEY ?? "pipeline").trim();
  const costKeyHint = (process.env.NEXT_PUBLIC_TABLES_METRICS_COST_KEY ?? "cost_per_lead").trim();
  const metricsEnabled = Boolean(metricsTableId);

  const [metricsPropertyColumnId, setMetricsPropertyColumnId] = useState<string | null>(null);

  const metricsRequest = useMemo(() => {
    const request: { viewId?: string; filters?: Array<{ columnId: string; operator: "eq"; value: string }> } = {};
    if (metricsViewId) {
      request.viewId = metricsViewId;
    }
    if (metricsPropertyColumnId && selectedProperty) {
      request.filters = [
        {
          columnId: metricsPropertyColumnId,
          operator: "eq",
          value: selectedProperty
        }
      ];
    }
    return request;
  }, [metricsPropertyColumnId, metricsViewId, selectedProperty]);

  const metricsQuery = useTablesQuery(metricsTableId ?? undefined, metricsRequest, {
    enabled: metricsEnabled && Boolean(selectedProperty)
  });

  useEffect(() => {
    if (!metricsEnabled) {
      if (metricsPropertyColumnId) {
        setMetricsPropertyColumnId(null);
      }
      return;
    }

    const columns = metricsQuery.data?.columns;
    if (!columns?.length || metricsPropertyColumnId) {
      return;
    }

    const directMatch = columns.find((column) => column.id === metricsPropertyHint);
    if (directMatch) {
      setMetricsPropertyColumnId(directMatch.id);
      return;
    }

    const normalized = metricsPropertyHint.toLowerCase();
    const match = columns.find((column) => {
      const slug = column.slug.trim().toLowerCase();
      const name = column.name.trim().toLowerCase();
      return slug === normalized || name === normalized;
    });

    if (match) {
      setMetricsPropertyColumnId(match.id);
    }
  }, [metricsEnabled, metricsPropertyColumnId, metricsPropertyHint, metricsQuery.data?.columns]);

  const propertyOptions: PropertyOption[] = useMemo(() => {
    return (propertiesQuery.data?.properties ?? []).map((property) => ({
      ...property,
      propertyCode: property.propertyCode ?? property.id,
      region: property.region ?? property.state ?? ""
    }));
  }, [propertiesQuery.data?.properties]);

  const metricKeyCandidates = useMemo(
    () => [metricsMetricHint, "metric", "metric_key", "name"],
    [metricsMetricHint]
  );
  const metricsMap = useMemo(() => buildMetricMap(metricsQuery.data?.records ?? [], metricKeyCandidates), [
    metricKeyCandidates,
    metricsQuery.data?.records
  ]);

  const getMetricRecord = useCallback(
    (...aliases: string[]) => {
      for (const alias of aliases) {
        const normalized = alias.trim().toLowerCase();
        if (!normalized) {
          continue;
        }
        const record = metricsMap.get(normalized);
        if (record) {
          return record;
        }
      }
      return undefined;
    },
    [metricsMap]
  );

  const valueKeys = ["value", "metric_value", "current_value"];
  const changeKeys = ["change", "delta", "change_rate"];
  const helperKeys = ["helper", "helper_text", "summary", "description"];
  const trendKeys = ["trend", "trend_points", "history"];

  const occupancyRecord = useMemo(
    () => getMetricRecord(occupancyKeyHint, "occupancy", "occupancy_rate"),
    [getMetricRecord, occupancyKeyHint]
  );
  const pipelineRecord = useMemo(
    () => getMetricRecord(pipelineKeyHint, "pipeline", "leasing_velocity", "conversions"),
    [getMetricRecord, pipelineKeyHint]
  );
  const costRecord = useMemo(
    () => getMetricRecord(costKeyHint, "cost", "cost_per_lead", "marketing_spend"),
    [getMetricRecord, costKeyHint]
  );

  const occupancyValue = resolveNumber(occupancyRecord, [...valueKeys, "occupancy_rate"]);
  const occupancyChange = resolveNumber(occupancyRecord, [...changeKeys, "occupancy_change"]);
  const occupancyUnits = resolveNumber(occupancyRecord, ["units_occupied", "occupied_units"]);
  const occupancyTotal = resolveNumber(occupancyRecord, ["total_units", "units_total"]);
  const occupancyHelperText =
    occupancyUnits !== null && occupancyTotal !== null
      ? `${numberFormatter.format(occupancyUnits)} of ${numberFormatter.format(occupancyTotal)} units`
      : resolveString(occupancyRecord, helperKeys) ?? undefined;
  const occupancyTrend = resolveTrendPoints(occupancyRecord, trendKeys);

  const pipelineValue = resolveNumber(pipelineRecord, [...valueKeys, "applications_approved", "conversions"]);
  const pipelineLeads = resolveNumber(pipelineRecord, ["leads", "new_leads"]);
  const pipelineTours = resolveNumber(pipelineRecord, ["tours", "tours_scheduled"]);
  const pipelineHelperParts: string[] = [];
  if (pipelineLeads !== null) {
    pipelineHelperParts.push(`${numberFormatter.format(pipelineLeads)} leads`);
  }
  if (pipelineTours !== null) {
    pipelineHelperParts.push(`${numberFormatter.format(pipelineTours)} tours`);
  }
  const pipelineHelperText =
    pipelineHelperParts.length > 0 ? pipelineHelperParts.join(" • ") : resolveString(pipelineRecord, helperKeys) ?? undefined;
  const pipelineChange = resolveNumber(pipelineRecord, changeKeys);
  const pipelineTrend = resolveTrendPoints(pipelineRecord, trendKeys);

  const costValue = resolveNumber(costRecord, [...valueKeys, "cost_per_lead"]);
  const costSpend = resolveNumber(costRecord, ["spend", "marketing_spend"]);
  const costHelperText =
    costSpend !== null ? `Spend ${formatCurrency(costSpend)}` : resolveString(costRecord, helperKeys) ?? undefined;
  const costChange = resolveNumber(costRecord, changeKeys);
  const costTrend = resolveTrendPoints(costRecord, trendKeys);

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
    (metricsEnabled && metricsQuery.isLoading) ||
    reviewsQuery.isLoading ||
    alertsQuery.isLoading;

  const fallbackUser = {
    id: "dashboard-user",
    name: "",
    email: "",
    orgId: "internal"
  } as const;

  const hasProperties = propertyOptions.length > 0;
  const selectedPropertyName = propertyOptions.find((option) => option.id === selectedProperty)?.name;
  const shouldShowEmptyState = !hasProperties && !propertiesQuery.isLoading && !propertiesQuery.isFetching;
  const metricsUnavailable =
    metricsEnabled &&
    Boolean(selectedProperty) &&
    !shouldShowEmptyState &&
    !isAnyLoading &&
    !propertiesQuery.isError &&
    !metricsQuery.isError &&
    (!metricsQuery.data || metricsQuery.data.records.length === 0);

  useEffect(() => {
    if (!hasProperties) {
      if (selectedProperty !== null) {
        setSelectedProperty(null);
      }
      return;
    }

    const selectedStillExists = selectedProperty
      ? propertyOptions.some((option) => option.id === selectedProperty)
      : false;

    if (!selectedStillExists) {
      setSelectedProperty(propertyOptions[0]?.id ?? null);
    }
  }, [hasProperties, propertyOptions, selectedProperty]);

  return (
    <DashboardShell user={meQuery.data ?? fallbackUser} role={role}>
      <section className="grid grid-cols-1 gap-3 md:grid-cols-6 md:gap-4">
        <div className="md:col-span-6">
          <PropertySelector
            properties={propertyOptions}
            selectedPropertyId={selectedProperty}
            onPropertyChange={setSelectedProperty}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            disabled={propertiesQuery.isLoading}
            onCreateProperty={handleCreateProperty}
          />
        </div>
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
              <h3 className="text-lg font-semibold text-text">No properties yet. Add one to get started.</h3>
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
            {role === "admin" ? (
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link href="/admin/sources">Connect a data source →</Link>
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {metricsUnavailable ? (
        <section>
          <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-border/70 bg-card/80 px-8 py-16 text-center shadow-sm">
            <Sparkles className="h-8 w-8 text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-text">Waiting on your first sync</h3>
              <p className="text-sm text-muted-foreground">
                Connect a data source or publish a live dashboard to start streaming portfolio metrics into this workspace.
              </p>
            </div>
            {role === "admin" ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild className="rounded-full px-6">
                  <Link href="/admin/sources">Connect a source</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full px-6">
                  <Link href="/reports">Publish live dashboard</Link>
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline" className="rounded-full px-6">
                <a href="mailto:ops@astalla.com?subject=Live%20dashboard%20request">Request live access</a>
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {!shouldShowEmptyState && !metricsUnavailable ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-6 md:gap-4">
          <MetricCard
            title="Average occupancy"
            value={occupancyValue !== null ? formatPercent(occupancyValue) : "--"}
            helperText={occupancyHelperText}
            change={occupancyChange ?? undefined}
            trend={resolveTrend(occupancyChange ?? undefined)}
            trendPoints={occupancyTrend}
            trendFormatter={(value) => `${formatPercent(value)} occupancy`}
            testId="metric-occupancy"
            isLoading={metricsEnabled && metricsQuery.isPending && !metricsQuery.data}
            isError={metricsQuery.isError}
            onRetry={() => metricsQuery.refetch()}
            className="min-h-[120px] md:col-span-2"
          />
          <MetricCard
            title="Pipeline conversions"
            value={pipelineValue !== null ? numberFormatter.format(pipelineValue) : "--"}
            helperText={pipelineHelperText}
            change={pipelineChange ?? undefined}
            trend={resolveTrend(pipelineChange ?? undefined)}
            trendPoints={pipelineTrend}
            trendFormatter={(value) => `${numberFormatter.format(value)} conversions`}
            testId="metric-pipeline"
            isLoading={metricsEnabled && metricsQuery.isPending && !metricsQuery.data}
            isError={metricsQuery.isError}
            onRetry={() => metricsQuery.refetch()}
            className="min-h-[120px] md:col-span-2"
          />
          <MetricCard
            title="Cost per lead"
            value={costValue !== null ? formatCurrency(costValue) : "--"}
            helperText={costHelperText}
            change={costChange ?? undefined}
            trend={resolveTrend(costChange ?? undefined)}
            trendPoints={costTrend}
            trendFormatter={(value) => `${formatCurrency(value)} CPL`}
            testId="metric-cost"
            isLoading={metricsEnabled && metricsQuery.isPending && !metricsQuery.data}
            isError={metricsQuery.isError}
            onRetry={() => metricsQuery.refetch()}
            className="min-h-[120px] md:col-span-2"
          />
        </section>
      ) : null}

      {!shouldShowEmptyState && !metricsUnavailable ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-6 md:gap-4">
          <DashboardCard
            title={selectedPropertyName ? `${selectedPropertyName} reviews` : "Resident feedback"}
            description="Latest resident sentiment and response coverage"
            action={
              <Button type="button" size="sm" variant="ghost" className="gap-2" onClick={() => reviewsQuery.refetch()}>
                <Loader2 className={cn("h-4 w-4", reviewsQuery.isFetching && "animate-spin")} />
                Refresh
              </Button>
            }
            className="md:col-span-4 min-h-[120px]"
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
                    <p className="text-sm font-semibold text-text">Average rating</p>
                    <p className="text-3xl font-semibold text-text">
                      {reviewsQuery.data.summary.averageRating.toFixed(1)}
                    </p>
                  </div>
                  <Separator orientation="vertical" className="hidden h-12 sm:block" />
                  <div>
                    <p className="text-sm font-semibold text-text">Response rate</p>
                    <p className="text-xl font-semibold text-text">{formatPercent(reviewsQuery.data.summary.responseRate)}</p>
                  </div>
                  <Separator orientation="vertical" className="hidden h-12 sm:block" />
                  <div>
                    <p className="text-sm font-semibold text-text">Reviews</p>
                    <p className="text-xl font-semibold text-text">{reviewsQuery.data.summary.reviewCount}</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {reviewsQuery.data.recent.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition hover:border-border"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text">{review.author}</p>
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

          <div className="md:col-span-2 min-h-[120px]">
            <AlertsPanel
              alerts={alertsQuery.data?.alerts}
              isLoading={alertsQuery.isLoading}
              isError={alertsQuery.isError}
              onRetry={() => alertsQuery.refetch()}
            />
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-3 pb-6 md:grid-cols-6 md:gap-4">
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
          className="md:col-span-6"
        >
          <OperationsTable canEdit={role === "admin"} />
        </DashboardCard>
      </section>

      {isAnyLoading && selectedProperty ? (
        <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Refreshing live metrics…
        </div>
      ) : null}
    </DashboardShell>
  );
}
