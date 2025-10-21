import type { SchemaGraph } from "@shared/api";

export type ReferenceTableChoice = {
  id: string;
  name: string;
  label?: string;
};

export type ReferenceColumnChoice = {
  id: string;
  name: string;
  type: string;
};

export interface TableChoicesResult {
  choices: ReferenceTableChoice[];
  usedFallback: boolean;
}

export interface ColumnChoicesResult {
  choices: ReferenceColumnChoice[];
  usedFallback: boolean;
}

function resolveApiUrl(apiBase: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!apiBase) {
    return normalizedPath;
  }

  try {
    const url = new URL(normalizedPath, apiBase);
    return url.toString();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[referenceChoices] Failed to resolve API URL", error);
    }
    return normalizedPath;
  }
}

async function request(apiBase: string, path: string): Promise<Response> {
  const url = resolveApiUrl(apiBase, path);
  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    credentials: "include"
  });
}

async function fetchRegistry(apiBase: string): Promise<SchemaGraph> {
  const response = await request(apiBase, "/api/schema/registry");

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch /api/schema/registry");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Unexpected response when fetching /api/schema/registry");
  }

  return (await response.json()) as SchemaGraph;
}

interface ChoiceResponse<T> {
  status: number;
  data: T | null;
}

async function fetchChoices<T>(apiBase: string, path: string): Promise<ChoiceResponse<T>> {
  const response = await request(apiBase, path);

  if (response.status === 404) {
    return { status: 404, data: null };
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to fetch ${path}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Unexpected response when fetching ${path}`);
  }

  const data = (await response.json()) as T;
  return { status: response.status, data };
}

export async function getTableChoices(apiBase: string): Promise<TableChoicesResult> {
  const { status, data } = await fetchChoices<ReferenceTableChoice[]>(apiBase, "/api/tables/choices");

  if (status === 404) {
    const registry = await fetchRegistry(apiBase);
    const choices = registry.tables.map((table) => ({
      id: table.id,
      name: table.name,
      label: table.label
    }));
    return { choices, usedFallback: true };
  }

  return { choices: data ?? [], usedFallback: false };
}

export async function getColumnChoices(apiBase: string, tableId: string): Promise<ColumnChoicesResult> {
  const encoded = encodeURIComponent(tableId);
  const { status, data } = await fetchChoices<ReferenceColumnChoice[]>(
    apiBase,
    `/api/tables/${encoded}/columns/choices`
  );

  if (status === 404) {
    const registry = await fetchRegistry(apiBase);
    const table = registry.tables.find(
      (candidate) => candidate.id === tableId || candidate.name === tableId
    );
    const choices = (table?.columns ?? []).map((column) => ({
      id: column.id,
      name: column.name,
      type: column.type
    }));
    return { choices, usedFallback: true };
  }

  return { choices: data ?? [], usedFallback: false };
}
