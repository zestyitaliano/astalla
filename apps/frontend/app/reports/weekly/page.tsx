import { redirect } from 'next/navigation';
import { auth } from '../../../lib/auth';
import { apiFetch } from '../../../lib/api-client';
import { ReportSnapshot, PropertySummary } from '@shared/api';
import { mockReport, mockProperties } from '../../../lib/mock-data';
import { WeeklyReportClient } from '../../../components/dashboard/weekly-report-client';

const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export default async function WeeklyReportPage({ searchParams }: { searchParams: { propertyId?: string } }) {
  const session = await auth();
  if (!session) redirect('/login');

  const orgFilter = session.user?.orgId ? `?orgId=${session.user.orgId}` : '';
  const properties: PropertySummary[] = mockMode
    ? mockProperties
    : await apiFetch<PropertySummary[]>(`/properties${orgFilter}`);

  const propertyList = properties.length ? properties : mockProperties;
  const activeProperty = propertyList.find((p) => p.id === searchParams.propertyId) ?? propertyList[0];
  const snapshot: ReportSnapshot = mockMode
    ? mockReport
    : await apiFetch<ReportSnapshot>(`/reports/weekly?propertyId=${activeProperty.id}`);

  return <WeeklyReportClient properties={propertyList} activePropertyId={activeProperty.id} snapshot={snapshot} />;
}
