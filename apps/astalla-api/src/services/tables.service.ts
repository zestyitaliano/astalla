import type { SchemaColumn, SchemaTable } from "@shared/api";

import { prisma } from "./prisma.js";

const DEFAULT_ORG_ID = process.env.ASTALLA_ORG_ID ?? "demo-org";

type JsonRecord = Record<string, unknown>;

type DynamicTableColumn = {
  id: string;
  name: string;
  type: string;
  config?: JsonRecord | null;
  referenceConfig?: JsonRecord | null;
};

export type DynamicTable = {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  columns: DynamicTableColumn[];
};

type DynamicTableRowCell = {
  columnId: string;
  value: unknown;
};

export type DynamicTableRow = {
  id: string;
  tableId?: string;
  cells: DynamicTableRowCell[];
};

type DynamicTableLoader = (identifier: string) => Promise<DynamicTable | null>;
type DynamicTableListLoader = () => Promise<DynamicTable[]>;
type DynamicTableRowsLoader = (tableId: string) => Promise<DynamicTableRow[]>;

let tableLoaderOverride: DynamicTableLoader | null = null;
let tableListLoaderOverride: DynamicTableListLoader | null = null;
let tableRowsLoaderOverride: DynamicTableRowsLoader | null = null;

type DataTableClient = {
  findFirst: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

const getDataTableClient = () =>
  (prisma as unknown as {
    dataTable?: DataTableClient;
  }).dataTable;

const getTableRowClient = () =>
  (prisma as unknown as {
    tableRow?: {
      findMany: (args: unknown) => Promise<unknown>;
    };
  }).tableRow;

const normalizeTable = (table: DynamicTable): DynamicTable => {
  return {
    ...table,
    columns: table.columns.map((column) => ({
      id: column.id,
      name: column.name,
      type: column.type,
      config: column.config ?? undefined,
      referenceConfig: column.referenceConfig ?? undefined,
    })),
  } satisfies DynamicTable;
};

const defaultTableLoader: DynamicTableLoader = async (identifier) => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return null;
  }

  const client = getDataTableClient();
  if (!client) {
    return null;
  }

  const result = (await client.findFirst({
    where: {
      orgId: DEFAULT_ORG_ID,
      OR: [{ id: trimmed }, { name: trimmed }],
    },
    select: {
      id: true,
      orgId: true,
      name: true,
      description: true,
      columns: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          config: true,
          referenceConfig: true,
        },
      },
    },
  })) as DynamicTable | null;

  return result ? normalizeTable(result) : null;
};

type CreateTableInput = { name: string; description?: string | null };
type UpdateTableInput = { name?: string; description?: string | null };

export async function createDynamicTable(input: CreateTableInput) {
  const client = getDataTableClient();
  if (!client) {
    throw new Error("Dynamic tables are not enabled");
  }
  const table = await client.create({
    data: {
      orgId: DEFAULT_ORG_ID,
      name: input.name.trim(),
      description: input.description ?? null,
    },
    include: { columns: true, views: true },
  });
  return normalizeTable(table as unknown as DynamicTable);
}

export async function getDynamicTableById(id: string) {
  const client = getDataTableClient();
  if (!client) {
    return null;
  }
  const table = await client.findUnique({
    where: { id },
    include: { columns: true, views: true },
  });
  return table ? normalizeTable(table as unknown as DynamicTable) : null;
}

export async function updateDynamicTable(id: string, input: UpdateTableInput) {
  const client = getDataTableClient();
  if (!client) {
    throw new Error("Dynamic tables are not enabled");
  }
  const table = await client.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    include: { columns: true, views: true },
  });
  return normalizeTable(table as unknown as DynamicTable);
}

export async function deleteDynamicTable(id: string) {
  const client = getDataTableClient();
  if (!client) {
    throw new Error("Dynamic tables are not enabled");
  }
  await client.delete({ where: { id } });
}

