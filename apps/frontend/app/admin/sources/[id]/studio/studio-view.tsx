"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Play,
  Save,
  UploadCloud
} from "lucide-react";
import type { editor as MonacoEditorType } from "monaco-editor";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ApiError,
  getProviderScript,
  getSourceDetail,
  listProviderLogs,
  publishProviderScript,
  runProviderScript,
  saveProviderScript,
  validateProviderScript,
  type ProviderLogPage
} from "@/lib/api/sources";
import { cn } from "@/lib/utils";
import type {
  ProviderRunResponse,
  ProviderScriptResponse,
  ProviderValidateResponse,
  SourceActionLogEntry
} from "@shared/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
      Loading editor…
    </div>
  )
});

type TabKey = "script" | "readme";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type ToastLevel = "success" | "error";

interface ToastMessage {
  id: number;
  type: ToastLevel;
  title: string;
  description?: string;
}

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

function formatDuration(value?: number | null) {
  if (typeof value !== "number") {
    return "—";
  }
  return `${value} ms`;
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseLog(entry: SourceActionLogEntry) {
  const response = entry.response && typeof entry.response === "object" ? (entry.response as Record<string, unknown>) : null;
  const logs = response && Array.isArray(response.logs) ? (response.logs as unknown[]).map((item) => String(item)) : [];
  const rows = response && typeof response.rowsPersisted === "number" ? (response.rowsPersisted as number) : undefined;
  return { logs, rowsPersisted: rows };
}

function formatSavedTimestamp(value: Date | null) {
  if (!value) return "";
  try {
    return value.toLocaleTimeString();
  } catch {
    return value.toISOString();
  }
}

export function SourceStudioView({ sourceId }: SourceStudioViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("script");
  const [code, setCode] = useState("");
  const [readme, setReadme] = useState("");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedDraft, setLastSavedDraft] = useState<{ code: string; readme: string }>({ code: "", readme: "" });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toastTimeoutsRef = useRef<Record<number, number>>({});
  const persistDraftRef = useRef<
    ((options?: { silent?: boolean; force?: boolean }) => Promise<ProviderScriptResponse | undefined>) | null
  >(null);
  const editorBlurDisposableRef = useRef<MonacoEditorType.IDisposable | null>(null);

  const scriptQuery = useQuery({
    queryKey: ["provider-script", sourceId],
    queryFn: () => getProviderScript(sourceId)
  });

  const detailQuery = useQuery({
    queryKey: ["source-detail", sourceId],
    queryFn: () => getSourceDetail(sourceId)
  });

  const logsQuery = useInfiniteQuery({
    queryKey: ["provider-logs", sourceId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam?: string }) => listProviderLogs(sourceId, pageParam),
    getNextPageParam: (lastPage: ProviderLogPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: 15_000
  });

  useEffect(() => {
    if (!scriptQuery.data) {
      return;
    }
    const initialCode = scriptQuery.data.code ?? "";
    const initialReadme = scriptQuery.data.readme ?? "";
    setCode(initialCode);
    setReadme(initialReadme);
    setLastSavedDraft({ code: initialCode, readme: initialReadme });
    setLastSavedAt(new Date());
    setSaveStatus("saved");
  }, [scriptQuery.data]);

  const dismissToast = useCallback((id: number) => {
    const timeoutId = toastTimeoutsRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete toastTimeoutsRef.current[id];
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      if (typeof window === "undefined") {
        return;
      }
      const id = Date.now() + Math.floor(Math.random() * 10_000);
      setToasts((prev) => [...prev, { ...toast, id }]);
      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, 4_000);
      toastTimeoutsRef.current[id] = timeoutId;
    },
    [dismissToast]
  );

  useEffect(() => {
    const timeoutsSnapshot = toastTimeoutsRef.current;
    return () => {
      Object.values(timeoutsSnapshot).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const isDirty = useMemo(
    () => code !== lastSavedDraft.code || readme !== lastSavedDraft.readme,
    [code, readme, lastSavedDraft]
  );

  useEffect(() => {
    if (isDirty && saveStatus !== "saving") {
      setSaveStatus("idle");
    }
  }, [isDirty, saveStatus]);

  const persistDraft = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      if (!options?.force && !isDirty) {
        if (!options?.silent) {
          showToast({ type: "success", title: "Draft is already saved." });
        }
        return queryClient.getQueryData(["provider-script", sourceId]) as ProviderScriptResponse | undefined;
      }

      setSaveStatus("saving");
      try {
        const saved = await saveProviderScript(sourceId, { code, readme });
        queryClient.setQueryData(["provider-script", sourceId], saved);
        setLastSavedDraft({ code: saved.code ?? "", readme: saved.readme ?? "" });
        setLastSavedAt(new Date());
        setSaveStatus("saved");
        if (!options?.silent) {
          showToast({ type: "success", title: "Draft saved." });
        }
        return saved;
      } catch (error) {
        setSaveStatus("error");
        const { message } = extractError(error);
        if (!options?.silent) {
          showToast({ type: "error", title: "Failed to save draft", description: message });
        }
        throw error;
      }
    },
    [code, readme, isDirty, queryClient, showToast, sourceId]
  );

  useEffect(() => {
    persistDraftRef.current = persistDraft;
  }, [persistDraft]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      persistDraftRef.current?.({ silent: true }).catch(() => {
        // Errors handled inside persistDraft.
      });
    }, 5_000);
    return () => window.clearTimeout(timeoutId);
  }, [code, readme, isDirty]);

  useEffect(() => {
    return () => {
      editorBlurDisposableRef.current?.dispose();
    };
  }, []);

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
      showToast({ type: data.ok ? "success" : "error", title: data.ok ? "Validation succeeded" : "Validation completed" });
      logsQuery.refetch();
    },
    [logsQuery, showToast]
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
      showToast({ type: data.ok ? "success" : "error", title: data.ok ? "Run completed" : "Run finished with errors" });
      logsQuery.refetch();
    },
    [logsQuery, showToast]
  );

  const handleActionError = useCallback(
    (type: ActionFeedback["type"], error: unknown) => {
      const { message, logs } = extractError(error);
      setFeedback({ type, success: false, message, logs });
      showToast({ type: "error", title: "Action failed", description: message });
      logsQuery.refetch();
    },
    [logsQuery, showToast]
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
      if (saved) {
        queryClient.setQueryData(["provider-script", sourceId], saved);
      }
      return publishProviderScript(sourceId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["provider-script", sourceId], data);
      setLastSavedDraft({ code: data.code ?? "", readme: data.readme ?? "" });
      setLastSavedAt(new Date());
      setSaveStatus("saved");
      setFeedback({ type: "publish", success: true, message: "Draft published." });
      showToast({ type: "success", title: "Draft published" });
    },
    onError: (error) => handleActionError("publish", error)
  });

  const actionsDisabled =
    saveStatus === "saving" ||
    validateMutation.isPending ||
    runMutation.isPending ||
    publishMutation.isPending ||
    scriptQuery.isLoading;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "s") {
        event.preventDefault();
        persistDraftRef.current?.({ force: true }).catch(() => {});
      } else if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (!actionsDisabled) {
          runMutation.mutate();
        }
      } else if (event.altKey && key === "v") {
        event.preventDefault();
        if (!actionsDisabled) {
          validateMutation.mutate();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actionsDisabled, runMutation, validateMutation]);

  const handleEditorMount = useCallback((editorInstance: MonacoEditorType.IStandaloneCodeEditor) => {
    editorBlurDisposableRef.current?.dispose();
    editorBlurDisposableRef.current = editorInstance.onDidBlurEditorText(() => {
      persistDraftRef.current?.({ silent: true }).catch(() => {});
    });
  }, []);

  const scriptStatus = scriptQuery.data?.status ?? "DRAFT";
  const credentialSummary = detailQuery.data?.credentialSummary ?? [];
  const status = detailQuery.data?.status ?? "UNVERIFIED";

  const tabs = useMemo(
    () => [
      { key: "script" as const, label: "Script.ts" },
      { key: "readme" as const, label: "README.md" }
    ],
    []
  );

  const logs = logsQuery.data?.pages.flatMap((page) => page.entries) ?? [];

  const saveStatusLabel = (() => {
    if (saveStatus === "saving") {
      return "Saving…";
    }
    if (saveStatus === "error") {
      return "Save failed";
    }
    if (isDirty) {
      return "Unsaved changes";
    }
    return lastSavedAt ? `Saved ${formatSavedTimestamp(lastSavedAt)}` : "Saved";
  })();

  const saveStatusTone = (() => {
    if (saveStatus === "error") {
      return "text-red-600";
    }
    if (saveStatus === "saving" || isDirty) {
      return "text-amber-600";
    }
    return "text-emerald-600";
  })();
  const handleCopySuccess = useCallback(
    (section: "request" | "response") => {
      showToast({
        type: "success",
        title: section === "request" ? "Request copied" : "Response copied"
      });
    },
    [showToast]
  );

  const handleCopyError = useCallback(() => {
    showToast({ type: "error", title: "Unable to copy", description: "Clipboard permissions denied." });
  }, [showToast]);

  return (
    <>
      <div className="pointer-events-none fixed right-6 top-6 z-50 flex w-72 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg",
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="text-xs leading-snug text-muted-foreground">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-xs font-medium text-muted-foreground underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          {scriptQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Unable to load the current draft. Refresh the page to try again.
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border">
            <div className="flex flex-col gap-3 border-b bg-slate-50/60 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {scriptStatus === "PUBLISHED" ? "Published" : "Draft"}
                </span>
                {scriptQuery.data?.version !== undefined ? (
                  <span className="text-muted-foreground">Version {scriptQuery.data.version}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                <span className={cn("flex items-center gap-2 text-xs font-medium", saveStatusTone)}>
                  <span className="inline-flex h-2 w-2 rounded-full bg-current" />
                  {saveStatusLabel}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => persistDraft({ force: true })}
                    disabled={saveStatus === "saving"}
                  >
                    {saveStatus === "saving" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => validateMutation.mutate()}
                    disabled={actionsDisabled}
                  >
                    {validateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Validate
                  </Button>
                  <Button size="sm" onClick={() => runMutation.mutate()} disabled={actionsDisabled}>
                    {runMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Run
                  </Button>
                  <Button
                    variant={scriptStatus === "PUBLISHED" ? "secondary" : "default"}
                    size="sm"
                    onClick={() => publishMutation.mutate()}
                    disabled={actionsDisabled}
                  >
                    {publishMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="mr-2 h-4 w-4" />
                    )}
                    {scriptStatus === "PUBLISHED" ? "Published" : "Publish"}
                  </Button>
                </div>
              </div>
            </div>

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
                onMount={handleEditorMount}
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
                      <Check className="h-4 w-4" />
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

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Run history</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logsQuery.refetch()}
                disabled={logsQuery.isFetching}
              >
                {logsQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Refresh
              </Button>
            </div>
            <Separator className="my-3" />
            {logsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading history…</p>
            ) : logsQuery.isError ? (
              <p className="text-sm text-red-600">Unable to load run history.</p>
            ) : logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((entry) => (
                  <RunHistoryItem
                    key={entry.id}
                    entry={entry}
                    onCopySuccess={handleCopySuccess}
                    onCopyError={handleCopyError}
                  />
                ))}
                {logsQuery.hasNextPage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logsQuery.fetchNextPage()}
                    disabled={logsQuery.isFetchingNextPage}
                  >
                    {logsQuery.isFetchingNextPage ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Load more
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
            )}
          </div>

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
        </aside>
      </div>
    </>
  );
}

