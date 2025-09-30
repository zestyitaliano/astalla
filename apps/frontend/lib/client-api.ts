import { CostResponse, OccupancyResponse, PipelineResponse, ReviewsResponse, ReportSnapshot } from '@shared/api';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

async function clientFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed request ${res.status}`);
  }
  return res.json();
}

export const clientApi = {
  occupancy: (propertyId: string) => clientFetch<OccupancyResponse>(`/metrics/occupancy?propertyId=${propertyId}`),
  pipeline: (propertyId: string) => clientFetch<PipelineResponse>(`/metrics/pipeline?propertyId=${propertyId}`),
  cost: (propertyId: string) => clientFetch<CostResponse>(`/metrics/cost?propertyId=${propertyId}`),
  reviews: (propertyId: string) => clientFetch<ReviewsResponse>(`/reviews/latest?propertyId=${propertyId}`),
  report: (propertyId: string) => clientFetch<ReportSnapshot>(`/reports/weekly?propertyId=${propertyId}`),
};
