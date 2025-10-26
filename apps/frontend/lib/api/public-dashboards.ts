import {
  createPublicDashboardRequestSchema,
  publicDashboardListResponseSchema,
  publicDashboardSchema,
  updatePublicDashboardRequestSchema,
  type CreatePublicDashboardRequest,
  type PublicDashboard,
  type PublicDashboardListResponse,
  type UpdatePublicDashboardRequest
} from "@shared/api";

import { isMockMode } from "../utils";
import { apiUrl } from "./base-url";

interface SchemaParser<T> {
  parse(data: unknown): T;
}

async function request(path: string, init: RequestInit): Promise<void>;
async function request<T>(path: string, init: RequestInit, schema: SchemaParser<T>): Promise<T>;
async function request<T>(path: string, init: RequestInit, schema?: SchemaParser<T>): Promise<T | void> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-mock-mode": isMockMode() ? "true" : "false",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Request failed for ${path}: ${response.status} ${message}`);
  }

  if (!schema) {
    return;
  }

  const json = await response.json();
  return schema.parse(json);
}

export async function listPublicDashboards(): Promise<PublicDashboardListResponse> {
  return request<PublicDashboardListResponse>("/admin/public-dashboards", { method: "GET" }, publicDashboardListResponseSchema);
}

export async function createPublicDashboard(payload: CreatePublicDashboardRequest): Promise<PublicDashboard> {
  const body = JSON.stringify(createPublicDashboardRequestSchema.parse(payload));
  return request<PublicDashboard>(
    "/admin/public-dashboards",
    {
      method: "POST",
      body
    },
    publicDashboardSchema
  );
}

export async function updatePublicDashboard(id: string, payload: UpdatePublicDashboardRequest): Promise<PublicDashboard> {
  const body = JSON.stringify(updatePublicDashboardRequestSchema.parse(payload));
  return request<PublicDashboard>(
    `/admin/public-dashboards/${id}`,
    {
      method: "PATCH",
      body
    },
    publicDashboardSchema
  );
}

export async function deletePublicDashboard(id: string): Promise<void> {
  await request(`/admin/public-dashboards/${id}`, { method: "DELETE" });
}