const defaultTableListLoader: DynamicTableListLoader = async () => {
  const client = getDataTableClient();
  if (!client) {
    return [];
  }

  const results = (await client.findMany({
    where: { orgId: DEFAULT_ORG_ID },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orgId: true,
      name: true,
      description: true,
      columns: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          config: true,
          referenceConfig: true,
        },
      },
    },
  })) as DynamicTable[];

  return results.map(normalizeTable);
};

const defaultTableRowsLoader: DynamicTableRowsLoader = async (tableId) => {
  const client = getTableRowClient();
  if (!client?.findMany) {
    return [];
  }

  const rows = (await client.findMany({
    where: { tableId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      tableId: true,
      cells: {
        select: {
          columnId: true,
          value: true,
        },
      },
    },
  })) as DynamicTableRow[];

  return rows;
};

const getTableLoader = (): DynamicTableLoader => tableLoaderOverride ?? defaultTableLoader;
const getTableListLoader = (): DynamicTableListLoader => tableListLoaderOverride ?? defaultTableListLoader;
const getTableRowsLoader = (): DynamicTableRowsLoader => tableRowsLoaderOverride ?? defaultTableRowsLoader;

const mapColumnType = (type: string): string => {
  const normalized = typeof type === "string" ? type.trim().toUpperCase() : "";
  switch (normalized) {
    case "NUMBER":
      return "numeric";
    case "DATE":
      return "date";
    case "BOOLEAN":
      return "boolean";
    case "REFERENCE":
      return "reference";
    case "DATETIME":
      return "datetime";
    case "DECIMAL":
      return "decimal";
    case "INTEGER":
      return "integer";
    case "SELECT":
      return "text";
    default:
      return "text";
  }
};

const parseReferenceConfig = (value: unknown): SchemaColumn["referenceConfig"] | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as JsonRecord;
  const target = typeof raw.targetTableId === "string" ? raw.targetTableId.trim() : "";
  if (!target) {
    return undefined;
  }

  const display = raw.displayColumnId;
  const displayColumnId =
    typeof display === "string" && display.trim().length > 0
      ? display.trim()
      : display === null
        ? null
        : undefined;

  const cardinality = raw.cardinality === "multi" ? "multi" : "single";
  const enforceForeignKey = typeof raw.enforceForeignKey === "boolean" ? raw.enforceForeignKey : false;

  return {
    targetTableId: target,
    displayColumnId: displayColumnId ?? null,
    cardinality,
    enforceForeignKey,
  };
};

export const getDynamicTableByIdOrName = async (identifier: string): Promise<DynamicTable | null> => {
  const loader = getTableLoader();
  return loader(identifier);
};

export const listDynamicTables = async (): Promise<DynamicTable[]> => {
  const loader = getTableListLoader();
  return loader();
};

export const getDynamicTableRows = async (tableId: string): Promise<DynamicTableRow[]> => {
  const loader = getTableRowsLoader();
  return loader(tableId);
};

export const toSchemaTable = (table: DynamicTable): SchemaTable => {
  const schemaColumns = table.columns.map((column) => {
    const schema: SchemaColumn = {
      id: column.id,
      name: column.name,
      type: mapColumnType(column.type),
    };

    const reference = parseReferenceConfig(column.referenceConfig ?? column.config);
    if (reference) {
      schema.referenceConfig = reference;
    }

    return schema;
  });

  const schemaTable: SchemaTable = {
    id: table.id,
    name: table.name,
    label: table.description ?? table.name,
    columns: schemaColumns,
    fks: [],
  };

  return schemaTable;
};

export const __setDynamicTableLoaderForTests = (loader: DynamicTableLoader | null) => {
  tableLoaderOverride = loader;
};

export const __setDynamicTableListLoaderForTests = (loader: DynamicTableListLoader | null) => {
  tableListLoaderOverride = loader;
};

export const __setDynamicTableRowsLoaderForTests = (loader: DynamicTableRowsLoader | null) => {
  tableRowsLoaderOverride = loader;
};

export const __resetDynamicTableLoadersForTests = () => {
  tableLoaderOverride = null;
  tableListLoaderOverride = null;
  tableRowsLoaderOverride = null;
};
