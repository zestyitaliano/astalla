"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorType, IDisposable } from "monaco-editor";
import type { FunctionName, ProgramNode, ConditionNode, ValueNode, RefNode } from "@shared/ast";
import type { SchemaForeignKey, SchemaGraph, SchemaTable } from "@shared/api";
import { AlertCircle, CheckCircle2, Play, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getDiagnostics, type ReferenceDiagnostic } from "@/lib/references/diagnostics";
import { translateHumanToCanonical } from "@/lib/references/humanize";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[260px] items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-sm text-muted-foreground">
      Loading editor…
    </div>
  )
});

type Monaco = typeof import("monaco-editor");

type SerializablePrimitive = string | number | boolean | null;
type SerializableLiteral = SerializablePrimitive | SerializablePrimitive[];
type SerializableValue = SerializablePrimitive;
type SerializableRow = Record<string, SerializableValue>;
type SerializableDataset = Record<string, ReadonlyArray<SerializableRow>>;

interface DevReferencesClientProps {
  schema: SchemaGraph;
  dataset: SerializableDataset;
}

interface AggregationSummary {
  functionName: FunctionName;
  table: string;
  column: string;
  value: number | null;
  rowCount: number;
}

interface AggregationOutcome {
  summary?: AggregationSummary;
  rows: SerializableRow[];
  columns: string[];
  error?: string;
}

interface RunResult {
  summary?: AggregationSummary;
  rows?: SerializableRow[];
  columns?: string[];
  error?: string;
  timestamp: number;
}

interface SchemaSummary {
  tableNames: string[];
  columnLookup: Map<string, { name: string; type: string }[]>;
}

interface EvaluationContext {
  baseTable: string;
  baseRow: SerializableRow;
  schema: SchemaGraph;
  dataset: SerializableDataset;
  foreignKeys: SchemaForeignKey[];
  cache: Map<string, SerializableRow | null>;
}

const DEFAULT_EXPRESSION = "sum(@Leases.Rent where @Leads.Source = 'Portal')";

const VISIBLE_COLUMNS: Record<string, string[]> = {
  Leases: ["Id", "Status", "Rent", "PropertyId", "StartDate", "EndDate"],
  Leads: ["Id", "Source", "Cost", "CreatedAt", "TourToLeaseRatio"],
  Properties: ["Id", "Name", "Region", "Units"],
  Applications: ["Id", "Status", "DecisionSeconds", "SubmittedAt"]
};

