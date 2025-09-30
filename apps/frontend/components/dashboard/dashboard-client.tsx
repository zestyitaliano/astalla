'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AppShell } from '../layout/app-shell';
import { PropertySummary, CostResponse, OccupancyResponse, PipelineResponse, ReviewsResponse, ReportSnapshot } from '@shared/api';
import { clientApi } from '../../lib/client-api';
import { mockCost, mockOccupancy, mockPipeline, mockProperties, mockReport, mockReviews } from '../../lib/mock-data';
import { MetricsGrid } from './metrics-grid';
import { ReviewsPanel } from './reviews-panel';
import { ReportPreview } from './report-preview';

const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

interface DashboardClientProps {
  initialPropertyId: string;
  properties: PropertySummary[];
}

export function DashboardClient({ initialPropertyId, properties }: DashboardClientProps) {
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const availableProperties = properties.length ? properties : mockProperties;
  const activeProperty = availableProperties.find((property) => property.id === propertyId) ?? availableProperties[0];

  const occupancyQuery = useQuery<OccupancyResponse>({
    queryKey: ['occupancy', propertyId],
    queryFn: () => (mockMode ? Promise.resolve(mockOccupancy) : clientApi.occupancy(propertyId)),
  });
  const pipelineQuery = useQuery<PipelineResponse>({
    queryKey: ['pipeline', propertyId],
    queryFn: () => (mockMode ? Promise.resolve(mockPipeline) : clientApi.pipeline(propertyId)),
  });
  const costQuery = useQuery<CostResponse>({
    queryKey: ['cost', propertyId],
    queryFn: () => (mockMode ? Promise.resolve(mockCost) : clientApi.cost(propertyId)),
  });
  const reviewsQuery = useQuery<ReviewsResponse>({
    queryKey: ['reviews', propertyId],
    queryFn: () => (mockMode ? Promise.resolve(mockReviews) : clientApi.reviews(propertyId)),
  });
  const reportQuery = useQuery<ReportSnapshot>({
    queryKey: ['report', propertyId],
    queryFn: () => (mockMode ? Promise.resolve(mockReport) : clientApi.report(propertyId)),
  });

  return (
    <AppShell
      properties={availableProperties}
      activePropertyId={activeProperty?.id}
      onPropertyChange={(id) => setPropertyId(id)}
    >
      <MetricsGrid
        property={activeProperty}
        occupancy={occupancyQuery.data}
        pipeline={pipelineQuery.data}
        cost={costQuery.data}
        isLoading={occupancyQuery.isLoading || pipelineQuery.isLoading || costQuery.isLoading}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ReviewsPanel reviews={reviewsQuery.data} isLoading={reviewsQuery.isLoading} />
        <ReportPreview snapshot={reportQuery.data} isLoading={reportQuery.isLoading} />
      </div>
    </AppShell>
  );
}
