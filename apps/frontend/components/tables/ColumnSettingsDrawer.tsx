"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Link2 } from "lucide-react";
import { ColumnTypeSchema, type TableColumnDto } from "@shared/api";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiBaseUrl, cn } from "@/lib/utils";
import {
  useReferenceColumnChoices,
  useReferenceTableChoices,
  type ReferenceColumnChoice
} from "@/lib/api/reference-settings";

interface ColumnSettingsDrawerProps {
  tableId: string;
  column: TableColumnDto | null;
  open: boolean;
  onClose: () => void;
}

type ReferenceCardinality = "single" | "multi";

interface ReferenceFormState {
  targetTableId: string;
  displayColumnId: string;
  cardinality: ReferenceCardinality;
  enforceForeignKey: boolean;
}

function extractReferenceConfig(column: TableColumnDto | null): ReferenceFormState {
  if (!column) {
    return {
      targetTableId: "",
      displayColumnId: "",
      cardinality: "single",
      enforceForeignKey: false
    };
  }

  const fromReference = (column as unknown as { referenceConfig?: any }).referenceConfig;
  if (fromReference && typeof fromReference === "object") {
    const target = typeof fromReference.targetTableId === "string" ? fromReference.targetTableId : "";
    const display = typeof fromReference.displayColumnId === "string" ? fromReference.displayColumnId : "";
    const cardinality = fromReference.cardinality === "multi" ? "multi" : "single";
    const enforce = Boolean(fromReference.enforceForeignKey);
    return {
      targetTableId: target,
      displayColumnId: display,
      cardinality,
      enforceForeignKey: enforce
    };
  }

  const config = column.config && typeof column.config === "object" ? (column.config as Record<string, unknown>) : null;
  const target = config && typeof config.tableId === "string" ? config.tableId : "";
  const display = config && typeof config.labelColumnId === "string" ? config.labelColumnId : "";

  return {
    targetTableId: target,
    displayColumnId: display,
    cardinality: "single",
    enforceForeignKey: false
  };
}

function pickDisplayColumn(columns: ReferenceColumnChoice[]): string {
  if (!columns.length) {
    return "";
  }

  const nameMatch = columns.find((column) => column.name.toLowerCase() === "name");
  if (nameMatch) {
    return nameMatch.id;
  }

  const textLike = columns.find((column) => {
    const type = column.type?.toLowerCase?.() ?? "";
    return type.includes("text") || type.includes("char") || type.includes("string");
  });

  return (textLike ?? columns[0]).id;
}

function renderPortal(children: React.ReactNode) {
  if (typeof document === "undefined") {
    return null;
  }
  return createPortal(children, document.body);
}

