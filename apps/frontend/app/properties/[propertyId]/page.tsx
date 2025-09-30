import { redirect } from 'next/navigation';
import { auth } from '../../../lib/auth';
import { apiFetch } from '../../../lib/api-client';
import { PropertySummary } from '@shared/api';
import { PropertyDetail } from '../../../components/dashboard/property-detail';
import { PropertyPageClient } from '../../../components/dashboard/property-page-client';
import { mockProperties } from '../../../lib/mock-data';

const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export default async function PropertyPage({ params }: { params: { propertyId: string } }) {
  const session = await auth();
  if (!session) redirect('/login');

  const orgFilter = session.user?.orgId ? `?orgId=${session.user.orgId}` : '';
  const properties: PropertySummary[] = mockMode
    ? mockProperties
    : await apiFetch<PropertySummary[]>(`/properties${orgFilter}`);

  const propertyList = properties.length ? properties : mockProperties;
  const property = propertyList.find((item) => item.id === params.propertyId) ?? propertyList[0];
  if (!property) {
    redirect('/dashboard');
  }

  return (
    <PropertyPageClient properties={propertyList} activePropertyId={property.id}>
      <PropertyDetail property={property} />
    </PropertyPageClient>
  );
}
