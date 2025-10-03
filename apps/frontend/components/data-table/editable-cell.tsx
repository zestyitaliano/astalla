"use client";

import { useCallback, useMemo, useState } from "react";
import type { CellContext } from "@tanstack/react-table";

import { cn } from "@/lib/utils";

export type EditableCellMeta<TData> = {
  editable?: boolean;
  inputType?: string;
  placeholder?: string;
  formatValue?: (value: unknown, row: TData) => string;
  parseValue?: (value: string, row: TData) => unknown;
  validate?: (value: string, row: TData) => string | null;
  headerClassName?: string;
  cellClassName?: string;
  disableDrag?: boolean;
};

export function EditableCell<TData>({
  getValue,
  row,
  column,
  table
}: CellContext<TData, unknown>) {
  const meta = (column.columnDef.meta ?? {}) as EditableCellMeta<TData>;
  const isEditable = Boolean(meta.editable);
  const formatValue = useMemo<NonNullable<EditableCellMeta<TData>["formatValue"]>>(() => {
    return (
      meta.formatValue ?? ((value: unknown) => (value ?? "") as string)
    ) as NonNullable<EditableCellMeta<TData>["formatValue"]>;
  }, [meta.formatValue]);
  const parseValue = useMemo<NonNullable<EditableCellMeta<TData>["parseValue"]>>(() => {
    return (
      meta.parseValue ?? ((value: string) => value)
    ) as NonNullable<EditableCellMeta<TData>["parseValue"]>;
  }, [meta.parseValue]);
  const validate = meta.validate;
  const accessibleLabel =
    (typeof column.columnDef.header === "string" && column.columnDef.header) ||
    (typeof column.id === "string" ? column.id : undefined);

  const initialValue = useMemo(() => formatValue(getValue(), row.original), [formatValue, getValue, row.original]);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsEditing(false);
    setDraft(initialValue);
    setError(null);
  }, [initialValue]);

  const commit = useCallback(() => {
    const nextError = validate ? validate(draft, row.original) : null;
    if (nextError) {
      setError(nextError);
      return false;
    }

    table.options.meta?.onUpdate?.(row.id, column.id, parseValue(draft, row.original));
    setError(null);
    setIsEditing(false);
    return true;
  }, [column.id, draft, parseValue, row.id, row.original, table.options.meta, validate]);

  if (!isEditable) {
    return (
      <span className="whitespace-nowrap text-sm text-foreground" role="textbox" aria-readonly>
        {formatValue(getValue(), row.original) || "—"}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex min-h-[2.25rem] cursor-text items-center rounded-xl border border-transparent px-2 py-1 text-sm transition",
        isEditing ? "border-border bg-card-contrast/60" : "hover:border-border/80 hover:bg-card-contrast/40"
      )}
      tabIndex={0}
      role="textbox"
      aria-readonly={!isEditing}
      aria-label={accessibleLabel}
      aria-invalid={Boolean(error) || undefined}
      onDoubleClick={() => {
        setIsEditing(true);
        setDraft(initialValue);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          if (isEditing) {
            const saved = commit();
            if (!saved) {
              event.preventDefault();
            }
          } else {
            setIsEditing(true);
            setDraft(initialValue);
          }
        }
        if (event.key === "Escape") {
          if (isEditing) {
            reset();
            event.stopPropagation();
            event.preventDefault();
          }
        }
      }}
    >
      {isEditing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (!commit()) {
              setTimeout(() => setIsEditing(true), 0);
            }
          }}
          type={meta.inputType ?? "text"}
          placeholder={meta.placeholder}
          className={cn(
            "w-full rounded-lg border border-border bg-card px-2 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            error ? "border-destructive focus-visible:ring-destructive" : null
          )}
          aria-label={accessibleLabel}
        />
      ) : (
        <span className="line-clamp-1 w-full text-sm text-foreground/90">{initialValue || "—"}</span>
      )}
      {error ? (
        <span className="absolute -bottom-6 left-2 rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
