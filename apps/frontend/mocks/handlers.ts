import { http, HttpResponse } from 'msw';
import { mockCost, mockOccupancy, mockPipeline, mockReviews, mockReport, mockProperties } from '../lib/mock-data';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export const handlers = [
  http.get(`${baseUrl}/properties`, () => HttpResponse.json(mockProperties)),
  http.get(`${baseUrl}/metrics/occupancy`, () => HttpResponse.json(mockOccupancy)),
  http.get(`${baseUrl}/metrics/pipeline`, () => HttpResponse.json(mockPipeline)),
  http.get(`${baseUrl}/metrics/cost`, () => HttpResponse.json(mockCost)),
  http.get(`${baseUrl}/reviews/latest`, () => HttpResponse.json(mockReviews)),
  http.get(`${baseUrl}/reports/weekly`, () => HttpResponse.json(mockReport)),
  http.get(`${baseUrl}/auth/me`, () =>
    HttpResponse.json({
      id: 'mock-user',
      email: 'demo@astalla.com',
      name: 'Demo User',
      role: 'ORG_ADMIN',
      orgId: 'org_demo',
      propertyScopes: mockProperties.map((property) => ({ id: property.id, propertyCode: property.propertyCode })),
    }),
  ),
];
