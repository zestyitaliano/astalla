import {
  createSourceRequestSchema,
  listSourcesResponseSchema,
  providerRunResponseSchema,
  providerScriptSchema,
  providerValidateResponseSchema,
  sourceActionLogListSchema,
  sourceDetailSchema,
  sourceMutationResponseSchema,
  updateSourceRequestSchema,
  type CreateSourceRequest,
  type ListSourcesResponse,
  type ProviderRunResponse,
  type ProviderScriptResponse,
  type ProviderValidateResponse,
  type SourceActionLogEntry,
  type SourceDetail,
  type SourceMutationResponse,
  type UpdateSourceRequest
} from "@shared/api";

import { apiBaseUrl, isMockMode } from "../utils";

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type SchemaParser<T> = { parse: (data: unknown) => T };

async function request(
  path: string,
  init: RequestInit
): Promise<void>;
async function request<T>(
  path: string,
  init: RequestInit,
  schema: SchemaParser<T>
): Promise<T>;
async function request<T>(
  path: string,
  init: RequestInit,
  schema?: SchemaParser<T>
): Promise<T | void> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-mock-mode": isMockMode() ? "true" : "false",
      ...(init.headers ?? {})
    }
  });

  const rawBody = await response.text();
  let parsedBody: unknown = undefined;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const message = typeof parsedBody === "object" && parsedBody && "message" in parsedBody
      ? String((parsedBody as { message?: unknown }).message)
      : `Request failed for ${path}: ${response.status}`;
    throw new ApiError(message, response.status, parsedBody);
  }

  if (!schema) {
    return;
  }

  return schema.parse(parsedBody ?? {});
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
  await request(`/admin/sources/${id}`, { method: "DELETE" });
}

export async function runSource(id: string): Promise<void> {
  await request(`/admin/sources/${id}/run`, { method: "POST" });
}

export async function getSourceDetail(id: string): Promise<SourceDetail> {
  return request<SourceDetail>(`/admin/sources/${id}`, { method: "GET" }, sourceDetailSchema) as Promise<SourceDetail>;
}

export async function getProviderScript(sourceId: string): Promise<ProviderScriptResponse> {
  return request<ProviderScriptResponse>(
    `/admin/dev/providers/${sourceId}/script`,
    { method: "GET" },
    providerScriptSchema
  ) as Promise<ProviderScriptResponse>;
}

export async function saveProviderScript(
  sourceId: string,
  payload: { code: string; readme?: string }
): Promise<ProviderScriptResponse> {
  const body = JSON.stringify(payload);
  return request<ProviderScriptResponse>(
    `/admin/dev/providers/${sourceId}/script`,
    {
      method: "POST",
      body
    },
    providerScriptSchema
  ) as Promise<ProviderScriptResponse>;
}

export async function publishProviderScript(
  sourceId: string,
  publishedBy?: string
): Promise<ProviderScriptResponse> {
  const body = publishedBy ? JSON.stringify({ publishedBy }) : undefined;
  return request<ProviderScriptResponse>(
    `/admin/dev/providers/${sourceId}/publish`,
    {
      method: "POST",
      ...(body ? { body } : {})
    },
    providerScriptSchema
  ) as Promise<ProviderScriptResponse>;
}

export async function validateProviderScript(sourceId: string): Promise<ProviderValidateResponse> {
  return request<ProviderValidateResponse>(
    `/admin/dev/providers/${sourceId}/validate`,
    { method: "POST" },
    providerValidateResponseSchema
  ) as Promise<ProviderValidateResponse>;
}

export async function runProviderScript(sourceId: string, createdBy?: string): Promise<ProviderRunResponse> {
  const body = createdBy ? JSON.stringify({ createdBy }) : undefined;
  return request<ProviderRunResponse>(
    `/admin/dev/providers/${sourceId}/run`,
    {
      method: "POST",
      ...(body ? { body } : {})
    },
    providerRunResponseSchema
  ) as Promise<ProviderRunResponse>;
}

export async function listProviderLogs(sourceId: string): Promise<SourceActionLogEntry[]> {
  return request<SourceActionLogEntry[]>(
    `/admin/dev/providers/${sourceId}/logs`,
    { method: "GET" },
    sourceActionLogListSchema
  ) as Promise<SourceActionLogEntry[]>;
}
