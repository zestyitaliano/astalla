'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardDescription, CardTitle } from '../ui/card';
import { Table, TBody, TD, TH, THead, TR } from '../ui/table';
import { Badge } from '../ui/badge';

export function PropertyDetail({ propertyId }: { propertyId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => api.getProperty(propertyId)
  });

  if (isLoading || !data) {
    return <p className="text-sm text-slate-500">Loading property data…</p>;
  }

  const occupancyEntries = Object.entries(data.occupancy);

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>{data.name}</CardTitle>
        <CardDescription>
          Property code {data.propertyCode} • {data.region ?? 'Region TBD'} • {data.unitCount} units
        </CardDescription>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {occupancyEntries.map(([window, value]) => (
            <div key={window} className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">{window}</p>
              <p className="text-2xl font-semibold text-slate-900">{value}%</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Pipeline Events</CardTitle>
        <CardDescription>Recent lead, application, and lease milestones.</CardDescription>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Type</TH>
                <TH>Description</TH>
              </TR>
            </THead>
            <TBody>
              {data.recentEvents.map((event) => (
                <TR key={`${event.type}-${event.at}`}>
                  <TD>{new Date(event.at).toLocaleString()}</TD>
                  <TD>
                    <Badge>{event.type}</Badge>
                  </TD>
                  <TD>{event.description}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Card>

      <Card>
        <CardTitle>Reviews</CardTitle>
        <CardDescription>Granular feed for on-site follow-up.</CardDescription>
        <div className="mt-4 space-y-3">
          {data.reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{review.rating} ★</p>
                <Badge variant={review.sentiment === 'NEGATIVE' ? 'danger' : review.sentiment === 'NEUTRAL' ? 'warning' : 'success'}>
                  {review.sentiment.toLowerCase()}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-700">{review.text}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(review.at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
