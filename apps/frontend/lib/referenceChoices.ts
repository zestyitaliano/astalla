import type { SchemaGraph } from "@shared/api";

import { apiUrl } from "./apiBase";

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

function resolvePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

async function request(path: string): Promise<Response> {
  const url = apiUrl(resolvePath(path));
  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    credentials: "include"
  });
}

async function fetchRegistry(): Promise<SchemaGraph> {
  const response = await request("/api/schema/registry");

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

async function fetchChoices<T>(path: string): Promise<ChoiceResponse<T>> {
  const response = await request(path);

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

export async function getTableChoices(): Promise<TableChoicesResult> {
  const { status, data } = await fetchChoices<ReferenceTableChoice[]>("/api/tables/choices");

  if (status === 404) {
    const registry = await fetchRegistry();
    const choices = registry.tables.map((table) => ({
      id: table.id,
      name: table.name,
      label: table.label
    }));
    return { choices, usedFallback: true };
  }

  return { choices: data ?? [], usedFallback: false };
}

export async function getColumnChoices(tableId: string): Promise<ColumnChoicesResult> {
  const encoded = encodeURIComponent(tableId);
  const { status, data } = await fetchChoices<ReferenceColumnChoice[]>(
    `/api/tables/${encoded}/columns/choices`
  );

  if (status === 404) {
    const registry = await fetchRegistry();
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
