import { PropertySummary, CostResponse, OccupancyResponse, PipelineResponse } from '@shared/api';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface MetricsGridProps {
  property: PropertySummary;
  occupancy?: OccupancyResponse;
  pipeline?: PipelineResponse;
  cost?: CostResponse;
  isLoading: boolean;
}

export function MetricsGrid({ property, occupancy, pipeline, cost, isLoading }: MetricsGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Occupancy</CardTitle>
            <CardDescription>{property.name}</CardDescription>
          </div>
        </CardHeader>
        <MetricValue
          label="Current"
          value={occupancy?.current}
          suffix="%"
          multiplier={100}
          loading={isLoading}
        />
        <MetricValue
          label="Anticipated"
          value={occupancy?.anticipated}
          suffix="%"
          multiplier={100}
          loading={isLoading}
        />
        <p className="mt-3 text-xs text-slate-400">
          {occupancy?.occupiedUnits ?? 0}/{occupancy?.totalUnits ?? property.unitCount} units occupied
        </p>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pipeline velocity</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </div>
        </CardHeader>
        <MetricValue label="Leads" value={pipeline?.leads} loading={isLoading} />
        <MetricValue label="Tours" value={pipeline?.tours} loading={isLoading} />
        <MetricValue label="Applications" value={pipeline?.applications} loading={isLoading} />
        <MetricValue label="Approvals" value={pipeline?.approvals} loading={isLoading} />
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cost efficiency</CardTitle>
            <CardDescription>Marketing spend</CardDescription>
          </div>
        </CardHeader>
        <MetricValue label="Spend" value={cost?.totalSpend} prefix="$" loading={isLoading} />
        <MetricValue label="Conversions" value={cost?.totalConversions} loading={isLoading} />
        <MetricValue label="Cost / Lead" value={cost?.costPerLead ?? undefined} prefix="$" loading={isLoading} />
      </Card>
    </div>
  );
}

interface MetricValueProps {
  label: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  multiplier?: number;
  loading: boolean;
}

function MetricValue({ label, value, prefix, suffix, multiplier = 1, loading }: MetricValueProps) {
  const formatted = value === undefined || value === null ? '—' : `${prefix ?? ''}${(value * multiplier).toFixed(multiplier === 1 ? 0 : 1)}${suffix ?? ''}`;
  return (
    <div className="mt-2">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-slate-50">{loading ? '…' : formatted}</p>
    </div>
  );
}
