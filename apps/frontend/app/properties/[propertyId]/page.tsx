import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions, isMockMode } from '../../../lib/auth';
import { PropertyDetail } from '../../../components/properties/property-detail';

interface Params {
  params: { propertyId: string };
}

export default async function PropertyPage({ params }: Params) {
  if (!isMockMode) {
    const session = await getServerSession(authOptions);
    if (!session) {
      redirect('/');
    }
  }

  return <PropertyDetail propertyId={params.propertyId} />;
}
