import type { SchemaGraph, SchemaTable } from "@shared/api";
import { canRead } from "../auth/permissions.js";

export const BASE_SCHEMA: SchemaGraph = {
  tables: [
    {
      id: "public.units",
      name: "units",
      label: "Units",
      columns: [
        { id: "units.Id", name: "Id", type: "text" },
        { id: "units.Name", name: "Name", type: "text" },
        { id: "units.Bedrooms", name: "Bedrooms", type: "integer" },
        { id: "units.Bathrooms", name: "Bathrooms", type: "integer" }
      ],
      fks: []
    },
    {
      id: "public.leases",
      name: "leases",
      label: "Leases",
      columns: [
        { id: "leases.Id", name: "Id", type: "text" },
        { id: "leases.UnitId", name: "UnitId", type: "text" },
        { id: "leases.TotalRent", name: "TotalRent", type: "numeric" },
        { id: "leases.Status", name: "Status", type: "text" },
        { id: "leases.Year", name: "Year", type: "integer" },
        { id: "leases.ResidentEmail", name: "ResidentEmail", type: "text", isPII: true }
      ],
      fks: [
        { fromTable: "leases", fromCol: "UnitId", toTable: "units", toCol: "Id" }
      ]
    }
  ]
};

export const getSchemaGraphForUser = (userId: string): SchemaGraph => {
  const allowedTables: SchemaTable[] = [];
  const allowedColumnMap = new Map<string, Set<string>>();

  for (const table of BASE_SCHEMA.tables) {
    if (!canRead(userId, { kind: "table", table })) {
      continue;
    }

    const allowedColumns = table.columns.filter((column) =>
      canRead(userId, { kind: "column", table, column })
    );

    const sanitizedTable: SchemaTable = {
      id: table.id,
      name: table.name,
      label: table.label,
      columns: allowedColumns.map((column) => ({ ...column })),
      fks: []
    };

    allowedTables.push(sanitizedTable);
    allowedColumnMap.set(
      sanitizedTable.name,
      new Set(sanitizedTable.columns.map((column) => column.name))
    );
  }

  for (const table of allowedTables) {
    const original = BASE_SCHEMA.tables.find((item) => item.name === table.name);
    if (!original) continue;

    table.fks = original.fks
      .filter((fk) => {
        const fromColumns = allowedColumnMap.get(fk.fromTable);
        const toColumns = allowedColumnMap.get(fk.toTable);
        return Boolean(fromColumns?.has(fk.fromCol) && toColumns?.has(fk.toCol));
      })
      .map((fk) => ({ ...fk }));
  }

  return { tables: allowedTables };
};
