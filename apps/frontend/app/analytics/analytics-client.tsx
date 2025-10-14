"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useTablesQuery, type TableRecord } from "@/lib/tablesQuery";

const numberFormatter = new Intl.NumberFormat("en-US");
const SERIES_COLORS = ["var(--primary)", "var(--accent)", "var(--muted-foreground)"];

type PropertyOption = { id: string; name: string };

type ChartPoint = { label: string; value: number; order: number };

type ChartSeries = { name: string; points: ChartPoint[] };

type ChartDefinition = {
  id: string;
  title: string;
  description?: string;
  series: ChartSeries[];
};

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

function buildChartDefinitions(
  records: TableRecord[],
  options: {
    chartKeys: string[];
    titleKeys: string[];
    descriptionKeys: string[];
    seriesKeys: string[];
    timestampKeys: string[];
    valueKeys: string[];
  }
): ChartDefinition[] {
  const chartMap = new Map<
    string,
    {
      id: string;
      title: string;
      description?: string;
      series: Map<string, ChartSeries>;
    }
  >();

  records.forEach((record) => {
    const chartId = resolveString(record, options.chartKeys);
    if (!chartId) {
      return;
    }

    const title = resolveString(record, options.titleKeys) ?? chartId;
    const description = resolveString(record, options.descriptionKeys) ?? undefined;
    const seriesName = resolveString(record, options.seriesKeys) ?? "Series";
    const timestamp = resolveString(record, options.timestampKeys);
    const value = resolveNumber(record, options.valueKeys);

    if (value === null) {
      return;
    }

    const definition =
      chartMap.get(chartId) ?? {
        id: chartId,
        title,
        description,
        series: new Map<string, ChartSeries>()
      };

    chartMap.set(chartId, definition);

    const existingSeries = definition.series.get(seriesName) ?? {
      name: seriesName,
      points: [] as ChartPoint[]
    };

    const parsedTimestamp = timestamp ? Date.parse(timestamp) : Number.NaN;
    const order = Number.isFinite(parsedTimestamp) ? parsedTimestamp : record.row.position ?? existingSeries.points.length;

    existingSeries.points.push({
      label: timestamp ?? `Point ${existingSeries.points.length + 1}`,
      value,
      order
    });

    definition.series.set(seriesName, existingSeries);
  });

  return Array.from(chartMap.values()).map((entry) => ({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    series: Array.from(entry.series.values()).map((series) => ({
      name: series.name,
      points: series.points.sort((a, b) => a.order - b.order)
    }))
  }));
}

