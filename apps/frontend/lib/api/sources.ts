import {
  createSourceRequestSchema,
  listSourcesResponseSchema,
  sourceMutationResponseSchema,
  updateSourceRequestSchema,
  type CreateSourceRequest,
  type ListSourcesResponse,
  type SourceMutationResponse,
  type UpdateSourceRequest
} from "@shared/api";

import { apiBaseUrl, isMockMode } from "../utils";

async function request<T>(
  path: string,
  init: RequestInit,
  schema?: { parse: (data: unknown) => T }
): Promise<T extends void ? void : T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-mock-mode": isMockMode() ? "true" : "false",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed for ${path}: ${response.status} ${body}`);
  }

  if (!schema) {
    return undefined as T extends void ? void : T;
  }

  const json = await response.json();
  return schema.parse(json);
}

export async function listSources(): Promise<ListSourcesResponse> {
  return request<ListSourcesResponse>("/admin/sources", { method: "GET" }, listSourcesResponseSchema);
}

export async function createSource(payload: CreateSourceRequest): Promise<SourceMutationResponse> {
  const body = JSON.stringify(createSourceRequestSchema.parse(payload));
  return request<SourceMutationResponse>(
    "/admin/sources",
    {
      method: "POST",
      body
    },
    sourceMutationResponseSchema
  );
}

export async function updateSource(id: string, payload: UpdateSourceRequest): Promise<SourceMutationResponse> {
  const body = JSON.stringify(updateSourceRequestSchema.parse(payload));
  return request<SourceMutationResponse>(
    `/admin/sources/${id}`,
    {
      method: "PATCH",
      body
    },
    sourceMutationResponseSchema
  );
}

export async function deleteSource(id: string): Promise<void> {
  await request<void>(`/admin/sources/${id}`, { method: "DELETE" });
}

export async function runSource(id: string): Promise<void> {
  await request<void>(`/admin/sources/${id}/run`, { method: "POST" });
}
