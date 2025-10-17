"use client";

import { useCallback, useMemo, useState } from "react";
import type { SchemaGraph } from "@shared/api";

import { ExpressionEditor } from "@/components/editor/ExpressionEditor";
import { ReferenceChip } from "@/components/references";
import { buildApiUrl } from "@/lib/env";
import { getDiagnostics } from "@/lib/references/diagnostics";

interface DevReferencesClientProps {
  schema: SchemaGraph;
}

interface ExecutionResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}

const DEFAULT_EXPRESSION = "sum(@Leases.Rent where @Leads.Source = 'Portal')";

export function DevReferencesClient({ schema }: DevReferencesClientProps) {
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const diagnosticsResult = useMemo(() => getDiagnostics(expression, schema), [expression, schema]);
  const hasBlockingDiagnostic = diagnosticsResult.diagnostics.some((item) => item.severity === "error");

  const handleRun = useCallback(
    async (currentValue: string) => {
      setIsRunning(true);
      setError(null);

      try {
        const { diagnostics, ast } = getDiagnostics(currentValue, schema);
        const blocking = diagnostics.some((item) => item.severity === "error");
        if (!ast || blocking) {
          setError("Resolve blocking diagnostics before running.");
          setResult(null);
          return;
        }

        const response = await fetch(buildApiUrl("/api/references/execute"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ast }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError((payload as any)?.message ?? "Unable to execute expression.");
          setResult(null);
          return;
        }

        const payload = await response.json();
        setResult({
          rows: Array.isArray(payload.rows) ? payload.rows : [],
          columns: Array.isArray(payload.columns) ? payload.columns : [],
          rowCount: typeof payload.rowCount === "number" ? payload.rowCount : 0,
        });
      } catch (runError) {
        setError(runError instanceof Error ? runError.message : "Failed to execute expression.");
        setResult(null);
      } finally {
        setIsRunning(false);
      }
    },
    [schema],
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-4 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Dev playground</p>
        <h1 className="text-3xl font-semibold text-foreground">Reference expression editor</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Experiment with canonical expressions, inline diagnostics, autocomplete, and quick fixes.
        </p>
      </header>

      <section className="space-y-6">
        <ExpressionEditor
          value={expression}
          onChange={setExpression}
          onRun={handleRun}
          isRunning={isRunning}
          schema={schema}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Execution</h2>
            <p className="text-xs text-muted-foreground">Submit the expression to the reference API.</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {hasBlockingDiagnostic ? "Diagnostics blocking run" : "Ready"}
          </span>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : result ? (
          <div className="space-y-4 text-sm">
            <p className="rounded-xl border border-border/60 bg-background/60 px-4 py-2">
              Row count: <span className="font-semibold text-foreground">{result.rowCount.toLocaleString()}</span>
            </p>
            {result.columns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/60 text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      {result.columns.map((column) => (
                        <th key={column} className="px-3 py-2 font-medium uppercase tracking-wide">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 bg-background/70">
                    {result.rows.slice(0, 10).map((row, rowIndex) => (
                      <tr key={rowIndex} className="odd:bg-background/60 even:bg-background/40">
                        {result.columns.map((column) => (
                          <td key={column} className="px-3 py-2 font-mono text-[11px] text-foreground">
                            {formatCellValue(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows.length > 10 ? (
                  <p className="mt-2 text-right text-[11px] text-muted-foreground">Showing first 10 rows</p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No rows returned.</p>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            Press Run to execute the expression with the seeded demo schema.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Schema preview</h2>
        <div className="flex flex-wrap gap-2">
          {schema.tables.map((table) => (
            <ReferenceChip key={table.id} label={table.label ?? table.name} kind="table" />
          ))}
        </div>
      </section>
    </main>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}
