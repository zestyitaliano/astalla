import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateColumnDto,
  type CreateTableDto,
  type CreateViewDto,
  type DataTableDto,
  type TableQueryRequest,
  type TableQueryResponse,
  type TableColumnDto,
  type TableRowDto,
  type TableViewDto,
  type UpdateColumnDto,
  type UpdateViewDto
} from "@shared/api";

import { apiBaseUrl, isMockMode } from "@/lib/utils";

type TableDetail = DataTableDto & {
  updatedBy?: string | null;
  columns: TableColumnDto[];
  rows: TableRowDto[];
  views: TableViewDto[];
};

type PatchRowCellsPayload = {
  rowId: string;
  cells: Array<{ columnId: string; value: unknown }>;
};

type ReorderRowsPayload = {
  tableId: string;
  order: Array<{ rowId: string; position: number }>;
};

type ImportCsvResult = {
  createdColumns: number;
  createdRows: number;
};

type TablesListResponse = DataTableDto[];

type TableResponse = TableDetail;

const TABLES_API_PATH = "/api/tables";

function buildTableQueryString(params: TableQueryRequest | undefined) {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();

  if (params.viewId) {
    searchParams.set("viewId", params.viewId);
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }

  if (params.filters?.length) {
    searchParams.set("filters", JSON.stringify(params.filters));
  }

  if (params.sorts?.length) {
    searchParams.set("sorts", JSON.stringify(params.sorts));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  // @ts-expect-error -- allow returning void for non-JSON requests
  return undefined;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  headers.set("x-mock-mode", isMockMode() ? "true" : "false");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  return handleResponse<T>(response);
}

async function listTables() {
  return request<TablesListResponse>(`${TABLES_API_PATH}`);
}

async function getTable(id: string) {
  return request<TableResponse>(`${TABLES_API_PATH}/${id}`);
}

async function createTable(payload: CreateTableDto) {
  return request<DataTableDto>(`${TABLES_API_PATH}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function createColumn(tableId: string, payload: Omit<CreateColumnDto, "tableId">) {
  return request<TableColumnDto>(`${TABLES_API_PATH}/${tableId}/columns`, {
    method: "POST",
    body: JSON.stringify({ ...payload, tableId })
  });
}

async function updateColumn(id: string, payload: UpdateColumnDto & { type?: TableColumnDto["type"] }) {
  return request<TableColumnDto>(`${TABLES_API_PATH}/columns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function deleteColumn(id: string) {
  return request<{ success: boolean }>(`${TABLES_API_PATH}/columns/${id}`, {
    method: "DELETE"
  });
}

async function createRow(tableId: string, afterRowId?: string) {
  return request<TableRowDto>(`${TABLES_API_PATH}/${tableId}/rows`, {
    method: "POST",
    body: JSON.stringify(afterRowId ? { tableId, afterRowId } : { tableId })
  });
}

async function patchRowCells(rowId: string, payload: PatchRowCellsPayload) {
  return request<{ success: boolean }>(`${TABLES_API_PATH}/rows/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...payload, rowId })
  });
}

async function reorderRows(tableId: string, order: ReorderRowsPayload["order"]) {
  return request<{ success: boolean }>(`${TABLES_API_PATH}/${tableId}/rows/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ tableId, order })
  });
}

async function deleteRow(rowId: string) {
  return request<{ success: boolean }>(`${TABLES_API_PATH}/rows/${rowId}`, {
    method: "DELETE"
  });
}

async function createView(tableId: string, payload: Omit<CreateViewDto, "tableId">) {
  return request<TableViewDto>(`${TABLES_API_PATH}/${tableId}/views`, {
    method: "POST",
    body: JSON.stringify({ ...payload, tableId })
  });
}

