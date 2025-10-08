"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CREATION_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 1_500;
const MAX_POLL_ATTEMPTS = 10;

type TablesCreateModalProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  onCreated?(tableId: string): void;
};

type OperationStatus = {
  status: "pending" | "done" | "error" | string;
  result?: { tableId?: string } | null;
  error?: string | null;
};

export function TablesCreateModal({ open, onOpenChange, onCreated }: TablesCreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      clearPendingAbort();
      setIsSubmitting(false);
      setName("");
      setDescription("");
      setToastMessage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = setTimeout(() => setToastMessage(null), 4_000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const resetState = () => {
    clearPendingAbort();
    setIsSubmitting(false);
    setName("");
    setDescription("");
    setToastMessage(null);
  };

  const clearPendingAbort = (reason: "cleanup" | "cancelled" = "cleanup") => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(reason);
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  const handleCancel = () => {
    clearPendingAbort("cancelled");
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      showToast("Table name is required");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort("timeout"), CREATION_TIMEOUT_MS);
    timeoutRef.current = timeoutId;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription ? trimmedDescription : undefined
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create table");
      }

      const { tableId, opId } = (await response.json()) as {
        tableId?: string;
        opId: string;
      };

      if (!opId) {
        throw new Error("Operation id missing from response");
      }

      const finalTableId = tableId ?? (await pollForCompletion(opId, controller));

      if (!finalTableId) {
        throw new Error("Operation completed without a table id");
      }

      await queryClient.invalidateQueries({ queryKey: ["tables"] });
      onCreated?.(finalTableId);
      onOpenChange(false);
      resetState();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        const reason = controller.signal.reason;
        if (reason === "timeout") {
          showToast("Table creation timed out. Please try again.");
        }
        return;
      }

      const message = error instanceof Error ? error.message : "Failed to create table";
      showToast(message);
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      abortControllerRef.current = null;
      setIsSubmitting(false);
    }
  };

  const pollForCompletion = async (opId: string, controller: AbortController) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      if (controller.signal.aborted) {
        throw new DOMException("Operation aborted", "AbortError");
      }

      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      const response = await fetch(`/api/ops/${opId}`, { signal: controller.signal });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to fetch operation status");
      }

      const data = (await response.json()) as OperationStatus;

      if (data.status === "done") {
        return data.result?.tableId ?? null;
      }

      if (data.status === "error") {
        throw new Error(data.error || "Table creation failed");
      }
    }

    throw new Error("Timed out waiting for table creation");
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card/95 p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Create table</h3>
            <p className="text-sm text-muted-foreground">Name your table and add an optional description.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="table-name">
                Name
              </label>
              <Input
                id="table-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Leasing pipeline"
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="table-description">
                Description
              </label>
              <Input
                id="table-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="How your team will use this table"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting} className="gap-2">
              {isSubmitting ? (
                "Creating…"
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Create
                </>
              )}
            </Button>
          </div>
        </form>
        {toastMessage ? (
          <div className="pointer-events-none absolute right-6 top-6 max-w-xs rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {toastMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