interface RunHistoryItemProps {
  entry: SourceActionLogEntry;
  onCopySuccess: (section: "request" | "response") => void;
  onCopyError: () => void;
}

function RunHistoryItem({ entry, onCopyError, onCopySuccess }: RunHistoryItemProps) {
  const [open, setOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState<"request" | "response" | null>(null);

  const { logs, rowsPersisted } = parseLog(entry);
  const requestJson = entry.request ? formatJson(entry.request) : null;
  const responseJson = entry.response ? formatJson(entry.response) : null;

  useEffect(() => {
    if (!copiedSection) {
      return;
    }
    const timeoutId = window.setTimeout(() => setCopiedSection(null), 2_000);
    return () => window.clearTimeout(timeoutId);
  }, [copiedSection]);

  const handleCopy = useCallback(
    async (payload: string, section: "request" | "response") => {
      try {
        await navigator.clipboard.writeText(payload);
        setCopiedSection(section);
        onCopySuccess(section);
      } catch {
        onCopyError();
      }
    },
    [onCopyError, onCopySuccess]
  );

  const latencyFromResponse =
    typeof entry.response === "object" && entry.response && "latencyMs" in entry.response
      ? Number((entry.response as Record<string, unknown>).latencyMs)
      : undefined;

  const duration = entry.latencyMs ?? latencyFromResponse ?? null;

  return (
    <div className="rounded-lg border px-3 py-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <span className="uppercase tracking-wide text-muted-foreground">{entry.action}</span>
            <span className={entry.ok ? "text-emerald-600" : "text-red-600"}>{entry.ok ? "OK" : "Error"}</span>
          </div>
          <div className="text-muted-foreground">{formatDateTime(entry.createdAt)}</div>
          <div className="text-muted-foreground">Duration: {formatDuration(duration)}</div>
          {rowsPersisted !== undefined ? (
            <div className="text-muted-foreground">Rows persisted: {rowsPersisted.toLocaleString()}</div>
          ) : null}
          {entry.error ? <div className="text-red-600">{entry.error}</div> : null}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen((value) => !value)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          {requestJson ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Request</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-[11px]"
                  onClick={() => handleCopy(requestJson, "request")}
                >
                  {copiedSection === "request" ? (
                    <>
                      <Check className="mr-1 h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-slate-900/90 p-2 font-mono text-[11px] text-slate-100">
                {requestJson}
              </pre>
            </div>
          ) : null}

          {responseJson ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Response</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-[11px]"
                  onClick={() => handleCopy(responseJson, "response")}
                >
                  {copiedSection === "response" ? (
                    <>
                      <Check className="mr-1 h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-slate-900/90 p-2 font-mono text-[11px] text-slate-100">
                {responseJson}
              </pre>
            </div>
          ) : null}

          {logs.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Logs</p>
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-900/90 p-2 font-mono text-[11px] text-slate-100">
                {logs.join("\n")}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
