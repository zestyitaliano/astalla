import { useQuery } from "@tanstack/react-query";

import { apiBaseUrl } from "@/lib/utils";

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

async function requestChoices<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    credentials: "include"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to fetch ${path}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  throw new Error(`Unexpected response when fetching ${path}`);
}

async function fetchTableChoices() {
  return requestChoices<ReferenceTableChoice[]>("/api/tables/choices");
}

async function fetchColumnChoices(tableId: string) {
  const encoded = encodeURIComponent(tableId);
  return requestChoices<ReferenceColumnChoice[]>(`/api/tables/${encoded}/columns/choices`);
}

export function useReferenceTableChoices(enabled: boolean) {
  return useQuery({
    queryKey: ["reference", "table-choices"],
    queryFn: fetchTableChoices,
    enabled
  });
}

export function useReferenceColumnChoices(tableId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["reference", "column-choices", tableId ?? "__none__"],
    queryFn: () => {
      if (!tableId) {
        throw new Error("Missing table id");
      }
      return fetchColumnChoices(tableId);
    },
    enabled: enabled && Boolean(tableId)
  });
}
