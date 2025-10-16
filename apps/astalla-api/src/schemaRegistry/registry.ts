import type { SchemaGraph, SchemaTable } from "@shared/api";
import { canRead } from "../auth/permissions.js";

const BASE_SCHEMA: SchemaGraph = {
  // TODO: Replace the static schema with ORM introspection when available.
  tables: [
    {
      id: "public.users",
      name: "users",
      label: "Users",
      columns: [
        { id: "users.id", name: "id", type: "uuid" },
        { id: "users.name", name: "name", type: "text" },
        { id: "users.email", name: "email", type: "text", isPII: true },
        { id: "users.created_at", name: "created_at", type: "timestamp" }
      ],
      fks: []
    },
    {
      id: "public.orders",
      name: "orders",
      label: "Orders",
      columns: [
        { id: "orders.id", name: "id", type: "uuid" },
        { id: "orders.user_id", name: "user_id", type: "uuid" },
        { id: "orders.total", name: "total", type: "numeric" },
        { id: "orders.created_at", name: "created_at", type: "timestamp" }
      ],
      fks: [
        { fromTable: "orders", fromCol: "user_id", toTable: "users", toCol: "id" }
      ]
    },
    {
      id: "public.order_items",
      name: "order_items",
      label: "Order Items",
      columns: [
        { id: "order_items.id", name: "id", type: "uuid" },
        { id: "order_items.order_id", name: "order_id", type: "uuid" },
        { id: "order_items.sku", name: "sku", type: "text" },
        { id: "order_items.quantity", name: "quantity", type: "integer" }
      ],
      fks: [
        { fromTable: "order_items", fromCol: "order_id", toTable: "orders", toCol: "id" }
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
