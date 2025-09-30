'use client';

import { useMemo } from 'react';
import { OrgSelector } from '@astalla/shared';
import { ChevronDownIcon } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from './ui/button';

type Props = {
  scope: OrgSelector[] | undefined;
  selectedPropertyId: string | null;
  onSelect: (propertyId: string) => void;
};

export function OrgPropertySelector({ scope, selectedPropertyId, onSelect }: Props) {
  const selected = useMemo(() => {
    if (!scope || !selectedPropertyId) return null;
    for (const org of scope) {
      for (const region of org.regions) {
        const property = region.properties.find((p) => p.id === selectedPropertyId);
        if (property) {
          return { org, region, property };
        }
      }
    }
    return null;
  }, [scope, selectedPropertyId]);

  const label = selected ? `${selected.property.name} • ${selected.region.region}` : 'Select property';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" className="inline-flex items-center gap-2">
          {label}
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
        {scope?.map((org) => (
          <div key={org.orgId} className="mb-2">
            <p className="px-2 text-xs font-semibold uppercase text-slate-500">{org.orgName}</p>
            {org.regions.map((region) => (
              <div key={region.region} className="mt-1">
                <p className="px-2 text-xs text-slate-400">{region.region}</p>
                {region.properties.map((property) => (
                  <DropdownMenu.Item
                    key={property.id}
                    className="cursor-pointer rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
                    onSelect={() => onSelect(property.id)}
                  >
                    {property.name}
                  </DropdownMenu.Item>
                ))}
              </div>
            ))}
          </div>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
