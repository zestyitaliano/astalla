"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type DiagnosticsClientProps = {
  health: unknown;
  healthError: string | null;
  healthUrl: string;
  apiBaseUrl: string;
  enableTestLogin: boolean;
};

export function DiagnosticsClient({
  health,
  healthError,
  healthUrl,
  apiBaseUrl,
  enableTestLogin
}: DiagnosticsClientProps) {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const runTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/admin/diagnostics/test-login", {
        method: "POST"
      });

      const payload = await response.json();
      setTestResult(JSON.stringify(payload, null, 2));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
      setTestResult(`Request failed: ${message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card/90 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-text">Authentication diagnostics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Backend base URL: <code className="rounded bg-muted px-1 py-0.5 text-xs">{apiBaseUrl}</code>
        </p>
        <p className="text-sm text-muted-foreground">
          Health endpoint: <code className="rounded bg-muted px-1 py-0.5 text-xs">{healthUrl}</code>
        </p>
        <div className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">/health/auth response</h2>
          {healthError ? (
            <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {healthError}
            </p>
          ) : (
            <pre className="mt-2 max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-sm">
              {JSON.stringify(health, null, 2)}
            </pre>
          )}
        </div>
      </div>
      {enableTestLogin ? (
        <div className="rounded-2xl border bg-card/90 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text">Test login as admin</h2>
              <p className="text-sm text-muted-foreground">
                Runs a credential login request against the backend using the configured admin user.
              </p>
            </div>
            <Button onClick={runTest} disabled={isTesting}>
              {isTesting ? "Testing..." : "Test login as admin"}
            </Button>
          </div>
          {testResult ? (
            <pre className="mt-4 max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-sm">
              {testResult}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