export function DevReferencesClient({ schema, dataset }: DevReferencesClientProps) {
  const [expression, setExpression] = useState<string>(DEFAULT_EXPRESSION);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [humanPhrase, setHumanPhrase] = useState("");
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationInfo, setTranslationInfo] = useState<string | null>(null);

  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const completionDisposableRef = useRef<IDisposable | null>(null);

  const schemaSummary = useMemo<SchemaSummary>(() => {
    const tableNames = schema.tables.map((table) => table.name).sort((a, b) => a.localeCompare(b));
    const columnLookup = new Map<string, { name: string; type: string }[]>();
    for (const table of schema.tables) {
      columnLookup.set(
        table.name,
        [...table.columns].map((column) => ({ name: column.name, type: column.type }))
      );
    }
    return { tableNames, columnLookup };
  }, [schema]);

  const foreignKeys = useMemo<SchemaForeignKey[]>(() => {
    const keys: SchemaForeignKey[] = [];
    for (const table of schema.tables) {
      for (const fk of table.fks ?? []) {
        keys.push(fk);
      }
    }
    return keys;
  }, [schema]);

  const diagnosticsResult = useMemo(() => getDiagnostics(expression, schema), [expression, schema]);
  const diagnostics = diagnosticsResult.diagnostics;
  const hasBlockingError = diagnostics.some((item) => item.severity === "error");

  useEffect(() => {
    if (!translationInfo) {
      return;
    }
    const timeout = window.setTimeout(() => setTranslationInfo(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [translationInfo]);

  const registerCompletionProvider = useCallback(
    (monaco: Monaco) => {
      completionDisposableRef.current?.dispose();
      completionDisposableRef.current = monaco.languages.registerCompletionItemProvider(
        "plaintext",
        createCompletionProvider(monaco, schemaSummary)
      );
    },
    [schemaSummary]
  );

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) {
      return;
    }
    registerCompletionProvider(monaco);
    return () => {
      completionDisposableRef.current?.dispose();
      completionDisposableRef.current = null;
    };
  }, [registerCompletionProvider]);

  const handleEditorDidMount = useCallback<OnMount>(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      registerCompletionProvider(monaco);
    },
    [registerCompletionProvider]
  );

  const handleRun = useCallback(() => {
    setIsRunning(true);
    window.requestAnimationFrame(() => {
      try {
        if (!diagnosticsResult.ast || hasBlockingError) {
          setRunResult({
            summary: undefined,
            rows: undefined,
            columns: undefined,
            error: hasBlockingError
              ? "Resolve the blocking diagnostics before running."
              : "Unable to parse the expression.",
            timestamp: Date.now()
          });
          return;
        }

        const outcome = evaluateAggregation(
          diagnosticsResult.ast,
          schema,
          dataset,
          foreignKeys,
          VISIBLE_COLUMNS
        );

        setRunResult({
          summary: outcome.summary,
          rows: outcome.rows,
          columns: outcome.columns,
          error: outcome.error,
          timestamp: Date.now()
        });
      } finally {
        setIsRunning(false);
      }
    });
  }, [dataset, diagnosticsResult.ast, foreignKeys, hasBlockingError, schema]);

  const handleApplyFix = useCallback(
    (fix: NonNullable<ReferenceDiagnostic["fix"]>) => {
      setExpression((prev) => {
        const next = fix.apply(prev);
        if (editorRef.current) {
          editorRef.current.setValue(next);
          editorRef.current.focus();
        }
        return next;
      });
    },
    []
  );

  const handleTranslate = useCallback(() => {
    setTranslationError(null);
    setTranslationInfo(null);
    const trimmed = humanPhrase.trim();
    if (!trimmed) {
      setTranslationError("Enter a phrase to translate.");
      return;
    }
    try {
      const canonical = translateHumanToCanonical(trimmed, schema);
      setExpression(canonical);
      if (editorRef.current) {
        editorRef.current.setValue(canonical);
        editorRef.current.focus();
      }
      setTranslationInfo("Translated to canonical and loaded into the editor.");
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : "Unable to translate phrase.");
    }
  }, [humanPhrase, schema]);

  useEffect(() => {
    return () => {
      completionDisposableRef.current?.dispose();
      completionDisposableRef.current = null;
      monacoRef.current = null;
      editorRef.current = null;
    };
  }, []);

  const lastRunLabel = useMemo(() => {
    if (!runResult?.timestamp) {
      return null;
    }
    try {
      return new Date(runResult.timestamp).toLocaleTimeString();
    } catch {
      return null;
    }
  }, [runResult?.timestamp]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Dev playground</p>
        <h1 className="text-3xl font-semibold text-text">Reference assistant demo</h1>
        <CardDescription className="max-w-3xl text-base text-muted-foreground">
          Experiment with canonical reference expressions, autocomplete, humanized translations, and diagnostics. This page uses
          the same schema featured in the quickstart guide so you can follow along step by step.
        </CardDescription>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_1fr]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Schema preview</CardTitle>
            <CardDescription>Tables and columns available for autocomplete in this sandbox.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[480px] pr-4">
              <div className="space-y-6">
                {schema.tables.map((table) => (
                  <SchemaTablePreview key={table.id} table={table} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>Expression editor</CardTitle>
              <CardDescription>
                Type canonical references with `@` autocomplete, or translate a human phrase and iterate with quick fixes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleRun} disabled={isRunning} className="gap-2">
                    <Play className="h-4 w-4" />
                    {isRunning ? "Running…" : "Run expression"}
                  </Button>
                  {lastRunLabel ? (
                    <span className="text-xs text-muted-foreground">Last run: {lastRunLabel}</span>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/60">
                  <MonacoEditor
                    height="260"
                    language="plaintext"
                    theme="vs-dark"
                    value={expression}
                    onChange={(value) => setExpression(value ?? "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      renderLineHighlight: "all",
                      automaticLayout: true
                    }}
                    onMount={handleEditorDidMount}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-text">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Translate a humanized prompt
                </div>
                <textarea
                  value={humanPhrase}
                  onChange={(event) => setHumanPhrase(event.target.value)}
                  placeholder="e.g. Average rent in Lakeside where the lease is active"
                  className="min-h-[96px] w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm text-text shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="secondary" className="gap-2" onClick={handleTranslate}>
                    <Wand2 className="h-4 w-4" />
                    Translate to canonical
                  </Button>
                  {translationInfo ? (
                    <span className="text-xs text-emerald-300">{translationInfo}</span>
                  ) : null}
                  {translationError ? (
                    <span className="text-xs text-destructive">{translationError}</span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-text">
                  {diagnostics.length === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                  )}
                  Diagnostics
                  <span className="text-xs font-normal text-muted-foreground">{diagnostics.length} issues</span>
                </div>
                {diagnostics.length === 0 ? (
                  <p className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-sm text-muted-foreground">
                    No diagnostics detected. Press Run to preview sample results.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {diagnostics.map((diagnostic, index) => (
                      <div
                        key={`${diagnostic.code}-${index}`}
                        className="rounded-2xl border border-border/60 bg-card/50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-text">{diagnostic.message}</p>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{diagnostic.code}</p>
                          </div>
                          {diagnostic.fix ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleApplyFix(diagnostic.fix!)}
                            >
                              <Wand2 className="h-4 w-4" />
                              {diagnostic.fix.label}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardTitle>Run results</CardTitle>
              <CardDescription>Execute the expression to preview aggregated output and sample rows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {runResult?.summary ? (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                  <p className="font-medium">
                    {runResult.summary.functionName.toUpperCase()}(@{runResult.summary.table}.{runResult.summary.column}) =
                    {" "}
                    {formatValue(runResult.summary.value)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-100">
                    Filtered rows: {runResult.summary.rowCount.toLocaleString("en-US")}
                  </p>
                </div>
              ) : runResult?.error ? (
                <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{runResult.error}</span>
                </div>
              ) : (
                <p className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-sm text-muted-foreground">
                  Click “Run expression” to calculate a result and preview sample rows.
                </p>
              )}

              {runResult?.rows && runResult.rows.length > 0 && runResult.columns ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text">Sample rows</h3>
                  <ScrollArea className="max-h-72 rounded-2xl border border-border/60">
                    <table className="min-w-full divide-y divide-border/60 text-sm">
                      <thead className="bg-card/80">
                        <tr>
                          {runResult.columns.map((column) => (
                            <th
                              key={column}
                              scope="col"
                              className="px-4 py-2 text-left font-medium uppercase tracking-wide text-muted-foreground"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 bg-background/60">
                        {runResult.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="odd:bg-background/60 even:bg-background/30">
                            {runResult.columns!.map((column) => (
                              <td key={column} className="px-4 py-2 font-mono text-xs text-text">
                                {formatValue(row[column])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function SchemaTablePreview({ table }: { table: SchemaTable }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text">{table.label ?? table.name}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">@{table.name}</p>
        </div>
        <span className="rounded-full bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          {table.columns.length} columns
        </span>
      </div>
      <Separator className="my-3" />
      <ul className="space-y-2">
        {table.columns.map((column) => (
          <li key={column.id} className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-text">@{table.name}.{column.name}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{column.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type CompletionProvider = Parameters<Monaco["languages"]["registerCompletionItemProvider"]>[1];

function createCompletionProvider(monaco: Monaco, summary: SchemaSummary): CompletionProvider {
  return {
    triggerCharacters: ["@", "."],
    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });

      const columnMatch = textUntilPosition.match(/@([A-Za-z0-9_]+)\.([A-Za-z0-9_]*)$/);
      if (columnMatch) {
        const [, tableName, partialColumn] = columnMatch;
        const columns = summary.columnLookup.get(tableName) ?? [];
        const range = new monaco.Range(
          position.lineNumber,
          position.column - (partialColumn?.length ?? 0),
          position.lineNumber,
          position.column
        );
        const suggestions = columns.map((column) => ({
          label: column.name,
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: column.name,
          range,
          detail: `Column • ${column.type}`,
          sortText: `1_${column.name}`
        }));
        return { suggestions };
      }

      const tableMatch = textUntilPosition.match(/@([A-Za-z0-9_]*)$/);
      if (tableMatch) {
        const [, partialTable] = tableMatch;
        const range = new monaco.Range(
          position.lineNumber,
          position.column - (partialTable?.length ?? 0),
          position.lineNumber,
          position.column
        );
        const suggestions = summary.tableNames.map((tableName) => ({
          label: tableName,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: tableName,
          range,
          detail: "Table",
          sortText: `0_${tableName}`
        }));
        return { suggestions };
      }

      return { suggestions: [] };
    }
  } satisfies CompletionProvider;
}

function evaluateAggregation(
  ast: ProgramNode,
  schema: SchemaGraph,
  dataset: SerializableDataset,
  foreignKeys: SchemaForeignKey[],
  visibleColumns: Record<string, string[]>
): AggregationOutcome {
  const fn = ast.body;
  if (fn.argument.type !== "Ref") {
    return {
      rows: [],
      columns: [],
      error: "The demo runner only supports aggregations over column references."
    };
  }

  const tableName = fn.argument.path[0]?.name;
  const columnName = fn.argument.path[1]?.name;

  if (!tableName || !columnName) {
    return { rows: [], columns: [], error: "Select a table and column before running." };
  }

  const baseRows = dataset[tableName] ?? [];
  const projectedRows: SerializableRow[] = [];
  const columnsToShow = visibleColumns[tableName] ?? [columnName];
  const numericValues: number[] = [];
  let rowCount = 0;

  for (const baseRow of baseRows) {
    const context: EvaluationContext = {
      baseTable: tableName,
      baseRow,
      schema,
      dataset,
      foreignKeys,
      cache: new Map([[tableName, baseRow]])
    };

    if (!matchesWhere(fn.where?.condition, context)) {
      continue;
    }

    rowCount += 1;
    projectedRows.push(projectRow(baseRow, columnsToShow));

    const value = baseRow[columnName];
    if (typeof value === "number") {
      numericValues.push(value);
    }
  }

  const summaryValue = aggregateValues(fn.name, numericValues, rowCount);

  return {
    summary: {
      functionName: fn.name,
      table: tableName,
      column: columnName,
      value: summaryValue,
      rowCount
    },
    rows: projectedRows.slice(0, 6),
    columns: columnsToShow,
    error: undefined
  };
}

function matchesWhere(condition: ConditionNode | undefined, context: EvaluationContext): boolean {
  if (!condition) {
    return true;
  }
  if (condition.type === "Logical") {
    const left = matchesWhere(condition.left, context);
    const right = matchesWhere(condition.right, context);
    return condition.operator === "and" ? left && right : left || right;
  }
  if (condition.type === "Comparison") {
    const left = toComparableValue(resolveValue(condition.left, context));
    const right = resolveComparisonRight(condition, context);
    switch (condition.operator) {
      case "=":
        return Array.isArray(right)
          ? right.some((value) => compareValues(left, value) === 0)
          : compareValues(left, right) === 0;
      case "!=":
        return Array.isArray(right)
          ? right.every((value) => compareValues(left, value) !== 0)
          : compareValues(left, right) !== 0;
      case ">":
        return typeof left === "number" && typeof right === "number" ? left > right : String(left) > String(right ?? "");
      case "<":
        return typeof left === "number" && typeof right === "number" ? left < right : String(left) < String(right ?? "");
      case "in":
        return Array.isArray(right) ? right.some((value) => compareValues(left, value) === 0) : false;
      case "between":
        if (Array.isArray(right) && right.length === 2) {
          const [start, end] = right;
          if (start == null || end == null) {
            return false;
          }
          if (typeof left === "number" && typeof start === "number" && typeof end === "number") {
            return left >= start && left <= end;
          }
          const leftStr = String(left);
          return leftStr >= String(start) && leftStr <= String(end);
        }
        return false;
      default:
        return false;
    }
  }
  return false;
}

function resolveComparisonRight(
  comparison: ConditionNode & { type: "Comparison" },
  context: EvaluationContext
): SerializableValue | SerializableValue[] | null {
  const right = comparison.right;
  if (Array.isArray(right)) {
    return right.map((node) => toComparableValue(resolveValue(node, context)));
  }
  if (right.type === "Ref") {
    return resolveReferenceValue(right, context);
  }
  return toComparableValue(normalizeLiteral(right.value));
}

function resolveValue(
  node: RefNode | ValueNode | ConditionNode,
  context: EvaluationContext
): SerializableLiteral | null {
  if (node.type === "Value") {
    return normalizeLiteral(node.value);
  }
  if (node.type === "Ref") {
    return resolveReferenceValue(node, context);
  }
  if (node.type === "Comparison" || node.type === "Logical") {
    return matchesWhere(node, context) ? 1 : 0;
  }
  return null;
}

function resolveReferenceValue(ref: RefNode, context: EvaluationContext): SerializableValue | null {
  const tableName = ref.path[0]?.name;
  const columnName = ref.path[1]?.name;
  if (!tableName || !columnName) {
    return null;
  }
  const row = resolveRow(tableName, context);
  if (!row) {
    return null;
  }
  const value = row[columnName];
  return typeof value === "number" || typeof value === "string" || typeof value === "boolean" ? value : value ?? null;
}

function resolveRow(tableName: string, context: EvaluationContext, stack: Set<string> = new Set()): SerializableRow | null {
  if (tableName === context.baseTable) {
    return context.baseRow;
  }
  if (context.cache.has(tableName)) {
    return context.cache.get(tableName) ?? null;
  }
  if (stack.has(tableName)) {
    return null;
  }
  stack.add(tableName);

  const knownEntries = [...context.cache.entries(), [context.baseTable, context.baseRow] as const];

  for (const [knownTable, knownRow] of knownEntries) {
    if (!knownRow) continue;
    for (const fk of context.foreignKeys) {
      if (fk.fromTable === knownTable && fk.toTable === tableName) {
        const sourceValue = knownRow[fk.fromCol];
        const candidate = findRowByColumn(context.dataset[tableName] ?? [], fk.toCol, sourceValue);
        if (candidate) {
          context.cache.set(tableName, candidate);
          return candidate;
        }
      }
      if (fk.toTable === knownTable && fk.fromTable === tableName) {
        const targetValue = knownRow[fk.toCol];
        const candidate = findRowByColumn(context.dataset[tableName] ?? [], fk.fromCol, targetValue);
        if (candidate) {
          context.cache.set(tableName, candidate);
          return candidate;
        }
      }
    }
  }

  for (const fk of context.foreignKeys) {
    if (fk.fromTable === tableName) {
      const parentRow = resolveRow(fk.toTable, context, stack);
      if (parentRow) {
        const candidate = findRowByColumn(context.dataset[tableName] ?? [], fk.fromCol, parentRow[fk.toCol]);
        if (candidate) {
          context.cache.set(tableName, candidate);
          return candidate;
        }
      }
    }
    if (fk.toTable === tableName) {
      const childRow = resolveRow(fk.fromTable, context, stack);
      if (childRow) {
        const candidate = findRowByColumn(context.dataset[tableName] ?? [], fk.toCol, childRow[fk.fromCol]);
        if (candidate) {
          context.cache.set(tableName, candidate);
          return candidate;
        }
      }
    }
  }

  context.cache.set(tableName, null);
  return null;
}

function findRowByColumn(rows: ReadonlyArray<SerializableRow>, column: string, value: unknown) {
  return rows.find((row) => row[column] === value) ?? null;
}

function toComparableValue(value: SerializableLiteral | null): SerializableValue {
  if (Array.isArray(value)) {
    return value.length > 0 ? (value[0] ?? null) : null;
  }
  return value;
}

function normalizeLiteral(value: SerializableLiteral): SerializableLiteral {
  if (Array.isArray(value)) {
    return value.map((item) => (item ?? null)) as SerializablePrimitive[];
  }
  return value ?? null;
}

function projectRow(row: SerializableRow, columns: string[]): SerializableRow {
  const projected: SerializableRow = {};
  for (const column of columns) {
    projected[column] = column in row ? row[column] ?? null : null;
  }
  return projected;
}

function aggregateValues(fn: FunctionName, values: number[], rowCount: number): number | null {
  if (fn === "count") {
    return rowCount;
  }
  if (values.length === 0) {
    return null;
  }
  switch (fn) {
    case "sum":
      return values.reduce((total, value) => total + value, 0);
    case "avg":
      return values.reduce((total, value) => total + value, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    default:
      return null;
  }
}

function compareValues(left: SerializableValue | null, right: SerializableValue | null): number {
  if (left === right) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left === right ? 0 : left > right ? 1 : -1;
  }
  const leftStr = String(left).toLowerCase();
  const rightStr = String(right).toLowerCase();
  return leftStr === rightStr ? 0 : leftStr > rightStr ? 1 : -1;
}

function formatValue(value: SerializableValue | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString("en-US")
      : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}
