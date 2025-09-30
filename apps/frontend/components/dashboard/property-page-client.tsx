'use client';

import { useRouter } from 'next/navigation';
import { PropertySummary } from '@shared/api';
import { AppShell } from '../layout/app-shell';
import { ReactNode } from 'react';

interface PropertyPageClientProps {
  properties: PropertySummary[];
  activePropertyId: string;
  children: ReactNode;
}

export function PropertyPageClient({ properties, activePropertyId, children }: PropertyPageClientProps) {
  const router = useRouter();
  return (
    <AppShell
      properties={properties}
      activePropertyId={activePropertyId}
      onPropertyChange={(id) => router.push(`/properties/${id}`)}
    >
      {children}
    </AppShell>
  );
}