export function AnalyticsClient() {
  const analyticsTableId = process.env.NEXT_PUBLIC_TABLES_ANALYTICS_TABLE_ID ?? null;
  const analyticsViewId = process.env.NEXT_PUBLIC_TABLES_ANALYTICS_VIEW_ID ?? null;
  const analyticsPropertyHint = (process.env.NEXT_PUBLIC_TABLES_ANALYTICS_PROPERTY_COLUMN ?? "property_id").trim();
  const chartKeyHint = (process.env.NEXT_PUBLIC_TABLES_ANALYTICS_CHART_COLUMN ?? "chart").trim();
  const titleKeyHint = (process.env.NEXT_PUBLIC_TABLES_ANALYTICS_TITLE_COLUMN ?? "title").trim();
  const descriptionKeyHint = (process.env.NEXT_PUBLIC_TABLES_ANALYTICS_DESCRIPTION_COLUMN ?? "description").trim();
  const seriesKeyHint = (process.env.NEXT_PUBLIC_TABLES_ANALYTICS_SERIES_COLUMN ?? "series").trim();
  const timestampKeyHint = (process.env.NEXT_PUBLIC_TABLES_ANALYTICS_TIMESTAMP_COLUMN ?? "timestamp").trim();
  const valueKeyHint = (process.env.NEXT_PUBLIC_TABLES_ANALYTICS_VALUE_COLUMN ?? "value").trim();

  const analyticsEnabled = Boolean(analyticsTableId);

  const propertiesQuery = useQuery({ queryKey: ["analytics-properties"], queryFn: api.properties });

  const propertyOptions = useMemo<PropertyOption[]>(() => {
    return (propertiesQuery.data?.properties ?? []).map((property) => ({
      id: property.id,
      name: property.name
    }));
  }, [propertiesQuery.data?.properties]);

  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [propertyColumnId, setPropertyColumnId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProperty && propertyOptions.length) {
      setSelectedProperty(propertyOptions[0].id);
    }
  }, [propertyOptions, selectedProperty]);

  const analyticsRequest = useMemo(() => {
    const request: { viewId?: string; filters?: Array<{ columnId: string; operator: "eq"; value: string }> } = {};
    if (analyticsViewId) {
      request.viewId = analyticsViewId;
    }
    if (propertyColumnId && selectedProperty) {
      request.filters = [
        {
          columnId: propertyColumnId,
          operator: "eq",
          value: selectedProperty
        }
      ];
    }
    return request;
  }, [analyticsViewId, propertyColumnId, selectedProperty]);

  const analyticsQuery = useTablesQuery(analyticsTableId ?? undefined, analyticsRequest, {
    enabled: analyticsEnabled && Boolean(selectedProperty)
  });

  useEffect(() => {
    if (!analyticsEnabled) {
      if (propertyColumnId) {
        setPropertyColumnId(null);
      }
      return;
    }

    const columns = analyticsQuery.data?.columns;
    if (!columns?.length || propertyColumnId) {
      return;
    }

    const directMatch = columns.find((column) => column.id === analyticsPropertyHint);
    if (directMatch) {
      setPropertyColumnId(directMatch.id);
      return;
    }

    const normalized = analyticsPropertyHint.toLowerCase();
    const match = columns.find((column) => {
      const slug = column.slug.trim().toLowerCase();
      const name = column.name.trim().toLowerCase();
      return slug === normalized || name === normalized;
    });

    if (match) {
      setPropertyColumnId(match.id);
    }
  }, [analyticsEnabled, analyticsPropertyHint, analyticsQuery.data?.columns, propertyColumnId]);

  const chartKeyCandidates = useMemo(
    () => [chartKeyHint, "chart", "chart_id", "widget"],
    [chartKeyHint]
  );
  const titleKeyCandidates = useMemo(
    () => [titleKeyHint, "title", "chart_title", "name"],
    [titleKeyHint]
  );
  const descriptionKeyCandidates = useMemo(
    () => [descriptionKeyHint, "description", "chart_description", "summary"],
    [descriptionKeyHint]
  );
  const seriesKeyCandidates = useMemo(
    () => [seriesKeyHint, "series", "segment"],
    [seriesKeyHint]
  );
  const timestampKeyCandidates = useMemo(
    () => [timestampKeyHint, "timestamp", "date", "period"],
    [timestampKeyHint]
  );
  const valueKeyCandidates = useMemo(
    () => [valueKeyHint, "value", "metric_value"],
    [valueKeyHint]
  );

  const charts = useMemo(() => {
    if (!analyticsQuery.data?.records) {
      return [] as ChartDefinition[];
    }

    return buildChartDefinitions(analyticsQuery.data.records, {
      chartKeys: chartKeyCandidates,
      titleKeys: titleKeyCandidates,
      descriptionKeys: descriptionKeyCandidates,
      seriesKeys: seriesKeyCandidates,
      timestampKeys: timestampKeyCandidates,
      valueKeys: valueKeyCandidates
    });
  }, [
    analyticsQuery.data?.records,
    chartKeyCandidates,
    descriptionKeyCandidates,
    seriesKeyCandidates,
    timestampKeyCandidates,
    titleKeyCandidates,
    valueKeyCandidates
  ]);

  const isLoading =
    propertiesQuery.isLoading ||
    (analyticsEnabled && analyticsQuery.isLoading) ||
    (analyticsEnabled && analyticsQuery.isFetching);

  const hasError = propertiesQuery.isError || analyticsQuery.isError;

  const handlePropertyChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProperty(event.target.value || null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-text">Property analytics</h2>
          <p className="text-sm text-muted-foreground">
            Explore normalized table data for each chart. Select a property to filter the dataset.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-property" className="text-sm font-medium text-muted-foreground">
            Property
          </label>
          <select
            id="analytics-property"
            value={selectedProperty ?? ""}
            onChange={handlePropertyChange}
            className="rounded-xl border border-border/60 bg-card px-3 py-2 text-sm shadow-sm"
            disabled={!propertyOptions.length}
          >
            {propertyOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[320px] items-center justify-center rounded-2xl border border-border bg-card/80 shadow-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading analytics…
          </div>
        </div>
      ) : null}

      {hasError ? (
        <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive">
          We couldn&apos;t load analytics data. Please try again later.
        </div>
      ) : null}

      {!isLoading && !hasError ? (
        charts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {charts.map((chart) => (
              <Card key={chart.id} className="border-border/70 bg-card/90 shadow-card transition hover:shadow-cardHover">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-text">{chart.title}</CardTitle>
                  {chart.description ? (
                    <p className="text-sm text-muted-foreground">{chart.description}</p>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {chart.series.length === 0 || chart.series.every((series) => series.points.length === 0) ? (
                    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/40 text-sm text-muted-foreground">
                      No datapoints available for this chart.
                    </div>
                  ) : (
                    <LineChart series={chart.series} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/80 p-8 text-center shadow-card">
            <h3 className="text-base font-semibold text-text">Connect a data source</h3>
            <p className="text-sm text-muted-foreground">
              Once your analytics table has rows, charts for occupancy, leasing velocity, and marketing performance will render here.
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}

interface LineChartProps {
  series: ChartSeries[];
}

function LineChart({ series }: LineChartProps) {
  const width = 320;
  const height = 160;

  const allPoints = series.flatMap((entry) => entry.points);
  const values = allPoints.map((point) => point.value);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const valueRange = maxValue - minValue || 1;

  return (
    <figure className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
        <g stroke="var(--border)" strokeDasharray="4 4" strokeWidth={1}>
          <line x1={0} y1={height} x2={width} y2={height} />
        </g>
        {series.map((entry, index) => {
          if (entry.points.length === 0) {
            return null;
          }
          const color = SERIES_COLORS[index % SERIES_COLORS.length];
          const path = entry.points
            .map((point, pointIndex) => {
              const x = (pointIndex / Math.max(1, entry.points.length - 1)) * width;
              const y = height - ((point.value - minValue) / valueRange) * height;
              return `${pointIndex === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");

          return <path key={entry.name} d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />;
        })}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {series.map((entry, index) => {
          if (entry.points.length === 0) {
            return null;
          }
          const latest = entry.points[entry.points.length - 1];
          const color = SERIES_COLORS[index % SERIES_COLORS.length];
          return (
            <span key={entry.name} className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span>
                {entry.name}: {numberFormatter.format(latest.value)}
              </span>
            </span>
          );
        })}
      </figcaption>
    </figure>
  );
}
