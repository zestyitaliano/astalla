import { useMemo } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import type { TableColumnDto, TableQueryRequest, TableQueryResponse, TableRowDto } from "@shared/api";

import { queryTable } from "@/lib/api/tables";

export type TableRecord = {
  id: string;
  row: TableRowDto;
  values: Record<string, unknown>;
};

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildRecord(columns: TableColumnDto[], row: TableRowDto): TableRecord {
  const columnMap = new Map(columns.map((column) => [column.id, column] as const));
  const values: Record<string, unknown> = { id: row.id };

  for (const cell of row.cells) {
    const column = columnMap.get(cell.columnId);
    if (!column) {
      continue;
    }

    const slugKey = column.slug.trim();
    if (slugKey) {
      values[slugKey] = cell.value ?? null;
    }

    const nameKey = normalizeKey(column.name);
    if (nameKey && typeof values[nameKey] === "undefined") {
      values[nameKey] = cell.value ?? null;
    }
  }

  return { id: row.id, row, values };
}

export function mapTableRecords(columns: TableColumnDto[], rows: TableRowDto[]): TableRecord[] {
  return rows.map((row) => buildRecord(columns, row));
}

export type TablesQueryParams = TableQueryRequest;

type UseTablesQueryOptions<T> = {
  enabled?: boolean;
  queryKey?: unknown[];
  select?: (value: TableQueryResponse & { records: TableRecord[] }) => T;
};

export function useTablesQuery<T = TableQueryResponse & { records: TableRecord[] }>(
  tableId: string | undefined,
  params?: TablesQueryParams,
  options?: UseTablesQueryOptions<T>
) {
  const request = params ?? {};

  const queryKey = useMemo(() => {
    if (options?.queryKey) {
      return options.queryKey;
    }

    return [
      "tables-query",
      tableId ?? "__none__",
      request.viewId ?? null,
      request.limit ?? null,
      request.offset ?? null,
      request.filters ? JSON.stringify(request.filters) : null,
      request.sorts ? JSON.stringify(request.sorts) : null
    ];
  }, [options?.queryKey, request.filters, request.limit, request.offset, request.sorts, request.viewId, tableId]);

  const baseSelect = (result: TableQueryResponse) => ({
    ...result,
    records: mapTableRecords(result.columns, result.rows)
  });

  const queryOptions: UseQueryOptions<TableQueryResponse, Error, T> = {
    queryKey,
    queryFn: async () => {
      if (!tableId) {
        throw new Error("Missing table id");
      }
      return queryTable(tableId, request);
    },
    enabled: Boolean(tableId) && (options?.enabled ?? true),
    select: (result) => {
      const base = baseSelect(result);
      return options?.select ? options.select(base) : (base as T);
    }
  };

  return useQuery(queryOptions);
}
