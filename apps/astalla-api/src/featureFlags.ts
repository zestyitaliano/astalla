import { featureFlagStateSchema, type FeatureFlagState } from "@shared/api";

const overrides = new Map<string, boolean>();

const FEATURE_FLAG_SERVICE_BASE_URL =
  process.env.FEATURE_FLAG_SERVICE_BASE_URL ?? process.env.BACKEND_FEATURE_FLAG_BASE_URL ?? null;
const FEATURE_FLAG_SERVICE_TOKEN = process.env.FEATURE_FLAG_SERVICE_TOKEN ?? null;

interface FlagContext {
  userId?: string;
  workspaceId?: string;
}

async function fetchRemoteFlag(flag: string, context: FlagContext): Promise<FeatureFlagState | null> {
  if (!FEATURE_FLAG_SERVICE_BASE_URL) {
    return null;
  }

  try {
    const url = new URL(`/feature-flags/${encodeURIComponent(flag)}`, FEATURE_FLAG_SERVICE_BASE_URL);
    if (context.workspaceId) {
      url.searchParams.set("workspaceId", context.workspaceId);
    }
    if (context.userId) {
      url.searchParams.set("userId", context.userId);
    }

    const response = await fetch(url.toString(), {
      headers: FEATURE_FLAG_SERVICE_TOKEN
        ? {
            Authorization: `Bearer ${FEATURE_FLAG_SERVICE_TOKEN}`,
          }
        : undefined,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return featureFlagStateSchema.parse(data);
  } catch (error) {
    console.warn(`[feature-flags] Failed to fetch ${flag}`, error);
    return null;
  }
}

export async function isFeatureEnabled(flag: string, context: FlagContext): Promise<boolean> {
  if (overrides.has(flag)) {
    return overrides.get(flag) ?? false;
  }

  const state = await fetchRemoteFlag(flag, context);
  if (state) {
    return state.effectiveEnabled;
  }

  return false;
}

export function setFeatureFlagOverride(flag: string, enabled: boolean | null): void {
  if (enabled === null) {
    overrides.delete(flag);
    return;
  }
  overrides.set(flag, enabled);
}

export function resetFeatureFlagOverrides(): void {
  overrides.clear();
}