export function ColumnSettingsDrawer({ tableId, column, open, onClose }: ColumnSettingsDrawerProps) {
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceState, setReferenceState] = useState<ReferenceFormState>(() => extractReferenceConfig(column));
  const [displayColumnManuallySet, setDisplayColumnManuallySet] = useState(false);

  const showReferenceSection = column?.type === ColumnTypeSchema.enum.REFERENCE;

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    const initial = extractReferenceConfig(column);
    setReferenceState(initial);
    setDisplayColumnManuallySet(Boolean(initial.displayColumnId));
  }, [open, column?.id]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const tableChoicesQuery = useReferenceTableChoices(open);
  const columnChoicesQuery = useReferenceColumnChoices(
    referenceState.targetTableId || null,
    open && Boolean(referenceState.targetTableId)
  );

  const tableChoices = tableChoicesQuery.data ?? [];
  const columnChoices = columnChoicesQuery.data ?? [];

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!referenceState.targetTableId) {
      return;
    }
    if (!columnChoices.length) {
      return;
    }
    if (displayColumnManuallySet) {
      return;
    }
    const next = pickDisplayColumn(columnChoices);
    setReferenceState((prev) => ({ ...prev, displayColumnId: next }));
  }, [open, columnChoices, referenceState.targetTableId, displayColumnManuallySet]);

  const handleOverlayClick = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!column || !referenceState.targetTableId) {
      setError("Select a target table before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/tables/${encodeURIComponent(tableId)}/columns/${encodeURIComponent(column.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type: ColumnTypeSchema.enum.REFERENCE,
            referenceConfig: {
              targetTableId: referenceState.targetTableId,
              displayColumnId: referenceState.displayColumnId || null,
              cardinality: referenceState.cardinality,
              enforceForeignKey: referenceState.enforceForeignKey
            }
          })
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save reference settings");
      }

      await response.json().catch(() => undefined);

      await queryClient.invalidateQueries({ queryKey: ["tables", "detail", tableId] });
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save reference settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTargetTableChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextTarget = event.target.value;
    setReferenceState((prev) => ({
      ...prev,
      targetTableId: nextTarget,
      displayColumnId: ""
    }));
    setDisplayColumnManuallySet(false);
  };

  const handleDisplayColumnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextDisplay = event.target.value;
    setReferenceState((prev) => ({ ...prev, displayColumnId: nextDisplay }));
    setDisplayColumnManuallySet(true);
  };

  const handleCardinalityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === "multi" ? "multi" : "single";
    setReferenceState((prev) => ({ ...prev, cardinality: value }));
  };

  const handleForeignKeyChange = (value: boolean | "indeterminate") => {
    setReferenceState((prev) => ({ ...prev, enforceForeignKey: value === true }));
  };

  const canSave = Boolean(referenceState.targetTableId) && !isSaving;

  if (!isMounted || !open || !column) {
    return null;
  }

  return renderPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex-1" onClick={handleOverlayClick} />
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-border/60 bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="column-settings-title"
      >
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h2 id="column-settings-title" className="text-base font-semibold text-text">
              Column settings
            </h2>
            <p className="text-xs text-muted-foreground">Configure how this column behaves in your table.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
            disabled={isSaving}
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>
        <form onSubmit={handleSubmit} className="flex h-full flex-col overflow-y-auto px-5 py-4">
          <section className="space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Column</p>
              <p className="mt-1 text-sm font-semibold text-text">{column.name}</p>
              <p className="text-xs text-muted-foreground">Type: {column.type}</p>
            </div>
          </section>

          {showReferenceSection ? (
            <section className="mt-6 space-y-5">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-text">Reference</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text" htmlFor="reference-target-table">
                    Target Table
                  </label>
                  <select
                    id="reference-target-table"
                    className="w-full rounded-xl border border-border/60 bg-card/80 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={referenceState.targetTableId}
                    onChange={handleTargetTableChange}
                    required
                    disabled={tableChoicesQuery.isLoading || tableChoicesQuery.isError || isSaving}
                  >
                    <option value="">Select a table…</option>
                    {tableChoices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label ?? choice.name}
                      </option>
                    ))}
                  </select>
                  {!referenceState.targetTableId ? (
                    <p className="text-xs text-muted-foreground">Select a target table to finish configuring this reference.</p>
                  ) : null}
                  {tableChoicesQuery.isError ? (
                    <p className="text-xs text-destructive">
                      {(tableChoicesQuery.error as Error).message || "Failed to load tables."}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text" htmlFor="reference-display-column">
                    Display Column
                  </label>
                  <select
                    id="reference-display-column"
                    className={cn(
                      "w-full rounded-xl border border-border/60 bg-card/80 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
                      !referenceState.targetTableId ? "text-muted-foreground" : undefined
                    )}
                    value={referenceState.displayColumnId}
                    onChange={handleDisplayColumnChange}
                    disabled={
                      !referenceState.targetTableId ||
                      columnChoicesQuery.isLoading ||
                      columnChoicesQuery.isError ||
                      isSaving ||
                      !columnChoices.length
                    }
                  >
                    <option value="">
                      {columnChoicesQuery.isLoading
                        ? "Loading columns…"
                        : columnChoices.length
                        ? "Select a column…"
                        : "No columns available"}
                    </option>
                    {columnChoices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.name}
                      </option>
                    ))}
                  </select>
                  {columnChoicesQuery.isError ? (
                    <p className="text-xs text-destructive">
                      {(columnChoicesQuery.error as Error).message || "Failed to load columns."}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-text">Cardinality</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="radio"
                        name="reference-cardinality"
                        value="single"
                        checked={referenceState.cardinality === "single"}
                        onChange={handleCardinalityChange}
                        disabled={isSaving}
                      />
                      Single
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="radio"
                        name="reference-cardinality"
                        value="multi"
                        checked={referenceState.cardinality === "multi"}
                        onChange={handleCardinalityChange}
                        disabled={isSaving}
                      />
                      Multi
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm text-text" htmlFor="reference-enforce-foreign-key">
                    <Checkbox
                      id="reference-enforce-foreign-key"
                      checked={referenceState.enforceForeignKey}
                      onCheckedChange={handleForeignKeyChange}
                      disabled={isSaving}
                    />
                    Enforce foreign key
                  </label>
                  <p className="text-xs text-muted-foreground">Soft-enforced for now.</p>
                </div>
              </div>
            </section>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Reference settings are only available when the column type is set to reference.
            </p>
          )}

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          <div className="mt-auto flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
