import { CostResponse, OccupancyResponse, PipelineResponse, PropertySummary, ReportSnapshot, ReviewsResponse } from '@shared/api';

export const mockProperties: PropertySummary[] = [
  { id: 'prop_0', propertyCode: 'AST-NORTH', name: 'Astalla North', region: 'North', unitCount: 120 },
  { id: 'prop_1', propertyCode: 'AST-CENTRAL', name: 'Astalla Central', region: 'Central', unitCount: 95 },
  { id: 'prop_2', propertyCode: 'AST-SOUTH', name: 'Astalla South', region: 'South', unitCount: 140 },
];

export const mockOccupancy: OccupancyResponse = {
  current: 0.93,
  anticipated: 0.96,
  occupiedUnits: 112,
  totalUnits: 120,
};

export const mockPipeline: PipelineResponse = {
  leads: 48,
  tours: 22,
  applications: 18,
  approvals: 12,
};

export const mockCost: CostResponse = {
  totalSpend: 7400,
  totalConversions: 62,
  costPerLead: 119.35,
};

export const mockReviews: ReviewsResponse = {
  averageRating: 4.3,
  reviewCount: 122,
  positiveShare: 0.78,
  reviews: Array.from({ length: 5 }).map((_, idx) => ({
    id: `review-${idx}`,
    propertyId: 'prop_0',
    provider: 'GBP',
    rating: 4 - (idx % 3),
    text: `Resident feedback ${idx + 1}`,
    at: new Date(Date.now() - idx * 86400000).toISOString(),
  })),
};

export const mockReport: ReportSnapshot = {
  id: 'snapshot',
  propertyId: 'prop_0',
  weekStart: new Date().toISOString(),
  occupancy: 0.93,
  cpl: 118.4,
  cpls: 322.1,
  red: false,
  watch: true,
  json: {
    summary: 'Occupancy healthy, watch follow-ups on 4 leads.',
  },
};
