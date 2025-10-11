import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { DiagnosticsClient } from "./diagnostics-client";
import { authOptions } from "@/lib/auth-options";
import { resolveServerBaseUrl } from "@/lib/utils";

export default async function AdminDiagnosticsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user?.role !== "ORG_ADMIN") {
    redirect("/dashboard");
  }

  const apiBaseUrl = resolveServerBaseUrl();
  const normalizedBaseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  const healthUrl = `${normalizedBaseUrl}/health/auth`;

  let healthPayload: unknown = null;
  let healthError: string | null = null;

  try {
    const response = await fetch(healthUrl, { cache: "no-store" });

    if (!response.ok) {
      const bodyText = await response.text();
      healthError = `Request failed with status ${response.status}: ${bodyText}`;
    } else {
      healthPayload = await response.json();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    healthError = `Request failed: ${message}`;
  }

  const enableTestLogin =
    process.env.NODE_ENV !== "production" || process.env.ADMIN_TEST_LOGIN_ENABLED === "true";

  return (
    <div className="space-y-6">
      <DiagnosticsClient
        health={healthPayload}
        healthError={healthError}
        healthUrl={healthUrl}
        apiBaseUrl={normalizedBaseUrl}
        enableTestLogin={enableTestLogin}
      />
    </div>
  );
}
