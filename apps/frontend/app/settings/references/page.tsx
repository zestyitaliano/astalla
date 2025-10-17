import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { featureFlagStateSchema, REF_AUTOCOMPLETE_V1 } from "@shared/api";

import { ReferencesSettingsClient } from "./ReferencesSettingsClient";
import { authOptions } from "@/lib/auth-options";
import { resolveServerBaseUrl } from "@/lib/utils";

const DEFAULT_WORKSPACE_ID = "demo-org";
const FALLBACK_USER_ID = "demo-user";

export default async function ReferencesSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin");
  }

  const baseUrl = resolveServerBaseUrl();
  const workspaceId = DEFAULT_WORKSPACE_ID;
  const userId = session?.user?.id ?? FALLBACK_USER_ID;

  const url = new URL(`/feature-flags/${REF_AUTOCOMPLETE_V1}`, baseUrl);
  url.searchParams.set("workspaceId", workspaceId);
  url.searchParams.set("userId", userId);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load feature flags: ${response.status}`);
  }

  const data = await response.json();
  const state = featureFlagStateSchema.parse(data);

  return (
    <ReferencesSettingsClient
      flag={REF_AUTOCOMPLETE_V1}
      workspaceId={workspaceId}
      userId={userId}
      initialState={state}
    />
  );
}
