"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Save,
  UploadCloud
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ApiError,
  getProviderScript,
  getSourceDetail,
  listProviderLogs,
  publishProviderScript,
  runProviderScript,
  saveProviderScript,
  validateProviderScript
} from "@/lib/api/sources";
import { cn } from "@/lib/utils";
import type { ProviderRunResponse, ProviderValidateResponse, SourceActionLogEntry } from "@shared/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
      Loading editor…
    </div>
  )
});

type TabKey = "script" | "readme";

interface SourceStudioViewProps {
  sourceId: string;
}

interface ActionFeedback {
  type: "save" | "validate" | "run" | "publish";
  success: boolean;
  message: string;
  logs?: string[];
  latencyMs?: number;
  rowsPersisted?: number;
}

function extractError(error: unknown): { message: string; logs?: string[] } {
  if (error instanceof ApiError) {
    const data = error.data;
    if (data && typeof data === "object") {
      const raw = data as Record<string, unknown>;
      const logs = Array.isArray(raw.logs) ? (raw.logs as unknown[]).map((item) => String(item)) : undefined;
      const message = typeof raw.message === "string" ? raw.message : error.message;
      return { message, logs };
    }
    return { message: error.message };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Unexpected error" };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function parseLog(entry: SourceActionLogEntry) {
  const response = entry.response && typeof entry.response === "object" ? (entry.response as Record<string, unknown>) : null;
  const logs = response && Array.isArray(response.logs) ? (response.logs as unknown[]).map((item) => String(item)) : [];
  const rows = response && typeof response.rowsPersisted === "number" ? (response.rowsPersisted as number) : undefined;
  return { logs, rowsPersisted: rows };
}

export function SourceStudioView({ sourceId }: SourceStudioViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("script");
  const [code, setCode] = useState("");
  const [readme, setReadme] = useState("");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const scriptQuery = useQuery({
    queryKey: ["provider-script", sourceId],
    queryFn: () => getProviderScript(sourceId)
  });

  const detailQuery = useQuery({
    queryKey: ["source-detail", sourceId],
    queryFn: () => getSourceDetail(sourceId)
  });

  const logsQuery = useQuery({
    queryKey: ["provider-logs", sourceId],
    queryFn: () => listProviderLogs(sourceId),
    refetchInterval: 15_000
  });

  useEffect(() => {
    if (!scriptQuery.data) {
      return;
    }
    setCode(scriptQuery.data.code ?? "");
    setReadme(scriptQuery.data.readme ?? "");
  }, [scriptQuery.data]);

  const persistDraft = useCallback(
    async (options?: { silent?: boolean }) => {
      setIsSaving(true);
      try {
        const saved = await saveProviderScript(sourceId, { code, readme });
        queryClient.setQueryData(["provider-script", sourceId], saved);
        if (!options?.silent) {
          setFeedback({ type: "save", success: true, message: "Draft saved." });
        }
        return saved;
      } catch (error) {
        const { message } = extractError(error);
        if (!options?.silent) {
          setFeedback({ type: "save", success: false, message });
        }
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [code, readme, queryClient, sourceId]
  );

  const validateMutation = useMutation({
    mutationFn: async () => {
      await persistDraft({ silent: true });
      return validateProviderScript(sourceId);
    },
    onSuccess: (data) => handleValidateSuccess(data),
    onError: (error) => handleActionError("validate", error)
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      await persistDraft({ silent: true });
      return runProviderScript(sourceId);
    },
    onSuccess: (data) => handleRunSuccess(data),
    onError: (error) => handleActionError("run", error)
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const saved = await persistDraft({ silent: true });
      queryClient.setQueryData(["provider-script", sourceId], saved);
      return publishProviderScript(sourceId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["provider-script", sourceId], data);
      setFeedback({ type: "publish", success: true, message: "Draft published." });
    },
    onError: (error) => handleActionError("publish", error)
  });

  const handleValidateSuccess = useCallback(
    (data: ProviderValidateResponse) => {
      setFeedback({
        type: "validate",
        success: data.ok,
        message: data.ok
          ? `Validation succeeded${data.latencyMs ? ` (${data.latencyMs} ms)` : ""}.`
          : "Validation completed with warnings.",
        logs: data.logs ?? [],
        latencyMs: data.latencyMs
      });
      logsQuery.refetch();
    },
    [logsQuery]
  );

  const handleRunSuccess = useCallback(
    (data: ProviderRunResponse) => {
      setFeedback({
        type: "run",
        success: data.ok,
        message: data.rowsPersisted !== undefined
          ? `Run completed (${data.rowsPersisted} rows persisted).`
          : "Run completed.",
        logs: data.logs ?? [],
        rowsPersisted: data.rowsPersisted,
        latencyMs: data.latencyMs
      });
      logsQuery.refetch();
    },
    [logsQuery]
  );

  const handleActionError = useCallback(
    (type: ActionFeedback["type"], error: unknown) => {
      const { message, logs } = extractError(error);
      setFeedback({ type, success: false, message, logs });
      logsQuery.refetch();
    },
    [logsQuery]
  );

  const actionsDisabled =
    isSaving || validateMutation.isPending || runMutation.isPending || publishMutation.isPending || scriptQuery.isLoading;

  const credentialSummary = detailQuery.data?.credentialSummary ?? [];
  const status = detailQuery.data?.status ?? "UNVERIFIED";

  const tabs = useMemo(
    () => [
      { key: "script" as const, label: "Script.ts" },
      { key: "readme" as const, label: "README.md" }
    ],
    []
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        {scriptQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Unable to load the current draft. Refresh the page to try again.
          </div>
        ) : null}
        <div className="overflow-hidden rounded-xl border">
          <div className="flex border-b bg-slate-50">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={cn(
                  "px-4 py-2 text-sm font-medium",
                  activeTab === tab.key
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="bg-background">
            <MonacoEditor
              height="480px"
              language={activeTab === "script" ? "typescript" : "markdown"}
              path={activeTab === "script" ? "Script.ts" : "README.md"}
              value={activeTab === "script" ? code : readme}
              onChange={(value) => {
                if (activeTab === "script") {
                  setCode(value ?? "");
                } else {
                  setReadme(value ?? "");
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true
              }}
            />
          </div>
        </div>

        {feedback ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              feedback.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {feedback.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>{feedback.message}</span>
                </div>
                {feedback.rowsPersisted !== undefined ? (
                  <p className="text-xs text-emerald-900">
                    Rows persisted: {feedback.rowsPersisted.toLocaleString()}
                  </p>
                ) : null}
                {feedback.latencyMs !== undefined ? (
                  <p className="text-xs text-muted-foreground">Latency: {feedback.latencyMs} ms</p>
                ) : null}
              </div>
              <button className="text-xs underline" onClick={() => setFeedback(null)}>
                Dismiss
              </button>
            </div>
            {feedback.logs && feedback.logs.length > 0 ? (
              <pre className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-slate-900/90 p-3 font-mono text-xs text-slate-100">
                {feedback.logs.join("\n")}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>

  <div className="space-y-4">
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Connection</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                status === "CONNECTED" && "bg-emerald-100 text-emerald-700",
                status === "ERROR" && "bg-red-100 text-red-700",
                status === "UNVERIFIED" && "bg-amber-100 text-amber-700"
              )}
            >
              {status}
            </span>
          </div>
          <Separator className="my-3" />
          {detailQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading details…</p>
          ) : detailQuery.isError ? (
            <p className="text-sm text-red-600">Unable to load source details.</p>
          ) : detailQuery.data ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Name:</span> {detailQuery.data.name ?? "—"}
              </div>
              <div>
                <span className="font-medium text-foreground">Type:</span> {detailQuery.data.type}
              </div>
              <div>
                <span className="font-medium text-foreground">Property:</span> {detailQuery.data.propertyName ?? "—"}
              </div>
              <div>
                <span className="font-medium text-foreground">Created:</span> {formatDateTime(detailQuery.data.createdAt)}
              </div>
            </div>
          ) : null}

          <Separator className="my-3" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credentials</h3>
          {credentialSummary.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No credential fields stored for this source.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {credentialSummary.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted-foreground"
                >
                  <span className="font-medium text-foreground">{item.key}</span>
                  <span>{item.present ? item.preview ?? "set" : "missing"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-foreground">Actions</h2>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => persistDraft()}
              disabled={actionsDisabled}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save draft
            </Button>
            <Button
              variant="outline"
              onClick={() => validateMutation.mutate()}
              disabled={actionsDisabled || validateMutation.isPending}
            >
              {validateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Validate
            </Button>
            <Button
              variant="outline"
              onClick={() => runMutation.mutate()}
              disabled={actionsDisabled || runMutation.isPending}
            >
              {runMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run
            </Button>
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={actionsDisabled || publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Logs</h2>
            <Button variant="ghost" size="sm" onClick={() => logsQuery.refetch()} disabled={logsQuery.isFetching}>
              {logsQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
          <Separator className="my-3" />
          {logsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading logs…</p>
          ) : logsQuery.isError ? (
            <p className="text-sm text-red-600">Unable to load logs.</p>
          ) : logsQuery.data && logsQuery.data.length > 0 ? (
            <ScrollArea className="max-h-[320px]">
              <div className="space-y-3 pr-2">
                {logsQuery.data.map((entry) => {
                  const parsed = parseLog(entry);
                  return (
                    <div key={entry.id} className="rounded-lg border px-3 py-2 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{entry.action}</span>
                        <span className={entry.ok ? "text-emerald-600" : "text-red-600"}>
                          {entry.ok ? "OK" : "Error"}
                        </span>
                      </div>
                      <div className="mt-1 text-muted-foreground">{formatDateTime(entry.createdAt)}</div>
                      {entry.error ? (
                        <div className="mt-2 text-red-600">{entry.error}</div>
                      ) : null}
                      {parsed.rowsPersisted !== undefined ? (
                        <div className="mt-1 text-muted-foreground">
                          Rows persisted: {parsed.rowsPersisted.toLocaleString()}
                        </div>
                      ) : null}
                      {parsed.logs.length > 0 ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-muted-foreground">Logs</summary>
                          <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-900/90 p-2 font-mono text-[11px] text-slate-100">
                            {parsed.logs.join("\n")}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">No logs recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
