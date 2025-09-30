'use client';

import { PropertySummary, CostResponse, OccupancyResponse, PipelineResponse, ReviewsResponse } from '@shared/api';
import { useQuery } from '@tanstack/react-query';
import { clientApi } from '../../lib/client-api';
import { mockCost, mockOccupancy, mockPipeline, mockReviews } from '../../lib/mock-data';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ReviewsPanel } from './reviews-panel';

const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

interface PropertyDetailProps {
  property: PropertySummary;
}

export function PropertyDetail({ property }: PropertyDetailProps) {
  const occupancyQuery = useQuery<OccupancyResponse>({
    queryKey: ['detail-occupancy', property.id],
    queryFn: () => (mockMode ? Promise.resolve(mockOccupancy) : clientApi.occupancy(property.id)),
  });
  const pipelineQuery = useQuery<PipelineResponse>({
    queryKey: ['detail-pipeline', property.id],
    queryFn: () => (mockMode ? Promise.resolve(mockPipeline) : clientApi.pipeline(property.id)),
  });
  const costQuery = useQuery<CostResponse>({
    queryKey: ['detail-cost', property.id],
    queryFn: () => (mockMode ? Promise.resolve(mockCost) : clientApi.cost(property.id)),
  });
  const reviewsQuery = useQuery<ReviewsResponse>({
    queryKey: ['detail-reviews', property.id],
    queryFn: () => (mockMode ? Promise.resolve(mockReviews) : clientApi.reviews(property.id)),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{property.name}</CardTitle>
            <CardDescription>{property.region} • {property.unitCount} units</CardDescription>
          </div>
        </CardHeader>
        <div className="grid gap-6 md:grid-cols-3">
          <MetricBlock title="Current occupancy" value={occupancyQuery.data?.current} suffix="%" multiplier={100} />
          <MetricBlock title="Anticipated 30d" value={occupancyQuery.data?.anticipated} suffix="%" multiplier={100} />
          <MetricBlock title="Cost / lead" value={costQuery.data?.costPerLead ?? undefined} prefix="$" decimals={2} />
          <MetricBlock title="Leads" value={pipelineQuery.data?.leads} />
          <MetricBlock title="Tours" value={pipelineQuery.data?.tours} />
          <MetricBlock title="Approvals" value={pipelineQuery.data?.approvals} />
        </div>
      </Card>
      <ReviewsPanel reviews={reviewsQuery.data} isLoading={reviewsQuery.isLoading} />
    </div>
  );
}

interface MetricBlockProps {
  title: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  multiplier?: number;
  decimals?: number;
}

function MetricBlock({ title, value, prefix, suffix, multiplier = 1, decimals = 0 }: MetricBlockProps) {
  const display = value === undefined || value === null ? '—' : `${prefix ?? ''}${(value * multiplier).toFixed(decimals)}${suffix ?? ''}`;
  return (
    <div>
      <p className="text-xs uppercase text-slate-400">{title}</p>
      <p className="text-2xl font-semibold text-slate-50">{display}</p>
    </div>
  );
}
