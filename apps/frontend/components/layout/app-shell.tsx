'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { PropertySummary } from '@shared/api';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { signOut } from 'next-auth/react';

interface AppShellProps {
  properties: PropertySummary[];
  onPropertyChange?: (propertyId: string) => void;
  activePropertyId?: string;
  children: ReactNode;
}

export function AppShell({ properties, onPropertyChange, activePropertyId, children }: AppShellProps) {
  const { data } = useSession();
  const selectedId = activePropertyId ?? properties[0]?.id ?? '';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div>
            <p className="text-xs uppercase text-slate-400">Astalla Control</p>
            <h1 className="text-xl font-semibold text-slate-50">Marketing Ops Command</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link className="text-sm text-slate-300 hover:text-sky-300" href="/dashboard">
              Dashboard
            </Link>
            <Link className="text-sm text-slate-300 hover:text-sky-300" href="/reports/weekly">
              Weekly Report
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <div className="text-right text-xs text-slate-400">
              <div className="text-slate-100">{data?.user?.name ?? 'Guest'}</div>
              <div>{data?.user?.email}</div>
            </div>
            <Button variant="ghost" onClick={() => signOut({ callbackUrl: '/login' })}>
              Sign out
            </Button>
          </div>
        </div>
        <div className="border-t border-slate-800 bg-slate-900/60">
          <div className="mx-auto flex w-full max-w-6xl gap-4 px-6 py-3">
            <div className="w-64">
              <label className="mb-1 block text-xs uppercase text-slate-400">Property</label>
              <Select
                value={selectedId}
                onChange={(event) => onPropertyChange?.(event.target.value)}
                disabled={!properties.length}
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">{children}</main>
    </div>
  );
}
