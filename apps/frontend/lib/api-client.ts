import { isMockMode, apiBaseUrl } from "@/lib/utils";
import {
  costMetricsSchema,
  latestReviewsSchema,
  meResponseSchema,
  occupancyMetricsSchema,
  pipelineMetricsSchema,
  weeklyReportSchema
} from "@shared/api";
import type {
  CostMetricsResponse,
  LatestReviewsResponse,
  MeResponse,
  OccupancyMetricsResponse,
  PipelineMetricsResponse,
  WeeklyReportResponse
} from "@shared/api";

async function fetchJson<T>(path: string, schema: { parse: (data: unknown) => T }): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "x-mock-mode": isMockMode() ? "true" : "false"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`);
  }

  const json = await response.json();
  return schema.parse(json);
}

export const api = {
  me: () => fetchJson<MeResponse>("/auth/me", meResponseSchema),
  occupancy: () => fetchJson<OccupancyMetricsResponse>("/metrics/occupancy", occupancyMetricsSchema),
  pipeline: () => fetchJson<PipelineMetricsResponse>("/metrics/pipeline", pipelineMetricsSchema),
  cost: () => fetchJson<CostMetricsResponse>("/metrics/cost", costMetricsSchema),
  reviews: () => fetchJson<LatestReviewsResponse>("/reviews/latest", latestReviewsSchema),
  report: () => fetchJson<WeeklyReportResponse>("/reports/weekly", weeklyReportSchema)
};
