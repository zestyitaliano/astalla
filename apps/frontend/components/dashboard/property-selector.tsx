"use client";

import { ChevronDown, MapPin, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, isMockMode } from "@/lib/utils";

export type PropertyOption = {
  id: string;
  name: string;
  city: string;
  state: string;
  propertyCode: string;
  region: string;
};

export type CreatePropertyPayload = {
  name: string;
  code: string;
  city?: string;
  state?: string;
};

export type CreatePropertyPayload = {
  name: string;
  code: string;
  city?: string;
  state?: string;
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
  onPropertyChange: (propertyId: string | null) => void;
  timeRange: TimeRangeValue;
  onTimeRangeChange: (range: TimeRangeValue) => void;
  disabled?: boolean;
  onCreateProperty?: (payload: CreatePropertyPayload) => Promise<PropertyOption | null> | PropertyOption | null;
}

export function PropertySelector({
  properties,
  selectedPropertyId,
  onPropertyChange,
  timeRange,
  onTimeRangeChange,
  disabled,
  onCreateProperty
}: PropertySelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestions = useMemo(() => {
    if (!isMockMode()) {
      return [] as Array<Pick<CreatePropertyPayload, "name" | "code">>;
    }
    return [
      { name: "Atrium Center", code: "ATRIUM" },
      { name: "Harbor Tower", code: "HARBOR" },
      { name: "Quartz Labs", code: "QUARTZ" }
    ];
  }, []);

  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === "__add_property") {
      setIsDialogOpen(true);
      return;
    }
    onPropertyChange(value || null);
  };

  const handleSubmit = async (payload: CreatePropertyPayload) => {
    if (!onCreateProperty) {
      setIsDialogOpen(false);
      return;
    }
    try {
      setIsSubmitting(true);
      const created = await Promise.resolve(onCreateProperty(payload));
      if (created) {
        onPropertyChange(created.id);
        setIsDialogOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-border bg-panel/95 p-7 shadow-sm supports-[backdrop-filter]:backdrop-blur">
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
                "appearance-none rounded-full border border-border bg-card px-4 py-2 pr-10 text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                disabled && "cursor-not-allowed opacity-60"
              )}
              value={selectedPropertyId ?? ""}
              onChange={handleSelectChange}
              disabled={disabled}
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} · {property.city}, {property.state}
                </option>
              ))}
              <option value="__add_property">+ Add property</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Time range</span>
        <div className="flex rounded-full border border-border bg-card p-1 shadow-sm">
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
      {properties.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border/80 bg-card/40 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No properties yet. Add one to get started.</p>
          <Button type="button" size="sm" className="w-fit gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add property
          </Button>
        </div>
      ) : null}
      <AddPropertyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        suggestions={suggestions}
      />
    </div>
  );
}

export type { TimeRangeValue };

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSubmit: (payload: CreatePropertyPayload) => void | Promise<void>;
  isSubmitting: boolean;
  suggestions: Array<Pick<CreatePropertyPayload, "name" | "code">>;
}

function AddPropertyDialog({ open, onOpenChange, onSubmit, isSubmitting, suggestions }: AddPropertyDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setName("");
      setCode("");
      setCity("");
      setState("");
    }
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !code.trim()) {
      return;
    }
    await onSubmit({
      name: name.trim(),
      code: code.trim(),
      city: city.trim() || undefined,
      state: state.trim() || undefined
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Add a property</h3>
          <p className="text-sm text-muted-foreground">
            Name your property and give it a short code so you can identify it later.
          </p>
        </div>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="property-name">
              Property name
            </label>
            <Input
              id="property-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Atrium Center"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="property-code">
              Property code
            </label>
            <Input
              id="property-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ATRIUM"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="property-city">
                City
              </label>
              <Input
                id="property-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Austin"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="property-state">
                State
              </label>
              <Input
                id="property-state"
                value={state}
                onChange={(event) => setState(event.target.value.toUpperCase())}
                placeholder="TX"
              />
            </div>
          </div>
          {suggestions.length ? (
            <div className="space-y-2 rounded-2xl border border-dashed border-border/70 bg-card/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Try a mock property</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.code}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setName(suggestion.name);
                      setCode(suggestion.code);
                    }}
                  >
                    {suggestion.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !code.trim()} className="gap-2">
              {isSubmitting ? <span className="animate-pulse">Saving…</span> : <Plus className="h-4 w-4" />} Create
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
