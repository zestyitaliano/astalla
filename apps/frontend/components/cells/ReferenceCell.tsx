"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import type { SchemaColumn } from "@shared/api";

import { ReferenceChip } from "@/components/references";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiBaseUrl, cn } from "@/lib/utils";

interface ReferenceCellProps {
  value: string | string[] | null;
  column: SchemaColumn & {
    referenceConfig?: {
      targetTableId?: string;
      displayColumnId?: string | null;
      cardinality?: "single" | "multi";
    } | null;
  } & {
    config?: {
      tableId?: string;
      labelColumnId?: string | null;
      cardinality?: "single" | "multi";
    } | null;
  };
  onChange: (value: string | string[] | null) => void;
}

interface RowLookupItem {
  id: string;
  preview: string;
  fields?: Record<string, unknown>;
}

interface RowLookupResponse {
  items: RowLookupItem[];
}

function extractReferenceConfig(column: ReferenceCellProps["column"]) {
  const reference = column.referenceConfig ?? (column as any)?.referenceConfig ?? null;
  const fromConfig = column.config && typeof column.config === "object" ? column.config : null;
  const targetTableId =
    (reference && typeof reference.targetTableId === "string" && reference.targetTableId) ||
    (fromConfig && typeof fromConfig.tableId === "string" && fromConfig.tableId) ||
    "";
  const displayColumnId =
    (reference && typeof reference.displayColumnId === "string"
      ? reference.displayColumnId
      : reference && reference.displayColumnId === null
        ? null
        : undefined) ??
    (fromConfig && typeof fromConfig.labelColumnId === "string"
      ? fromConfig.labelColumnId
      : null);
  const cardinality =
    (reference && (reference.cardinality === "multi" ? "multi" : "single")) ||
    (fromConfig && fromConfig.cardinality === "multi" ? "multi" : "single");

  return { targetTableId, displayColumnId, cardinality } as const;
}

