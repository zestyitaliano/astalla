"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { SchemaColumn, SchemaGraph, SchemaTable } from "@shared/api";
import type {
  ProgramNode,
  RefNode,
  FunctionCallNode,
  WhereNode,
  LogicalNode,
  ComparisonNode,
  ValueNode,
} from "@shared/ast";

import { Button } from "@/components/ui/button";
import { DiagnosticsInline } from "./DiagnosticsInline";
import { ReferenceChip } from "@/components/references";
import { cn } from "@/lib/utils";
import { getDiagnostics } from "@/lib/references/diagnostics";
import { translateHumanToCanonical } from "@/lib/references/humanize";
import { logSuggestionAccepted } from "@/lib/references/telemetry";
import {
  useReferenceAutocomplete,
  type ReferenceAutocompleteSuggestion,
} from "@/lib/references/useReferenceAutocomplete";

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: (value: string) => void;
  isRunning?: boolean;
  schema: SchemaGraph;
  cursorContext?: {
    tableId?: string;
    editingFieldType?: "expr" | "filter" | "value";
  };
  className?: string;
}

interface ActiveRange {
  start: number;
  end: number;
}

interface ReferenceChipItem {
  id: string;
  label: string;
  kind: "table" | "column" | "function";
}

export function ExpressionEditor({
  value,
  onChange,
  onRun,
  isRunning = false,
  schema,
  cursorContext,
  className,
}: ExpressionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<number>(value.length);
  const activeRangeRef = useRef<ActiveRange | null>(null);

  const [activeRange, setActiveRange] = useState<ActiveRange | null>(null);
  const [pendingSelection, setPendingSelection] = useState<ActiveRange | null>(null);
  const [humanSuggestion, setHumanSuggestion] = useState<ReferenceAutocompleteSuggestion | null>(null);

  useEffect(() => {
    activeRangeRef.current = activeRange;
  }, [activeRange]);

  const tableIndex = useMemo(() => buildTableIndex(schema.tables), [schema.tables]);
  const columnIndex = useMemo(() => buildColumnIndex(schema.tables), [schema.tables]);

  const autocomplete = useReferenceAutocomplete({ editorText: value, cursorContext });

  const diagnosticsResult = useMemo(() => getDiagnostics(value, schema), [schema, value]);
  const diagnostics = diagnosticsResult.diagnostics;

  const chips = useMemo(
    () => collectReferenceChips(diagnosticsResult.ast, schema.tables),
    [diagnosticsResult.ast, schema.tables],
  );

  const ensureSelection = useCallback(() => {
    if (!textareaRef.current) {
      return;
    }
    selectionRef.current = textareaRef.current.selectionStart ?? value.length;
  }, [value.length]);

  const applyPendingSelection = useCallback(() => {
    if (!pendingSelection || !textareaRef.current) {
      return;
    }
    textareaRef.current.setSelectionRange(pendingSelection.start, pendingSelection.end);
    textareaRef.current.focus();
    setPendingSelection(null);
  }, [pendingSelection]);

  useEffect(() => {
    if (pendingSelection) {
      const id = requestAnimationFrame(applyPendingSelection);
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [applyPendingSelection, pendingSelection, value]);

  const tryTranslateHuman = useCallback(
    (input: string): ReferenceAutocompleteSuggestion | null => {
      const trimmed = input.trim();
      if (!trimmed) {
        return null;
      }
      if (/@/.test(trimmed)) {
        return null;
      }
      try {
        const canonical = translateHumanToCanonical(trimmed, schema);
        if (canonical && canonical !== trimmed) {
          return {
            id: "translation",
            label: canonical,
            description: "Convert phrase to canonical expression",
            kind: "translation",
            source: "static",
          } satisfies ReferenceAutocompleteSuggestion;
        }
      } catch {
        return null;
      }
      return null;
    },
    [schema],
  );

  const evaluateTriggers = useCallback(
    (input: string, caret: number) => {
      const beforeCursor = input.slice(0, caret);
      const match = beforeCursor.match(/@([A-Za-z0-9_.]*)$/);

      if (match) {
        const token = match[1] ?? "";
        const start = caret - token.length - 1;
        const nextRange: ActiveRange = { start, end: caret };
        setActiveRange(nextRange);
        setHumanSuggestion(null);
        autocomplete.openAt({ query: token });
        return;
      }

      const translation = tryTranslateHuman(input);
      if (translation) {
        const suggestionChanged = humanSuggestion?.label !== translation.label;
        setActiveRange({ start: 0, end: input.length });
        if (suggestionChanged || !autocomplete.isOpen) {
          setHumanSuggestion(translation);
          autocomplete.openAt({ staticSuggestions: [translation] });
        }
        return;
      }

      if (autocomplete.isOpen) {
        autocomplete.close();
      }
      setHumanSuggestion(null);
      setActiveRange(null);
    },
    [autocomplete, humanSuggestion?.label, tryTranslateHuman],
  );

  const handleValueChange = useCallback(
    (nextValue: string, caret: number) => {
      onChange(nextValue);
      selectionRef.current = caret;
      evaluateTriggers(nextValue, caret);
    },
    [evaluateTriggers, onChange],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.currentTarget.value;
      const caret = event.currentTarget.selectionStart ?? next.length;
      handleValueChange(next, caret);
    },
    [handleValueChange],
  );

  const applySuggestion = useCallback(
    (suggestion: ReferenceAutocompleteSuggestion) => {
      if (suggestion.id === "translation" || suggestion.kind === "translation") {
        logSuggestionAccepted("translation", null);
        const canonical = suggestion.label;
        onChange(canonical);
        setHumanSuggestion(null);
        setActiveRange(null);
        setPendingSelection({ start: canonical.length, end: canonical.length });
        return;
      }

      const canonical = getCanonicalFromSuggestion(suggestion, tableIndex, columnIndex);
      if (!canonical) {
        return;
      }

      const range = activeRangeRef.current ?? { start: value.length, end: value.length };
      const before = value.slice(0, range.start);
      const after = value.slice(range.end);
      const nextValue = `${before}${canonical}${after}`;
      const caret = range.start + canonical.length;

      logSuggestionAccepted(suggestion.kind ?? "unknown", null);
      onChange(nextValue);
      setPendingSelection({ start: caret, end: caret });
      setActiveRange({ start: range.start, end: caret });
      selectionRef.current = caret;
    },
    [columnIndex, onChange, tableIndex, value],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: ReferenceAutocompleteSuggestion) => {
      const accepted = autocomplete.onSelect(suggestion);
      applySuggestion(accepted);
    },
    [applySuggestion, autocomplete],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        onRun?.(value);
        return;
      }

      const accepted = autocomplete.onKeyDown(event);
      if (accepted) {
        applySuggestion(accepted);
      }
    },
    [applySuggestion, autocomplete, onRun, value],
  );

  useEffect(() => {
    const caret = Math.min(selectionRef.current, value.length);
    evaluateTriggers(value, caret);
  }, [evaluateTriggers, value]);

  useEffect(() => {
    ensureSelection();
  }, [ensureSelection]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Expression</h2>
          <p className="text-xs text-muted-foreground">Use @ to reference tables and columns</p>
        </div>
        {onRun ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onRun(value)}
            disabled={isRunning}
          >
            {isRunning ? "Running…" : "Run"}
          </Button>
        ) : null}
      </div>

      <div className="relative rounded-2xl border border-border/60 bg-card/60 p-3 pb-6">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onKeyUp={ensureSelection}
          onClick={ensureSelection}
          onBlur={ensureSelection}
          onFocus={ensureSelection}
          placeholder="sum(@Leases.Rent where @Leads.Source = 'Portal')"
          className="h-32 w-full resize-none rounded-xl border border-border/40 bg-background/70 px-3 py-2 font-mono text-sm text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        {autocomplete.isOpen && autocomplete.suggestions.length > 0 ? (
          <div className="absolute left-3 right-3 top-[calc(100%+0.5rem)] z-50 rounded-xl border border-border bg-card shadow-lg">
            <ul className="max-h-64 divide-y divide-border overflow-y-auto">
              {autocomplete.suggestions.map((suggestion, index) => {
                const isSelected = index === autocomplete.selectedIndex;
                return (
                  <li key={`${suggestion.source}-${suggestion.id}-${index}`}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-1 px-3 py-2 text-left text-sm",
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/40",
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <span className="font-medium">{suggestion.label}</span>
                      {suggestion.breadcrumb?.length ? (
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {suggestion.breadcrumb.join(" • ")}
                        </span>
                      ) : null}
                      {suggestion.description ? (
                        <span className="text-xs text-muted-foreground">{suggestion.description}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <ReferenceChip key={chip.id} label={chip.label} kind={chip.kind} />
          ))}
        </div>
      ) : null}

      <DiagnosticsInline value={value} diagnostics={diagnostics} onChange={onChange} className="rounded-2xl border border-border/60 bg-card/60 p-4" />
    </div>
  );
}

