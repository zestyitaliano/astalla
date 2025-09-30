'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { OrgPropertySelector } from '../org-selector';
import { WeeklyReport } from '@astalla/shared';
import { Card, CardDescription, CardTitle } from '../ui/card';

export function WeeklyReportView() {
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

  const { data: report } = useQuery<WeeklyReport | undefined>({
    queryKey: ['weekly-report', propertyId],
    queryFn: () => api.getWeeklyReport(propertyId!),
    enabled: Boolean(propertyId)
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Weekly report</h1>
          <p className="text-sm text-slate-600">Snapshot ready for PDF export via your browser print dialog.</p>
        </div>
        <OrgPropertySelector scope={scope} selectedPropertyId={propertyId} onSelect={setPropertyId} />
      </div>

      <Card className="print:shadow-none">
        <CardTitle>Summary</CardTitle>
        <CardDescription>Performance indicators for the selected property.</CardDescription>
        {report ? (
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              <strong>Week starting:</strong> {new Date(report.weekStart).toLocaleDateString()}
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
              <strong>Status:</strong> {report.red ? 'Red' : report.watch ? 'Watch' : 'On track'}
            </p>
            <pre className="overflow-auto rounded bg-slate-100 p-4 text-xs">{JSON.stringify(report.json, null, 2)}</pre>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No snapshot available.</p>
        )}
      </Card>

      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          main, .print\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