async function fetchReferenceRows(
  tableId: string,
  query: string,
  signal?: AbortSignal
): Promise<RowLookupResponse> {
  const params = new URLSearchParams({ tableId });
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const response = await fetch(`${apiBaseUrl}/api/rows?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load reference rows");
  }

  return (await response.json()) as RowLookupResponse;
}

function resolveRowLabel(item: RowLookupItem, displayColumnId: string | null): string {
  if (displayColumnId && item.fields && displayColumnId in item.fields) {
    const value = item.fields[displayColumnId];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
  }

  const preview = typeof item.preview === "string" ? item.preview.trim() : "";
  if (preview) {
    return preview;
  }

  return item.id;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function ReferenceCell({ value, column, onChange }: ReferenceCellProps) {
  const { targetTableId, displayColumnId, cardinality } = useMemo(
    () => extractReferenceConfig(column),
    [column]
  );
  const isMulti = cardinality === "multi";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [pendingSelection, setPendingSelection] = useState<Set<string>>(new Set());

  const selectedIds = useMemo(() => {
    if (value === null || value === undefined) {
      return [] as string[];
    }
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).filter((item) => item.length > 0);
    }
    const trimmed = String(value).trim();
    return trimmed ? [trimmed] : [];
  }, [value]);

  useEffect(() => {
    if (!open || !isMulti) {
      return;
    }
    setPendingSelection(new Set(selectedIds));
  }, [open, isMulti, selectedIds]);

  useEffect(() => {
    setLabels((prev) => {
      if (!selectedIds.length) {
        return prev;
      }
      const next = { ...prev };
      let changed = false;
      for (const id of selectedIds) {
        if (!next[id]) {
          next[id] = id;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedIds]);

  const rowsQuery = useQuery({
    queryKey: ["reference", "rows", targetTableId, debouncedSearch],
    queryFn: ({ signal }) => {
      if (!targetTableId) {
        return Promise.resolve({ items: [] });
      }
      return fetchReferenceRows(targetTableId, debouncedSearch, signal);
    },
    enabled: open && Boolean(targetTableId),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
  const referenceItems = rowsQuery.data?.items;

  useEffect(() => {
    if (!referenceItems?.length) {
      return;
    }
    setLabels((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of referenceItems) {
        const label = resolveRowLabel(item, displayColumnId);
        if (!next[item.id] || next[item.id] === item.id) {
          next[item.id] = label;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [referenceItems, displayColumnId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const closePicker = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const applySelection = useCallback(() => {
    const next = Array.from(pendingSelection);
    onChange(next);
    closePicker();
  }, [pendingSelection, onChange, closePicker]);

  const handleOptionSelect = useCallback(
    (item: RowLookupItem) => {
      const label = resolveRowLabel(item, displayColumnId);
      setLabels((prev) => ({ ...prev, [item.id]: label }));
      if (isMulti) {
        setPendingSelection((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) {
            next.delete(item.id);
          } else {
            next.add(item.id);
          }
          return next;
        });
      } else {
        onChange(item.id);
        closePicker();
      }
    },
    [displayColumnId, isMulti, onChange, closePicker]
  );

  const handleRemove = useCallback(
    (id: string) => {
      if (isMulti) {
        const next = selectedIds.filter((current) => current !== id);
        onChange(next);
      } else {
        onChange(null);
      }
    },
    [isMulti, onChange, selectedIds]
  );

  const renderPicker = () => {
    if (!open) {
      return null;
    }

    const items = rowsQuery.data?.items ?? [];
    const isLoading = rowsQuery.isLoading || rowsQuery.isFetching;
    const hasResults = items.length > 0;

    return (
      <div
        role="dialog"
        aria-label="Select reference"
        className="absolute left-0 top-full z-50 mt-2 w-72 rounded-md border border-border bg-card shadow-lg"
      >
        <div className="border-b border-border/60 p-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search…"
            className="h-8"
            autoFocus
          />
        </div>
        <div className="max-h-64">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Loading…</span>
            </div>
          ) : hasResults ? (
            <ScrollArea className="max-h-64">
              <ul
                role="listbox"
                aria-multiselectable={isMulti || undefined}
                className="flex flex-col divide-y divide-border/40"
              >
                {items.map((item) => {
                  const resolvedLabel = labels[item.id] ?? resolveRowLabel(item, displayColumnId);
                  const selected = isMulti
                    ? pendingSelection.has(item.id)
                    : selectedIds.includes(item.id);

                  if (isMulti) {
                    const handleToggle = () => handleOptionSelect(item);
                    return (
                      <li key={item.id}>
                        <div
                          role="option"
                          aria-selected={selected}
                          tabIndex={0}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors",
                            selected ? "bg-accent/10 text-foreground" : "hover:bg-muted/40"
                          )}
                          onClick={handleToggle}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleToggle();
                            }
                          }}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => handleOptionSelect(item)}
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          />
                          <span className="truncate text-sm font-medium text-foreground">
                            {resolvedLabel}
                          </span>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                          selected ? "bg-accent/10 text-foreground" : "hover:bg-muted/40"
                        )}
                        onClick={() => handleOptionSelect(item)}
                      >
                        <span className="truncate text-sm font-medium text-foreground">
                          {resolvedLabel}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">No results</div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/60 p-3">
          <Button variant="ghost" size="sm" onClick={closePicker}>
            Cancel
          </Button>
          {isMulti ? (
            <Button
              size="sm"
              onClick={applySelection}
              disabled={
                pendingSelection.size === selectedIds.length &&
                selectedIds.every((id) => pendingSelection.has(id))
              }
            >
              Apply
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(null);
                closePicker();
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative inline-flex max-w-full flex-wrap items-center gap-2" ref={containerRef}>
      {isMulti ? (
        selectedIds.length ? (
          selectedIds.map((id) => (
            <ReferenceChip
              key={id}
              label={labels[id] ?? id}
              onRemove={() => handleRemove(id)}
            />
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No selections</span>
        )
      ) : selectedIds[0] ? (
        <ReferenceChip label={labels[selectedIds[0]] ?? selectedIds[0]} />
      ) : (
        <span className="text-sm text-muted-foreground">No selection</span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (!targetTableId) {
            return;
          }
          setOpen((prev) => !prev);
        }}
        disabled={!targetTableId}
      >
        {isMulti ? "Add" : selectedIds.length ? "Change" : "Select"}
      </Button>
      {renderPicker()}
    </div>
  );
}

