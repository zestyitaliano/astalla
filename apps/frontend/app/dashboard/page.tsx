import { redirect } from 'next/navigation';
import { auth } from '../../lib/auth';
import { apiFetch } from '../../lib/api-client';
import { DashboardClient } from '../../components/dashboard/dashboard-client';
import { PropertySummary } from '@shared/api';
import { mockProperties } from '../../lib/mock-data';

const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const orgFilter = session.user?.orgId ? `?orgId=${session.user.orgId}` : '';
  const properties: PropertySummary[] = mockMode
    ? mockProperties
    : await apiFetch<PropertySummary[]>(`/properties${orgFilter}`);

  const initialPropertyId = properties[0]?.id ?? mockProperties[0].id;

  return <DashboardClient properties={properties} initialPropertyId={initialPropertyId} />;
}
