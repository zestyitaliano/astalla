import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { ZodError } from "zod";
import {
  createColumnDtoSchema,
  tableColumnDtoSchema,
  updateColumnDtoSchema,
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
  type UpdateTableDto,
  type UpdateViewDto
} from "@shared/api";

import { isMockMode } from "@/lib/utils";
import { TableDetailSchema } from "@/lib/schemas/tableDetail";
import { apiUrl, getApiBaseUrl } from "./base-url";

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

class TableApiError extends Error {
  status: number;

  constructor(message: string, options: { status: number }) {
    super(message);
    this.name = "TableApiError";
    this.status = options.status;
  }
}

type UpdateTableMutationVariables = { id: string; payload: UpdateTableDto };
type UpdateTableMutationInput = UpdateTableDto | UpdateTableMutationVariables;

const TABLES_API_PATH = "/api/tables";

const createColumnPayloadSchema = createColumnDtoSchema.omit({ tableId: true });

const HEALTH_CHECK_PATH = "/health";
const HEALTH_CHECK_TIMEOUT_MS = 3000;

let lastHealthWarningSignature: string | null = null;

function formatColumnPayloadError(error: ZodError) {
  if (!error.issues.length) {
    return "Column payload is invalid.";
  }

  const descriptions = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return `Invalid column settings: ${descriptions.join(", ")}`;
}

function logHealthCheckFailure(details: { reason: string; status?: number }) {
  const signature = details.status ? `status:${details.status}` : `reason:${details.reason}`;
  if (signature === lastHealthWarningSignature) {
    return;
  }

  lastHealthWarningSignature = signature;
  const resolvedBaseUrl = getApiBaseUrl() || "(same origin)";
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const hint = configuredBaseUrl
    ? `Verify NEXT_PUBLIC_API_BASE_URL (${configuredBaseUrl}) points to the running backend.`
    : "Verify the backend is reachable from this origin.";

  console.warn("[tables] Backend health check failed", {
    url: apiUrl(HEALTH_CHECK_PATH),
    resolvedBaseUrl,
    hint,
    ...details
  });
}

