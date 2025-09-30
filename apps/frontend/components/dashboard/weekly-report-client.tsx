'use client';

import { useRouter } from 'next/navigation';
import { PropertySummary, ReportSnapshot } from '@shared/api';
import { AppShell } from '../layout/app-shell';
import { ReactNode } from 'react';

interface WeeklyReportClientProps {
  properties: PropertySummary[];
  activePropertyId: string;
  snapshot: ReportSnapshot;
  children?: ReactNode;
}

export function WeeklyReportClient({ properties, activePropertyId, snapshot, children }: WeeklyReportClientProps) {
  const router = useRouter();

  const handlePropertyChange = (propertyId: string) => {
    router.push(`/reports/weekly?propertyId=${propertyId}`);
  };

  return (
    <AppShell properties={properties} activePropertyId={activePropertyId} onPropertyChange={handlePropertyChange}>
      {children ?? (
        <div className="space-y-6 print:bg-white print:text-slate-900">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400">Weekly report</p>
              <h1 className="text-2xl font-semibold text-slate-50">{properties.find((p) => p.id === activePropertyId)?.name}</h1>
            </div>
            <div className="text-right text-sm text-slate-300">
              <p>{new Date(snapshot.weekStart).toLocaleDateString()}</p>
              <p>{(snapshot.occupancy * 100).toFixed(1)}% occupancy</p>
            </div>
          </header>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Cost efficiency</h2>
              <p className="mt-2 text-3xl font-semibold text-slate-50">${snapshot.cpl.toFixed(2)} CPL</p>
              <p className="text-xs text-slate-400">${snapshot.cpls.toFixed(2)} cost per lease signed</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Status</h2>
              <p className="mt-2 text-3xl font-semibold text-slate-50">{snapshot.red ? 'Red' : snapshot.watch ? 'Watch' : 'Healthy'}</p>
              <p className="text-xs text-slate-400">Use print to export PDF for leadership.</p>
            </div>
          </section>
          <section className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-200">
            <pre className="whitespace-pre-wrap">{JSON.stringify(snapshot.json, null, 2)}</pre>
          </section>
        </div>
      )}
    </AppShell>
  );
}
