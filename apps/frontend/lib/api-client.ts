import { getSession } from "next-auth/react";

import { isMockMode, apiBaseUrl } from "@/lib/utils";
import {
  alertsResponseSchema,
  costMetricsSchema,
  latestReviewsSchema,
  meResponseSchema,
  occupancyMetricsSchema,
  pipelineMetricsSchema,
  propertiesResponseSchema,
  weeklyReportSchema
} from "@shared/api";
import type {
  AlertsResponse,
  CostMetricsResponse,
  LatestReviewsResponse,
  MeResponse,
  OccupancyMetricsResponse,
  PipelineMetricsResponse,
  PropertiesResponse,
  WeeklyReportResponse
} from "@shared/api";

const isDevelopment = process.env.NODE_ENV === "development";

async function resolveAccessToken() {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const session = await getSession();
    return session?.accessToken ?? undefined;
  } catch (error) {
    if (isDevelopment) {
      console.warn("Failed to read session before API request", error);
    }
    return undefined;
  }
}

async function fetchJson<T>(path: string, schema: { parse: (data: unknown) => T }): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "x-mock-mode": isMockMode() ? "true" : "false"
  };

  const accessToken = await resolveAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    headers,
    cache: "no-store",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`);
  }

  const json = await response.json();
  return schema.parse(json);
}

type MetricParams = {
  propertyId?: string;
  window?: string | number;
};

function createQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  });
  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

export const api = {
  me: () => fetchJson<MeResponse>("/auth/me", meResponseSchema),
  occupancy: (params: MetricParams) =>
    fetchJson<OccupancyMetricsResponse>(
      `/metrics/occupancy${createQuery({ propertyId: params.propertyId, window: params.window })}`,
      occupancyMetricsSchema
    ),
  pipeline: (params: MetricParams) =>
    fetchJson<PipelineMetricsResponse>(
      `/metrics/pipeline${createQuery({ propertyId: params.propertyId, window: params.window })}`,
      pipelineMetricsSchema
    ),
  cost: (params: MetricParams) =>
    fetchJson<CostMetricsResponse>(
      `/metrics/cost${createQuery({ propertyId: params.propertyId, window: params.window })}`,
      costMetricsSchema
    ),
  reviews: (propertyId?: string) =>
    fetchJson<LatestReviewsResponse>(
      `/reviews/latest${createQuery({ propertyId })}`,
      latestReviewsSchema
    ),
  alerts: (propertyId?: string) =>
    fetchJson<AlertsResponse>(`/alerts${createQuery({ propertyId })}`, alertsResponseSchema),
  properties: () => fetchJson<PropertiesResponse>("/properties", propertiesResponseSchema),
  report: () => fetchJson<WeeklyReportResponse>("/reports/weekly", weeklyReportSchema)
};
