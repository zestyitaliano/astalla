"use client";

import { Fragment, type ReactNode } from "react";

import type { ReferenceDiagnostic } from "@/lib/references/diagnostics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DiagnosticsInlineProps {
  value: string;
  diagnostics: ReferenceDiagnostic[];
  onChange?: (nextValue: string) => void;
  className?: string;
}

export function DiagnosticsInline({ value, diagnostics, onChange, className }: DiagnosticsInlineProps) {
  if (diagnostics.length === 0) {
    return (
      <pre className={cn("whitespace-pre-wrap break-words font-mono text-sm text-left", className)}>
        {value}
      </pre>
    );
  }

  const sorted = [...diagnostics].sort((a, b) => {
    if (a.range.start === b.range.start) {
      return a.range.end - b.range.end;
    }
    return a.range.start - b.range.start;
  });

  const segments: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((diagnostic, index) => {
    const range = clampRange(diagnostic.range, value.length);
    const start = Math.max(cursor, range.start);
    const end = Math.max(start, range.end);

    if (start > cursor) {
      segments.push(
        <Fragment key={`plain-${index}`}>{value.slice(cursor, start)}</Fragment>,
      );
    }

    const snippet = value.slice(start, end);
    const highlightKey = `diag-${index}`;

    segments.push(
      <span key={highlightKey} className="group relative inline">
        <span
          tabIndex={0}
          className={cn(
            "relative inline-flex cursor-help underline decoration-danger decoration-2 decoration-dotted underline-offset-2",
            "focus:outline-none focus:ring-2 focus:ring-danger/40 focus:ring-offset-2 focus:ring-offset-bg",
          )}
        >
          {snippet || "\u200b"}
          <div className="pointer-events-none absolute left-0 top-full z-50 hidden w-72 translate-y-1 rounded-md border border-danger/30 bg-card p-3 text-xs text-left shadow-lg group-hover:flex group-focus-within:flex">
            <div className="pointer-events-auto flex flex-col gap-2">
              <p className="font-medium text-danger">{diagnostic.message}</p>
              {diagnostic.fix?.label ? (
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{diagnostic.fix.label}</p>
              ) : null}
              {diagnostic.fix && onChange ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const next = diagnostic.fix!.apply(value);
                    onChange(next);
                  }}
                >
                  Apply Fix
                </Button>
              ) : null}
            </div>
          </div>
        </span>
      </span>,
    );

    cursor = end;
  });

  if (cursor < value.length) {
    segments.push(<Fragment key="tail">{value.slice(cursor)}</Fragment>);
  }

  return (
    <pre className={cn("whitespace-pre-wrap break-words font-mono text-sm text-left", className)}>{segments}</pre>
  );
}

function clampRange(range: { start: number; end: number }, length: number): { start: number; end: number } {
  const start = Math.max(0, Math.min(range.start, length));
  const end = Math.max(0, Math.min(range.end, length));
  return { start, end };
}
