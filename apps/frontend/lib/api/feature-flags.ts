import { featureFlagStateSchema, type FeatureFlagScope, type FeatureFlagState } from "@shared/api";

import { apiBaseUrl } from "@/lib/utils";

interface UpdateOptions {
  scope: FeatureFlagScope;
  enabled: boolean;
  workspaceId: string;
  userId?: string | null;
}

export async function updateFeatureFlag(flag: string, options: UpdateOptions): Promise<FeatureFlagState> {
  const response = await fetch(`${apiBaseUrl}/feature-flags/${encodeURIComponent(flag)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      scope: options.scope,
      enabled: options.enabled,
      workspaceId: options.workspaceId,
      userId: options.userId ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update feature flag: ${response.status}`);
  }

  const data = await response.json();
  return featureFlagStateSchema.parse(data);
}
