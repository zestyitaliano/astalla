"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReferenceChipKind = "table" | "column" | "function";

interface ReferenceChipProps {
  label: string;
  kind?: ReferenceChipKind;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function ReferenceChip({
  label,
  kind,
  selected = false,
  disabled = false,
  onClick,
  onRemove,
  className,
}: ReferenceChipProps) {
  const interactive = Boolean(onClick);
  const Component = interactive ? "button" : "span";

  return (
    <Component
      type={interactive ? "button" : undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors",
        selected
          ? "border-accent bg-accent/10 text-accent-foreground"
          : "border-border bg-card text-muted-foreground hover:border-accent hover:text-foreground",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      aria-pressed={interactive ? selected : undefined}
      disabled={interactive ? disabled : undefined}
    >
      {kind ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {kind}
        </span>
      ) : null}
      <span className="max-w-[10rem] truncate text-left font-medium text-foreground">{label}</span>
      {onRemove ? (
        <span
          role="button"
          tabIndex={disabled ? -1 : 0}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger focus:outline-none focus-visible:border-danger/60"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!disabled) {
              onRemove();
            }
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onRemove();
            }
          }}
          aria-label={`Remove ${label}`}
          aria-disabled={disabled || undefined}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : null}
    </Component>
  );
}
