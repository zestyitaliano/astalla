"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReferenceSuggestionItem {
  id: string;
  label: string;
  description?: string;
  breadcrumb?: string[];
  preview?: string;
  scoreBreakdown?: {
    schema: number;
    context: number;
    semantic: number;
    data: number;
  };
}

interface ReferencePopoverProps {
  suggestions: ReferenceSuggestionItem[];
  onSelect?: (suggestion: ReferenceSuggestionItem) => void;
  triggerLabel?: string;
  emptyMessage?: string;
  loading?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const formatScore = (value: number): string => value.toFixed(2);

export function ReferencePopover({
  suggestions,
  onSelect,
  triggerLabel = "Suggestions",
  emptyMessage = "No matches yet.",
  loading = false,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
}: ReferencePopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [handleOpenChange, isOpen]);

  const hasSuggestions = suggestions.length > 0;
  const totalScoreLabel = useMemo(() => {
    if (!hasSuggestions) return undefined;
    const top = suggestions[0]?.scoreBreakdown;
    if (!top) return undefined;
    const total = top.schema + top.context + top.semantic + top.data;
    return `Top score ${formatScore(total)}`;
  }, [hasSuggestions, suggestions]);

  return (
    <div className={cn("relative inline-flex", className)} ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        className="min-w-[10rem] justify-between"
        onClick={() => handleOpenChange(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{triggerLabel}</span>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <span className="text-xs text-muted-foreground">
            {hasSuggestions ? `${suggestions.length} results` : "--"}
          </span>
        )}
      </Button>
      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-md border border-border bg-card text-foreground shadow-lg">
          <div className="flex flex-col">
            {totalScoreLabel ? (
              <div className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
                {totalScoreLabel}
            </div>
          ) : null}
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Loading suggestions…</span>
            </div>
          ) : hasSuggestions ? (
            <ul className="max-h-64 divide-y divide-border overflow-y-auto">
              {suggestions.map((suggestion) => {
                const total = suggestion.scoreBreakdown
                  ? suggestion.scoreBreakdown.schema +
                    suggestion.scoreBreakdown.context +
                    suggestion.scoreBreakdown.semantic +
                    suggestion.scoreBreakdown.data
                  : null;
                return (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted"
                      onClick={() => {
                        onSelect?.(suggestion);
                        handleOpenChange(false);
                      }}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-sm font-medium text-foreground">{suggestion.label}</span>
                        {suggestion.breadcrumb?.length ? (
                          <span className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                            {suggestion.breadcrumb.join(" • ")}
                          </span>
                        ) : null}
                        {suggestion.description ? (
                          <span className="truncate text-xs text-muted-foreground">{suggestion.description}</span>
                        ) : null}
                      </div>
                      {total !== null ? (
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-right text-[11px] text-muted-foreground">
                          <div>
                            <dt>Schema</dt>
                            <dd>{formatScore(suggestion.scoreBreakdown!.schema)}</dd>
                          </div>
                          <div>
                            <dt>Context</dt>
                            <dd>{formatScore(suggestion.scoreBreakdown!.context)}</dd>
                          </div>
                          <div>
                            <dt>Semantic</dt>
                            <dd>{formatScore(suggestion.scoreBreakdown!.semantic)}</dd>
                          </div>
                          <div>
                            <dt>Data</dt>
                            <dd>{formatScore(suggestion.scoreBreakdown!.data)}</dd>
                          </div>
                          <div className="col-span-2 pt-1 text-xs font-medium text-foreground">
                            Total {formatScore(total)}
                          </div>
                        </dl>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-6 text-sm text-muted-foreground">{emptyMessage}</div>
          )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
