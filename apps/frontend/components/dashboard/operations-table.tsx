"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { DataTable } from "@/components/data-table/data-table";
import type { EditableCellMeta } from "@/components/data-table/editable-cell";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { isPersistenceEnabled } from "@/lib/utils";

export type PortfolioRow = {
  id: string;
  name: string;
  status: "Green" | "At risk" | "Delayed" | "Planning";
  owner: string;
  updatedAt: string;
  slaHours: number;
  monthlyCost: number;
  occupancy: number;
  incidents: number;
};

const initialRows: PortfolioRow[] = [
  {
    id: "prop-1",
    name: "Atrium Center",
    status: "Green",
    owner: "Casey Wynn",
    updatedAt: "2024-11-04T15:05:00.000Z",
    slaHours: 12,
    monthlyCost: 48000,
    occupancy: 92,
    incidents: 1
  },
  {
    id: "prop-2",
    name: "Harbor Tower",
    status: "At risk",
    owner: "Jules Moreno",
    updatedAt: "2024-11-03T09:20:00.000Z",
    slaHours: 4,
    monthlyCost: 72000,
    occupancy: 87,
    incidents: 4
  },
  {
    id: "prop-3",
    name: "North Loop Campus",
    status: "Delayed",
    owner: "Sydney Patel",
    updatedAt: "2024-11-01T12:10:00.000Z",
    slaHours: 30,
    monthlyCost: 56000,
    occupancy: 81,
    incidents: 3
  },
  {
    id: "prop-4",
    name: "Quartz Labs",
    status: "Planning",
    owner: "Amelia Chen",
    updatedAt: "2024-10-28T08:12:00.000Z",
    slaHours: 48,
    monthlyCost: 39500,
    occupancy: 68,
    incidents: 6
  },
  {
    id: "prop-5",
    name: "Riverside Commons",
    status: "Green",
    owner: "Jonah Walker",
    updatedAt: "2024-11-05T18:30:00.000Z",
    slaHours: 16,
    monthlyCost: 61000,
    occupancy: 95,
    incidents: 0
  },
  {
    id: "prop-6",
    name: "Summit Hub",
    status: "At risk",
    owner: "Bryn Lee",
    updatedAt: "2024-11-02T16:02:00.000Z",
    slaHours: 10,
    monthlyCost: 45200,
    occupancy: 78,
    incidents: 5
  }
];

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

export function OperationsTable() {
  const [rows, setRows] = useState(initialRows);

  const columns = useMemo<ColumnDef<PortfolioRow, unknown>[]>(() => {
    return [
      {
        accessorKey: "name",
        id: "name",
        header: "Property",
        meta: {
          editable: true,
          validate: validateNonEmpty,
          placeholder: "Property name"
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        meta: {
          editable: true,
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
          editable: true,
          validate: validateNonEmpty,
          placeholder: "Owner"
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "updatedAt",
        id: "updatedAt",
        header: "Last updated",
        meta: {
          editable: true,
          formatValue: (value: unknown) => {
            const parsed = value ? new Date(value as string) : null;
            return parsed ? format(parsed, "MMM d, yyyy HH:mm") : "";
          },
          parseValue: (value: string) => new Date(value).toISOString(),
          validate: (value: string) => validateDate(value) ?? validateNonEmpty(value),
          placeholder: "2024-11-05 18:30"
        } satisfies EditableCellMeta<PortfolioRow>
      },
      {
        accessorKey: "slaHours",
        id: "slaHours",
        header: "SLA (hrs)",
        meta: {
          editable: true,
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
          editable: true,
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
          editable: true,
          inputType: "number",
          formatValue: (value) =>
            typeof value === "number" ? `${value.toFixed(0)}%` : "",
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
          editable: true,
          inputType: "number",
          parseValue: (value: string) => Number(value),
          validate: validatePositiveNumber,
          formatValue: (value) => String(value ?? "")
        } satisfies EditableCellMeta<PortfolioRow>
      }
    ];
  }, []);

  return (
    <DashboardCard
      title="Portfolio performance"
      description="Track contracts, SLAs and incident load for high-value properties."
      action={<p className="text-xs text-muted-foreground">Drag columns or rows to personalize the view.</p>}
    >
      <DataTable
        columns={columns}
        data={rows}
        storageKey="astalla:portfolio-table:v2"
        persistenceEnabled={isPersistenceEnabled()}
        onDataChange={setRows}
      />
    </DashboardCard>
  );
}
