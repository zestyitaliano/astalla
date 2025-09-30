import { ReportSnapshot } from '@shared/api';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface ReportPreviewProps {
  snapshot?: ReportSnapshot;
  isLoading: boolean;
}

export function ReportPreview({ snapshot, isLoading }: ReportPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Weekly snapshot</CardTitle>
          <CardDescription>
            {isLoading ? '—' : new Date(snapshot?.weekStart ?? Date.now()).toLocaleDateString()}
          </CardDescription>
        </div>
      </CardHeader>
      {isLoading ? (
        <p className="text-sm text-slate-300">Loading…</p>
      ) : snapshot ? (
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            Occupancy: <span className="font-semibold text-slate-50">{(snapshot.occupancy * 100).toFixed(1)}%</span>
          </p>
          <p>
            Cost per lead: <span className="font-semibold text-slate-50">${snapshot.cpl.toFixed(2)}</span>
          </p>
          <p>
            Cost per lease: <span className="font-semibold text-slate-50">${snapshot.cpls.toFixed(2)}</span>
          </p>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Status: {snapshot.red ? 'Red' : snapshot.watch ? 'Watch' : 'Healthy'}
          </p>
          <pre className="overflow-x-auto rounded bg-slate-950/60 p-3 text-xs text-slate-300">
            {JSON.stringify(snapshot.json, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-slate-300">No snapshot yet.</p>
      )}
    </Card>
  );
}
