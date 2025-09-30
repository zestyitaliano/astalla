import { MetricTile, OrgSelector, Review, WeeklyReport, Property } from '@astalla/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getOrgScope: () => fetchJSON<OrgSelector[]>(`${API_BASE}/orgs`),
  getTiles: (propertyId: string) => fetchJSON<MetricTile[]>(`${API_BASE}/metrics/tiles?propertyId=${propertyId}`),
  getWeeklyReport: (propertyId: string) => fetchJSON<WeeklyReport>(`${API_BASE}/reports/weekly?propertyId=${propertyId}`),
  getReviews: (propertyId: string) => fetchJSON<Review[]>(`${API_BASE}/reviews/latest?propertyId=${propertyId}`),
  getProperty: (propertyId: string) => fetchJSON<Property & { occupancy: Record<string, number>; recentEvents: { type: string; at: string; description: string }[]; reviews: Review[] }>(`${API_BASE}/properties/${propertyId}`)
};
