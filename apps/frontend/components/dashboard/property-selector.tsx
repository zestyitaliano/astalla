"use client";

import { ChevronDown, MapPin } from "lucide-react";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PropertyOption = {
  id: string;
  name: string;
  city: string;
  state: string;
};

const TIME_RANGES = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 }
] as const;

type TimeRangeValue = (typeof TIME_RANGES)[number]["value"];

interface PropertySelectorProps {
  properties: PropertyOption[];
  selectedPropertyId: string | null;
  onPropertyChange: (propertyId: string) => void;
  timeRange: TimeRangeValue;
  onTimeRangeChange: (range: TimeRangeValue) => void;
  disabled?: boolean;
}

export function PropertySelector({
  properties,
  selectedPropertyId,
  onPropertyChange,
  timeRange,
  onTimeRangeChange,
  disabled
}: PropertySelectorProps) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-panel/90 p-6 shadow-sm supports-[backdrop-filter]:backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Portfolio</p>
            <h2 className="text-xl font-semibold text-foreground">Property insights</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="property-select">
            Property
          </label>
          <div className="relative">
            <select
              id="property-select"
              className={cn(
                "appearance-none rounded-full border border-border/80 bg-card px-4 py-2 pr-10 text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                disabled && "cursor-not-allowed opacity-60"
              )}
              value={selectedPropertyId ?? ""}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => onPropertyChange(event.target.value)}
              disabled={disabled || properties.length === 0}
            >
              {properties.length === 0 ? <option value="">No properties</option> : null}
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} · {property.city}, {property.state}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Time range</span>
        <div className="flex rounded-full border border-border/70 bg-card p-1 shadow-sm">
          {TIME_RANGES.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={timeRange === option.value ? "default" : "ghost"}
              className={cn(
                "h-8 rounded-full px-4 text-xs font-semibold",
                timeRange === option.value ? "shadow-sm" : "text-muted-foreground"
              )}
              onClick={() => onTimeRangeChange(option.value)}
              disabled={disabled}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export type { TimeRangeValue };
