"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import type { EditableCellMeta } from "@/components/data-table/editable-cell";
import { Button } from "@/components/ui/button";
import { cn, isPersistenceEnabled } from "@/lib/utils";

import type { PortfolioRecord } from "@/lib/portfolio-store";

export type PortfolioRow = PortfolioRecord;

const statusOptions: PortfolioRow["status"][] = ["Green", "At risk", "Delayed", "Planning"];

function validateNonEmpty(value: string) {
  return value.trim() ? null : "Required";
}

function validatePositiveNumber(value: string) {
  return Number(value) >= 0 ? null : "Must be positive";
}

function validateDate(value: string) {
  return Number.isNaN(Date.parse(value)) ? "Invalid date" : null;
}

async function fetchPortfolio() {
  const response = await fetch("/api/portfolio", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load portfolio rows");
  }
  const payload: { rows: PortfolioRow[] } = await response.json();
  return payload.rows;
}

export function OperationsTable({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const rowsQuery = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });
  const [rows, setRows] = useState<PortfolioRow[]>([]);

  useEffect(() => {
    if (rowsQuery.data) {
      setRows(rowsQuery.data);
    }
  }, [rowsQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!response.ok) {
        throw new Error("Failed to create row");
      }
      return (await response.json()) as PortfolioRow;
    },
    onSuccess: (record) => {
      setRows((previous) => [...previous, record]);
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PortfolioRow> }) => {
      const response = await fetch(`/api/portfolio/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!response.ok) {
        throw new Error("Failed to update row");
      }
      return (await response.json()) as PortfolioRow;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["portfolio"] });
      const previousRows = rows;
      setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
      return { previousRows };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRows) {
        setRows(context.previousRows);
      }
    },
    onSuccess: (updated) => {
      setRows((previous) => previous.map((row) => (row.id === updated.id ? updated : row)));
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/portfolio/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("Failed to delete row");
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["portfolio"] });
      const previousRows = rows;
      setRows((current) => current.filter((row) => row.id !== id));
      return { previousRows };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRows) {
        setRows(context.previousRows);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    }
  });

  const reorderMutation = useMutation({
    mutationFn: async (order: Array<{ id: string; order: number }>) => {
      const response = await fetch("/api/portfolio/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order })
      });
      if (!response.ok) {
        throw new Error("Failed to reorder rows");
      }
      const payload = (await response.json()) as { rows: PortfolioRow[] };
      return payload.rows;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["portfolio"] });
      return { previousRows: rows };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRows) {
        setRows(context.previousRows);
      }
    },
    onSuccess: (nextRows) => {
      setRows(nextRows);
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    }
  });

  const { mutate: deleteRow, isPending: isDeleting } = deleteMutation;

  const columns = useMemo<ColumnDef<PortfolioRow, unknown>[]>(() => {
    return [
      {
        accessorKey: "name",
        id: "name",
        header: "Property",
        meta: {
          editable: canEdit,
          validate: validateNonEmpty,
          placeholder: "Property name"
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        meta: {
          editable: canEdit,
          validate: (value: string) =>
            statusOptions.includes(value as PortfolioRow["status"]) ? null : "Use a listed status",
          placeholder: "Green"
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "owner",
        id: "owner",
        header: "Owner",
        meta: {
          editable: canEdit,
          validate: validateNonEmpty,
          placeholder: "Owner"
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "updatedAt",
        id: "updatedAt",
        header: "Last updated",
        meta: {
          editable: canEdit,
          formatValue: (value: unknown) => {
            const parsed = value ? new Date(value as string) : null;
            return parsed ? format(parsed, "MMM d, yyyy HH:mm") : "";
          },
          parseValue: (value: string) => new Date(value).toISOString(),
          validate: (value: string) => validateDate(value) ?? validateNonEmpty(value),
          placeholder: "2024-11-05 18:30",
          headerClassName: "hidden md:table-cell",
          cellClassName: "hidden md:table-cell"
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "slaHours",
        id: "slaHours",
        header: "SLA (hrs)",
        meta: {
          editable: canEdit,
          inputType: "number",
          formatValue: (value) => String(value ?? ""),
          parseValue: (value: string) => Number(value),
          validate: validatePositiveNumber
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "monthlyCost",
        id: "monthlyCost",
        header: "Monthly cost",
        meta: {
          editable: canEdit,
          inputType: "number",
          formatValue: (value) =>
            typeof value === "number" ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "",
          parseValue: (value: string) => Number(value.replace(/[$,\s]/g, "")),
          validate: validatePositiveNumber
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "occupancy",
        id: "occupancy",
        header: "Occupancy %",
        meta: {
          editable: canEdit,
          inputType: "number",
          formatValue: (value) => (typeof value === "number" ? `${value.toFixed(0)}%` : ""),
          parseValue: (value: string) => Number(value.replace(/%/g, "")),
          validate: (value: string) => {
            const numeric = Number(value.replace(/%/g, ""));
            if (Number.isNaN(numeric)) {
              return "Enter a number";
            }
            if (numeric < 0 || numeric > 100) {
              return "0 – 100 only";
            }
            return null;
          }
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "incidents",
        id: "incidents",
        header: "Open incidents",
        meta: {
          editable: canEdit,
          inputType: "number",
          parseValue: (value: string) => Number(value),
          validate: validatePositiveNumber,
          formatValue: (value) => String(value ?? "")
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => deleteRow(row.original.id)}
              disabled={!canEdit || isDeleting}
              aria-label={`Delete ${row.original.name}`}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )
      }
    ];
  }, [canEdit, deleteRow, isDeleting]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          size="sm"
          className="gap-2"
          onClick={() => createMutation.mutate()}
          disabled={!canEdit || createMutation.isPending}
        >
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add row
        </Button>
        {rowsQuery.isFetching ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Syncing
          </div>
        ) : null}
      </div>
      {rowsQuery.isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Unable to load saved portfolio rows. Working with the latest cached data.
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={rows}
        storageKey="astalla:portfolio-table:v3"
        persistenceEnabled={isPersistenceEnabled()}
        onDataChange={(nextRows) => {
          const previousOrder = rows.map((row) => row.id).join("|");
          const nextOrder = nextRows.map((row) => row.id).join("|");

          setRows(nextRows);

          if (previousOrder !== nextOrder) {
            reorderMutation.mutate(nextRows.map((row, index) => ({ id: row.id, order: index })));
          }
        }}
        className={cn("pb-2", !canEdit && "opacity-90")}
        meta={{
          onUpdate: (rowId: string, columnId: string, value: unknown) => {
            updateMutation.mutate({ id: rowId, patch: { [columnId]: value } as Partial<PortfolioRow> });
          }
        }}
      />
      {reorderMutation.isPending ? (
        <p className="text-xs text-muted-foreground">Saving new order…</p>
      ) : null}
    </div>
  );
}
