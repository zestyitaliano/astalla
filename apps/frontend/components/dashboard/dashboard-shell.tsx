'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MetricTile, Review, WeeklyReport } from '@astalla/shared';
import { api } from '../../lib/api';
import { OrgPropertySelector } from '../org-selector';
import { Card, CardDescription, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import Link from 'next/link';

function TileCard({ tile }: { tile: MetricTile }) {
  const statusMap = {
    OK: 'success',
    WATCH: 'warning',
    RED: 'danger'
  } as const;
  const variant = tile.status ? statusMap[tile.status] : 'default';

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {tile.value}
            {tile.unit ? <span className="ml-1 text-base text-slate-500">{tile.unit}</span> : null}
          </p>
        </div>
        {tile.status ? <Badge variant={variant}>{tile.status}</Badge> : null}
      </div>
      {tile.comparison != null ? (
        <p className="mt-4 text-xs text-slate-500">Prev: {tile.comparison}</p>
      ) : null}
    </Card>
  );
}

function ReviewsList({ reviews }: { reviews: Review[] | undefined }) {
  if (!reviews?.length) {
    return <p className="text-sm text-slate-500">No reviews available.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">{review.rating.toFixed(1)} ★</p>
            <Badge variant={review.sentiment === 'NEGATIVE' ? 'danger' : review.sentiment === 'NEUTRAL' ? 'warning' : 'success'}>
              {review.sentiment.toLowerCase()}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate-700">{review.text}</p>
          <p className="mt-2 text-xs text-slate-400">{new Date(review.at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}

function WeeklySummary({ report }: { report: WeeklyReport | undefined }) {
  if (!report) {
    return <p className="text-sm text-slate-500">No report generated.</p>;
  }

  return (
    <div className="space-y-2 text-sm text-slate-600">
      <p>
        <strong>Week of:</strong> {new Date(report.weekStart).toLocaleDateString()}
      </p>
      <p>
        <strong>Occupancy:</strong> {report.occupancy}%
      </p>
      <p>
        <strong>CPL:</strong> ${report.cpl.toFixed(2)}
      </p>
      <p>
        <strong>CPLS:</strong> ${report.cpls.toFixed(2)}
      </p>
      <p>
        <strong>Status:</strong>{' '}
        {report.red ? <Badge variant="danger">Red</Badge> : report.watch ? <Badge variant="warning">Watch</Badge> : <Badge variant="success">On Track</Badge>}
      </p>
    </div>
  );
}

export function DashboardShell() {
  const { data: scope } = useQuery({ queryKey: ['org-scope'], queryFn: api.getOrgScope });
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const firstProperty = useMemo(() => {
    const org = scope?.[0];
    const region = org?.regions[0];
    return region?.properties[0]?.id ?? null;
  }, [scope]);

  useEffect(() => {
    if (!propertyId && firstProperty) {
      setPropertyId(firstProperty);
    }
  }, [propertyId, firstProperty]);

  const { data: tiles, isLoading: tilesLoading } = useQuery({
    queryKey: ['tiles', propertyId],
    queryFn: () => api.getTiles(propertyId!),
    enabled: Boolean(propertyId)
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', propertyId],
    queryFn: () => api.getReviews(propertyId!),
    enabled: Boolean(propertyId)
  });

  const { data: report } = useQuery({
    queryKey: ['weekly-report', propertyId],
    queryFn: () => api.getWeeklyReport(propertyId!),
    enabled: Boolean(propertyId)
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <OrgPropertySelector scope={scope} selectedPropertyId={propertyId} onSelect={setPropertyId} />
        {propertyId ? (
          <Button asChild>
            <Link href={`/properties/${propertyId}`}>View property detail</Link>
          </Button>
        ) : null}
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(tilesLoading ? Array.from({ length: 6 }).map((_, idx) => (
          <Card key={idx} className="animate-pulse h-32 bg-slate-100" />
        )) : tiles?.map((tile) => <TileCard tile={tile} key={tile.key} />)) ?? null}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Weekly Snapshot</CardTitle>
          <CardDescription>Key KPIs captured for the latest reporting period.</CardDescription>
          <div className="mt-4">
            <WeeklySummary report={report} />
            {propertyId ? (
              <Button asChild variant="outline" className="mt-4">
                <Link href="/reports/weekly">Open weekly report</Link>
              </Button>
            ) : null}
          </div>
        </Card>
        <Card>
          <CardTitle>Latest GBP Reviews</CardTitle>
          <CardDescription>Stay ahead of sentiment with a quick scan of the newest reviews.</CardDescription>
          <div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-2">
            <ReviewsList reviews={reviews} />
          </div>
        </Card>
      </div>
    </div>
  );
}