function buildTableIndex(tables: SchemaTable[]) {
  const byId = new Map<string, SchemaTable>();
  const byName = new Map<string, SchemaTable>();

  for (const table of tables) {
    byId.set(table.id, table);
    byName.set(table.name, table);
  }

  return { byId, byName };
}

function buildColumnIndex(tables: SchemaTable[]) {
  const byId = new Map<string, { table: SchemaTable; column: SchemaColumn }>();
  const byName = new Map<string, { table: SchemaTable; column: SchemaColumn }>();

  for (const table of tables) {
    for (const column of table.columns) {
      byId.set(column.id, { table, column });
      byName.set(`${table.name}.${column.name}`, { table, column });
    }
  }

  return { byId, byName };
}

function getCanonicalFromSuggestion(
  suggestion: ReferenceAutocompleteSuggestion,
  tableIndex: ReturnType<typeof buildTableIndex>,
  columnIndex: ReturnType<typeof buildColumnIndex>,
): string | null {
  if (suggestion.kind === "table") {
    const table = tableIndex.byId.get(suggestion.id);
    if (table) {
      return `@${table.name}`;
    }
  }

  if (suggestion.kind === "column") {
    const columnEntry = columnIndex.byId.get(suggestion.id);
    if (columnEntry) {
      return `@${columnEntry.table.name}.${columnEntry.column.name}`;
    }
  }

  if (suggestion.kind === "function") {
    return suggestion.label;
  }

  return suggestion.label.startsWith("@") ? suggestion.label : `@${suggestion.label}`;
}