async function updateView(id: string, payload: UpdateViewDto) {
  return request<TableViewDto>(`${TABLES_API_PATH}/views/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function deleteView(id: string) {
  return request<{ success: boolean }>(`${TABLES_API_PATH}/views/${id}`, {
    method: "DELETE"
  });
}

async function queryTable(tableId: string, params: TableQueryRequest = {}) {
  const query = buildTableQueryString(params);
  return request<TableQueryResponse>(`${TABLES_API_PATH}/${tableId}/query${query}`);
}

async function exportCsv(tableId: string, viewId?: string) {
  const searchParams = new URLSearchParams();
  if (viewId) {
    searchParams.set("viewId", viewId);
  }
  const query = searchParams.toString();
  const response = await fetch(`${apiBaseUrl}${TABLES_API_PATH}/${tableId}/export.csv${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: {
      "x-mock-mode": isMockMode() ? "true" : "false"
    },
    credentials: "include"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to export CSV");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${tableId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importCsv(tableId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBaseUrl}${TABLES_API_PATH}/${tableId}/import.csv`, {
    method: "POST",
    body: formData,
    headers: {
      "x-mock-mode": isMockMode() ? "true" : "false"
    },
    credentials: "include"
  });

  return handleResponse<ImportCsvResult>(response);
}

const tableKeys = {
  all: ["tables"] as const,
  lists: () => [...tableKeys.all, "list"] as const,
  list: () => [...tableKeys.lists()] as const,
  detail: (id: string) => [...tableKeys.all, "detail", id] as const
};

export function useTables() {
  return useQuery({
    queryKey: tableKeys.list(),
    queryFn: listTables
  });
}

export function useTable(id: string | undefined) {
  return useQuery({
    queryKey: id ? tableKeys.detail(id) : [...tableKeys.all, "detail", "__pending__"],
    queryFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing table id"));
      }
      return getTable(id);
    },
    enabled: Boolean(id)
  });
}

function useInvalidateTableList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: tableKeys.list() });
}

function useInvalidateTableDetail() {
  const queryClient = useQueryClient();
  return (id: string) => queryClient.invalidateQueries({ queryKey: tableKeys.detail(id) });
}

export function useCreateTableMutation() {
  const invalidate = useInvalidateTableList();
  return useMutation({
    mutationFn: createTable,
    onSuccess: () => invalidate()
  });
}

export function useCreateColumnMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: (payload: { name: string; type: TableColumnDto["type"]; config?: unknown }) =>
      createColumn(tableId, payload),
    onSuccess: () => invalidate(tableId)
  });
}

export function useUpdateColumnMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: UpdateColumnDto & { type?: TableColumnDto["type"] };
    }) => updateColumn(id, payload),
    onSuccess: (_, variables) => invalidate(tableId)
  });
}

export function useDeleteColumnMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: (id: string) => deleteColumn(id),
    onSuccess: () => invalidate(tableId)
  });
}

export function useCreateRowMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: (afterRowId?: string) => createRow(tableId, afterRowId),
    onSuccess: () => invalidate(tableId)
  });
}

export function usePatchRowCellsMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: ({ rowId, cells }: PatchRowCellsPayload) => patchRowCells(rowId, { rowId, cells }),
    onSuccess: () => invalidate(tableId)
  });
}

export function useReorderRowsMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: (order: ReorderRowsPayload["order"]) => reorderRows(tableId, order),
    onSuccess: () => invalidate(tableId)
  });
}

export function useDeleteRowMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: (rowId: string) => deleteRow(rowId),
    onSuccess: () => invalidate(tableId)
  });
}

export function useCreateViewMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  const invalidateList = useInvalidateTableList();
  return useMutation({
    mutationFn: (payload: Omit<CreateViewDto, "tableId">) => createView(tableId, payload),
    onSuccess: () => {
      invalidate(tableId);
      invalidateList();
    }
  });
}

export function useUpdateViewMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateViewDto }) => updateView(id, payload),
    onSuccess: () => invalidate(tableId)
  });
}

export function useDeleteViewMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: (id: string) => deleteView(id),
    onSuccess: () => invalidate(tableId)
  });
}

export function useExportCsvMutation(tableId: string) {
  return useMutation({
    mutationFn: (viewId?: string) => exportCsv(tableId, viewId)
  });
}

export function useImportCsvMutation(tableId: string) {
  const invalidate = useInvalidateTableDetail();
  return useMutation({
    mutationFn: (file: File) => importCsv(tableId, file),
    onSuccess: () => invalidate(tableId)
  });
}

export {
  createTable,
  listTables,
  getTable,
  createColumn,
  updateColumn,
  deleteColumn,
  createRow,
  patchRowCells,
  reorderRows,
  deleteRow,
  createView,
  updateView,
  deleteView,
  queryTable,
  exportCsv,
  importCsv
};

export type { TableDetail, TableColumnDto, TableRowDto, TableViewDto };