async function checkBackendHealth() {
  if (typeof window === "undefined") {
    return;
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? window.setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS) : null;

  try {
    const response = await fetch(apiUrl(HEALTH_CHECK_PATH), {
      method: "GET",
      credentials: "include",
      signal: controller?.signal
    });

    if (!response.ok) {
      logHealthCheckFailure({ reason: "unexpected-status", status: response.status });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logHealthCheckFailure({ reason });
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

function isUpdateTableMutationVariables(value: UpdateTableMutationInput): value is UpdateTableMutationVariables {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<UpdateTableMutationVariables>;
  return typeof candidate.id === "string" && candidate.payload !== undefined;
}

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
    const contentType = response.headers.get("content-type");
    let message: string | undefined;

    const rawText = await response.text();
    if (contentType?.includes("application/json")) {
      try {
        const payload = JSON.parse(rawText) as { message?: string };
        if (payload && typeof payload.message === "string" && payload.message.trim()) {
          message = payload.message.trim();
        }
      } catch (error) {
        console.warn("[tables] failed to parse error response", error);
      }
    }

    if (!message) {
      message = rawText || `Request failed with status ${response.status}`;
    }

    throw new TableApiError(message, { status: response.status });
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

  const response = await fetch(apiUrl(path), {
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
  const payload = await request<TableResponse>(`${TABLES_API_PATH}/${id}`);

  try {
    TableDetailSchema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("[tables] invalid table detail response", { id, error });
      throw new Error("Invalid table data received from the server. Please try again.");
    }

    throw error;
  }

  return payload;
}

async function createTable(payload: CreateTableDto) {
  return request<DataTableDto>(`${TABLES_API_PATH}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateTable(id: string, payload: UpdateTableDto) {
  return request<DataTableDto>(`${TABLES_API_PATH}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function deleteTable(id: string) {
  return request<void>(`${TABLES_API_PATH}/${id}`, {
    method: "DELETE"
  });
}

function parseColumnPayload<T>(schema: { parse: (value: unknown) => T }, payload: unknown) {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(formatColumnPayloadError(error));
    }

    throw error;
  }
}

function parseColumnResponse(payload: TableColumnDto, context: { action: string; columnId?: string; tableId?: string }) {
  try {
    tableColumnDtoSchema.parse(payload);
    return payload;
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("[tables] invalid column response", { context, error });
      throw new Error("Received invalid column data from the server.");
    }

    throw error;
  }
}

async function createColumn(tableId: string, payload: Omit<CreateColumnDto, "tableId">) {
  const parsedPayload = parseColumnPayload(createColumnPayloadSchema, payload);
  const column = await request<TableColumnDto>(`${TABLES_API_PATH}/${tableId}/columns`, {
    method: "POST",
    body: JSON.stringify({ ...parsedPayload, tableId })
  });

  return parseColumnResponse(column, { action: "create", tableId });
}

async function updateColumn(id: string, payload: UpdateColumnDto & { type?: TableColumnDto["type"] }) {
  const parsedPayload = parseColumnPayload(updateColumnDtoSchema, payload);
  const column = await request<TableColumnDto>(`${TABLES_API_PATH}/columns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(parsedPayload)
  });

  return parseColumnResponse(column, { action: "update", columnId: id });
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

type RowLookupItem = { id: string; preview: string; fields?: Record<string, unknown> };
type RowLookupResponse = { items: RowLookupItem[]; nextCursor?: string };

function nowIso() {
  return new Date().toISOString();
}

async function queryTable(
  tableId: string,
  params: TableQueryRequest = {}
): Promise<TableQueryResponse> {
  const query = buildTableQueryString(params);
  const sep = query ? "&" : "?";

  // 1) Load columns for this table (supports static + dynamic)
  const rawColumns = await request<TableColumnDto[]>(
    `${TABLES_API_PATH}/${encodeURIComponent(tableId)}/columns`
  );

  // Normalize columns to TableColumnDto
  const columns: TableColumnDto[] = rawColumns.map((c, i) => ({
    id: c.id,
    tableId,
    name: c.name,
    slug: (c as any).slug ?? c.name.trim().toLowerCase().replace(/\s+/g, "-"),
    type: c.type as TableColumnDto["type"],
    position: typeof (c as any).position === "number" ? (c as any).position : i,
    config: (c as any).config ?? null,
    createdAt: (c as any).createdAt ?? nowIso(),
    updatedAt: (c as any).updatedAt ?? nowIso(),
  }));

  // 2) Load row items from /api/rows
  const list = await request<RowLookupResponse>(
    `/api/rows${query}${sep}tableId=${encodeURIComponent(tableId)}`
  );

  // 3) Convert to TableRowDto[]
  const rows: TableRowDto[] = (list.items ?? []).map((it, idx) => ({
    id: it.id,
    tableId,
    position: (params as any).offset ? Number((params as any).offset) + idx : idx,
    cells: columns.map((col) => ({
      columnId: col.id,
      value: it.fields ? (it.fields as Record<string, unknown>)[col.id] ?? null : null,
    })),
    createdBy: null,
    updatedBy: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));

  // We don't have a true total yet; use page size as a safe default
  const total = rows.length;

  return { rows, columns, total };
}

async function exportCsv(tableId: string, viewId?: string) {
  const searchParams = new URLSearchParams();
  if (viewId) {
    searchParams.set("viewId", viewId);
  }
  const query = searchParams.toString();
  const response = await fetch(
    apiUrl(`${TABLES_API_PATH}/${tableId}/export.csv${query ? `?${query}` : ""}`),
    {
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

  const response = await fetch(apiUrl(`${TABLES_API_PATH}/${tableId}/import.csv`), {
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

type UseTableOptions = {
  onError?: (error: Error) => void;
  onSuccess?: (data: TableDetail) => void;
};

export function useTable(id: string | undefined, options: UseTableOptions = {}) {
  const { onError, onSuccess } = options;

  const query = useQuery<TableDetail, Error>({
    queryKey: id ? tableKeys.detail(id) : [...tableKeys.all, "detail", "__pending__"],
    queryFn: async () => {
      if (!id) {
        return Promise.reject(new Error("Missing table id"));
      }
      void checkBackendHealth();
      console.info("[tables] fetching table detail", { id });
      try {
        const table = await getTable(id);
        console.info("[tables] received table detail", {
          id,
          columnCount: table.columns?.length ?? 0,
          rowCount: table.rows?.length ?? 0,
          viewCount: table.views?.length ?? 0
        });
        return table;
      } catch (error) {
        console.info("[tables] table detail request failed", { id, error });
        throw error;
      }
    },
    enabled: Boolean(id),
    retry: 0
  });

  useEffect(() => {
    if (query.isError) {
      const error = query.error;
      const normalizedError =
        error instanceof Error
          ? error
          : new Error(error ? String(error) : "Unknown error");

      onError?.(normalizedError);
    }
  }, [query.error, query.isError, onError]);

  useEffect(() => {
    if (query.isSuccess) {
      onSuccess?.(query.data);
    }
  }, [query.data, query.isSuccess, onSuccess]);

  return query;
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

type UpdateTableMutationResult<TVariables> = UseMutationResult<DataTableDto, Error, TVariables>;

export function useUpdateTableMutation(tableId: string): UpdateTableMutationResult<UpdateTableDto>;
export function useUpdateTableMutation(): UpdateTableMutationResult<UpdateTableMutationVariables>;
export function useUpdateTableMutation(tableId?: string) {
  const invalidateList = useInvalidateTableList();
  const invalidateDetail = useInvalidateTableDetail();

  const mutation = useMutation<DataTableDto, Error, UpdateTableMutationInput>({
    mutationFn: (variables) => {
      if (isUpdateTableMutationVariables(variables)) {
        return updateTable(variables.id, variables.payload);
      }

      if (!tableId) {
        throw new Error("Missing table id for updateTable mutation");
      }

      return updateTable(tableId, variables);
    },
    onSuccess: (_, variables) => {
      invalidateList();

      const id = tableId ?? (isUpdateTableMutationVariables(variables) ? variables.id : undefined);
      if (id) {
        invalidateDetail(id);
      }
    }
  });

  if (tableId) {
    return mutation as UpdateTableMutationResult<UpdateTableDto>;
  }

  return mutation as UpdateTableMutationResult<UpdateTableMutationVariables>;
}

export function useDeleteTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTable(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: tableKeys.list() });
      queryClient.invalidateQueries({ queryKey: tableKeys.detail(id) });
    }
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
  updateTable,
  deleteTable,
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
  importCsv,
  TableApiError
};

export type { TableDetail, TableColumnDto, TableRowDto, TableViewDto, UseTableOptions };