function collectReferenceChips(ast: ProgramNode | undefined, tables: SchemaTable[]): ReferenceChipItem[] {
  if (!ast) {
    return [];
  }

  const tableByName = new Map<string, SchemaTable>();
  for (const table of tables) {
    tableByName.set(table.name, table);
  }

  const chips: ReferenceChipItem[] = [];
  const seen = new Set<string>();

  const fn = ast.body;
  if (fn) {
    const id = `fn:${fn.name}`;
    if (!seen.has(id)) {
      seen.add(id);
      chips.push({ id, label: fn.name, kind: "function" });
    }
  }

  const refs = collectRefs(ast);
  for (const ref of refs) {
    const tableName = ref.path[0]?.name;
    if (tableName) {
      const tableKey = `table:${tableName}`;
      if (!seen.has(tableKey)) {
        seen.add(tableKey);
        const table = tableByName.get(tableName);
        chips.push({ id: tableKey, label: table?.label ?? tableName, kind: "table" });
      }
    }

    const columnName = ref.path[1]?.name;
    if (tableName && columnName) {
      const columnKey = `column:${tableName}.${columnName}`;
      if (!seen.has(columnKey)) {
        seen.add(columnKey);
        chips.push({ id: columnKey, label: columnName, kind: "column" });
      }
    }
  }

  return chips;
}

function collectRefs(ast: ProgramNode): RefNode[] {
  const refs: RefNode[] = [];
  const stack: unknown[] = [ast];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") {
      continue;
    }

    const node = current as { type?: string };
    switch (node.type) {
      case "Program":
        stack.push((node as ProgramNode).body);
        break;
      case "FunctionCall": {
        const fn = node as FunctionCallNode;
        stack.push(fn.argument);
        if (fn.where) {
          stack.push(fn.where.condition);
        }
        break;
      }
      case "Where":
        stack.push((node as WhereNode).condition);
        break;
      case "Logical": {
        const logical = node as LogicalNode;
        stack.push(logical.left);
        stack.push(logical.right);
        break;
      }
      case "Comparison": {
        const comparison = node as ComparisonNode;
        stack.push(comparison.left);
        const right = comparison.right;
        if (Array.isArray(right)) {
          for (const item of right) {
            stack.push(item);
          }
        } else if (right) {
          stack.push(right);
        }
        break;
      }
      case "Ref":
        refs.push(node as RefNode);
        break;
      case "Value": {
        const valueNode = node as ValueNode;
        if (Array.isArray(valueNode.value)) {
          for (const item of valueNode.value) {
            stack.push(item);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  return refs;
}
