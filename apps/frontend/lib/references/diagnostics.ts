import type {
  ProgramNode,
  RefNode,
  ValueNode,
  ComparisonNode,
  LogicalNode,
  ConditionNode,
  WhereNode,
  SourceRange,
  FunctionCallNode,
  FunctionName,
} from "@shared/ast";
import type { SchemaGraph, SchemaTable, SchemaColumn, SchemaForeignKey } from "@shared/api";

import { parseExpression, ParseError } from "./parser";

export type DiagnosticCode =
  | "unknown_table"
  | "unknown_column"
  | "type_mismatch"
  | "missing_join"
  | "bad_date"
  | "invalid_date"
  | "unbalanced_parentheses"
  | "syntax_error";

export interface DiagnosticFix {
  label: string;
  apply: (source: string) => string;
}

export interface ReferenceDiagnostic {
  code: DiagnosticCode;
  message: string;
  range: SourceRange;
  severity: "error" | "warning";
  fix?: DiagnosticFix;
}

export interface DiagnosticResult {
  diagnostics: ReferenceDiagnostic[];
  ast?: ProgramNode;
}

export function getDiagnostics(expression: string, schema: SchemaGraph): DiagnosticResult {
  try {
    const ast = parseExpression(expression);
    const index = buildSchemaIndex(schema);
    const diagnostics: ReferenceDiagnostic[] = [];

    diagnostics.push(...detectUnknownReferences(expression, ast, index));
    diagnostics.push(...detectTypeMismatches(expression, ast, index));
    diagnostics.push(...detectMissingJoins(expression, ast, index));
    diagnostics.push(...detectDateIssues(expression, ast, index));

    return { diagnostics, ast };
  } catch (error) {
    if (error instanceof ParseError) {
      return { diagnostics: [diagnosticFromParseError(error, expression)], ast: undefined };
    }
    throw error;
  }
}

interface SchemaIndex {
  tables: Map<string, SchemaTable>;
  normalizedTables: Map<string, SchemaTable>;
  columns: Map<string, Map<string, SchemaColumn>>;
  normalizedColumns: Map<string, Map<string, SchemaColumn>>;
  foreignKeys: SchemaForeignKey[];
}

function buildSchemaIndex(schema: SchemaGraph): SchemaIndex {
  const tables = new Map<string, SchemaTable>();
  const normalizedTables = new Map<string, SchemaTable>();
  const columns = new Map<string, Map<string, SchemaColumn>>();
  const normalizedColumns = new Map<string, Map<string, SchemaColumn>>();
  const foreignKeys: SchemaForeignKey[] = [];

  for (const table of schema.tables) {
    tables.set(table.name, table);
    normalizedTables.set(table.name.toLowerCase(), table);

    const tableColumns = new Map<string, SchemaColumn>();
    const normalizedTableColumns = new Map<string, SchemaColumn>();
    for (const column of table.columns) {
      tableColumns.set(column.name, column);
      normalizedTableColumns.set(column.name.toLowerCase(), column);
    }
    columns.set(table.name, tableColumns);
    normalizedColumns.set(table.name.toLowerCase(), normalizedTableColumns);

    for (const fk of table.fks ?? []) {
      foreignKeys.push(fk);
    }
  }

  return { tables, normalizedTables, columns, normalizedColumns, foreignKeys };
}

function detectUnknownReferences(
  expression: string,
  ast: ProgramNode,
  index: SchemaIndex,
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = [];
  const refs = collectRefs(ast);

  for (const ref of refs) {
    const tableIdentifier = ref.path[0];
    if (!tableIdentifier) {
      continue;
    }

    const tableName = tableIdentifier.name;
    const table = resolveTable(index, tableName);
    if (!table) {
      const suggestion = findClosestMatch(tableName, index.tables.keys());
      const fix = suggestion
        ? createReplacementFix(tableIdentifier.range, suggestion, `Use "${suggestion}"`)
        : undefined;

      diagnostics.push({
        code: "unknown_table",
        message: `Unknown table "${tableName}".`,
        range: ensureRange(tableIdentifier.range ?? ref.range, expression.length),
        severity: "error",
        fix,
      });
      continue;
    }

    const columnName = getColumnName(ref);
    if (!columnName) {
      continue;
    }

    const column = resolveColumn(index, table.name, columnName);
    if (!column) {
      const columnRange = getColumnRange(ref);
      const columns = index.columns.get(table.name) ?? new Map<string, SchemaColumn>();
      const suggestion = findClosestMatch(columnName, columns.keys());
      const fix = suggestion
        ? createReplacementFix(columnRange, suggestion, `Use "${suggestion}"`)
        : undefined;

      diagnostics.push({
        code: "unknown_column",
        message: `Unknown column "${columnName}" on table "${table.name}".`,
        range: ensureRange(columnRange ?? ref.range, expression.length),
        severity: "error",
        fix,
      });
    }
  }

  return diagnostics;
}

function detectTypeMismatches(
  expression: string,
  ast: ProgramNode,
  index: SchemaIndex,
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = [];
  const fn = ast.body;

  if (fn.argument.type !== "Ref") {
    return diagnostics;
  }

  const ref = fn.argument;
  const tableName = ref.path[0]?.name;
  if (!tableName) {
    return diagnostics;
  }

  const table = resolveTable(index, tableName);
  if (!table) {
    return diagnostics;
  }

  const columnName = getColumnName(ref);
  if (!columnName) {
    return diagnostics;
  }

  const column = resolveColumn(index, table.name, columnName);
  if (!column) {
    return diagnostics;
  }

  const allowedAggregations = aggregationsForColumnType(column.type);
  if (allowedAggregations.includes(fn.name)) {
    return diagnostics;
  }

  const suggestion = preferredAggregation(column.type, allowedAggregations);
  const fix = suggestion
    ? createReplacementFix(fn.nameRange, suggestion, `Use ${suggestion}`)
    : undefined;

  diagnostics.push({
    code: "type_mismatch",
    message: `Function ${fn.name} is incompatible with ${column.type} column "${column.name}".`,
    range: ensureRange(fn.nameRange ?? fn.range, expression.length),
    severity: "error",
    fix,
  });

  return diagnostics;
}

function detectMissingJoins(
  expression: string,
  ast: ProgramNode,
  index: SchemaIndex,
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = [];
  const fn = ast.body;

  if (fn.argument.type !== "Ref") {
    return diagnostics;
  }

  const baseTableName = fn.argument.path[0]?.name;
  if (!baseTableName) {
    return diagnostics;
  }

  const baseTable = resolveTable(index, baseTableName);
  if (!baseTable || !fn.where) {
    return diagnostics;
  }

  const referencedTables = collectTables(fn.where.condition, baseTable.name);
  if (referencedTables.size === 0) {
    return diagnostics;
  }

  const joins = collectJoinComparisons(fn.where.condition);

  for (const [tableName, refs] of referencedTables) {
    const otherTable = resolveTable(index, tableName);
    if (!otherTable) {
      continue;
    }

    if (hasJoinBetween(joins, baseTable.name, otherTable.name)) {
      continue;
    }

    const fk = findForeignKey(index.foreignKeys, baseTable.name, otherTable.name);
    if (!fk) {
      continue;
    }

    const range = ensureRange(refs[0]?.range ?? refs[0]?.path[0]?.range, expression.length);
    const joinCondition = buildJoinCondition(fk, baseTable.name, otherTable.name);
    const fix = createJoinFix(expression, fn, fn.where, joinCondition);

    diagnostics.push({
      code: "missing_join",
      message: `Add join condition between ${baseTable.name} and ${otherTable.name}.`,
      range,
      severity: "error",
      fix,
    });
  }

  return diagnostics;
}

function detectDateIssues(
  expression: string,
  ast: ProgramNode,
  index: SchemaIndex,
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = [];
  const comparisons = collectComparisons(ast.body.where?.condition);

  for (const comparison of comparisons) {
    const leftColumn = comparison.left.type === "Ref" ? resolveRefColumn(index, comparison.left) : undefined;

    if (comparison.operator === "between") {
      const [startValue, endValue] = comparison.right as ValueNode[];
      if (leftColumn && isDateType(leftColumn.type)) {
        const first = createDateDiagnostic(expression, startValue, leftColumn);
        if (first) {
          diagnostics.push(first);
        }
        const second = createDateDiagnostic(expression, endValue, leftColumn);
        if (second) {
          diagnostics.push(second);
        }
      }
      continue;
    }

    if (comparison.operator === "in" && Array.isArray(comparison.right)) {
      if (leftColumn && isDateType(leftColumn.type)) {
        for (const valueNode of comparison.right) {
          if (!isValueNode(valueNode)) {
            continue;
          }
          const diag = createDateDiagnostic(expression, valueNode, leftColumn);
          if (diag) {
            diagnostics.push(diag);
          }
        }
      }
      continue;
    }

    if (leftColumn && isDateType(leftColumn.type) && isValueNode(comparison.right)) {
      const diag = createDateDiagnostic(expression, comparison.right, leftColumn);
      if (diag) {
        diagnostics.push(diag);
      }
    }

    if (isValueNode(comparison.left)) {
      const rightRef = Array.isArray(comparison.right) ? undefined : comparison.right;
      if (rightRef && rightRef.type === "Ref") {
        const column = resolveRefColumn(index, rightRef);
        if (column && isDateType(column.type)) {
          const diag = createDateDiagnostic(expression, comparison.left, column);
          if (diag) {
            diagnostics.push(diag);
          }
        }
      }
    }
  }

  return diagnostics;
}

function diagnosticFromParseError(error: ParseError, expression: string): ReferenceDiagnostic {
  if (isUnbalancedParenthesesError(error)) {
    const unmatched = findUnclosedParentheses(expression);
    const missing = Math.max(1, unmatched.length);
    const rangeIndex = unmatched.at(-1) ?? Math.max(0, error.index - 1);
    const range = ensureRange({ start: rangeIndex, end: Math.min(expression.length, rangeIndex + 1) }, expression.length);

    return {
      code: "unbalanced_parentheses",
      message: missing === 1 ? "Add the closing parenthesis." : `Add ${missing} closing parentheses.`,
      range,
      severity: "error",
      fix: {
        label: missing === 1 ? "Close parenthesis" : `Close ${missing} parentheses`,
        apply: (source) => `${source}${")".repeat(missing)}`,
      },
    };
  }

  const range = ensureRange({ start: error.index, end: Math.min(expression.length, error.index + 1) }, expression.length);
  return {
    code: "syntax_error",
    message: error.message,
    range,
    severity: "error",
  };
}

function resolveTable(index: SchemaIndex, name: string): SchemaTable | undefined {
  return index.tables.get(name) ?? index.normalizedTables.get(name.toLowerCase());
}

function resolveColumn(index: SchemaIndex, tableName: string, columnName: string): SchemaColumn | undefined {
  const direct = index.columns.get(tableName)?.get(columnName);
  if (direct) {
    return direct;
  }
  const normalized = index.normalizedColumns.get(tableName.toLowerCase());
  return normalized?.get(columnName.toLowerCase());
}

function resolveRefColumn(index: SchemaIndex, ref: RefNode): SchemaColumn | undefined {
  const tableName = ref.path[0]?.name;
  if (!tableName) {
    return undefined;
  }
  const table = resolveTable(index, tableName);
  if (!table) {
    return undefined;
  }
  const columnName = getColumnName(ref);
  if (!columnName) {
    return undefined;
  }
  return resolveColumn(index, table.name, columnName);
}

function aggregationsForColumnType(type: string): FunctionName[] {
  const category = categorizeType(type);
  switch (category) {
    case "numeric":
      return ["sum", "avg", "min", "max", "count"];
    case "date":
      return ["min", "max", "count"];
    case "boolean":
      return ["count"];
    case "text":
      return ["count"];
    default:
      return ["count"];
  }
}

function preferredAggregation(type: string, options: FunctionName[]): FunctionName | undefined {
  const category = categorizeType(type);
  if (category === "date") {
    return options.find((option) => option === "min") ?? options[0];
  }
  if (category === "numeric") {
    return options.find((option) => option === "sum") ?? options[0];
  }
  return options[0];
}

function categorizeType(type: string): "numeric" | "date" | "boolean" | "text" | "other" {
  const normalized = type.toLowerCase();
  if (/num|int|decimal|float|double/.test(normalized)) {
    return "numeric";
  }
  if (/date|time/.test(normalized)) {
    return "date";
  }
  if (/bool/.test(normalized)) {
    return "boolean";
  }
  if (/char|text|string/.test(normalized)) {
    return "text";
  }
  return "other";
}

function collectTables(condition: ConditionNode, baseTable: string): Map<string, RefNode[]> {
  const map = new Map<string, RefNode[]>();

  traverseCondition(condition, (node) => {
    if (node.type === "Ref") {
      const tableName = node.path[0]?.name;
      if (tableName && tableName !== baseTable) {
        const existing = map.get(tableName) ?? [];
        existing.push(node);
        map.set(tableName, existing);
      }
    }
  });

  return map;
}

function collectJoinComparisons(condition: ConditionNode): Array<{ left: RefNode; right: RefNode }> {
  const comparisons: Array<{ left: RefNode; right: RefNode }> = [];

  traverseCondition(condition, (node) => {
    if (node.type === "Comparison" && node.operator === "=" && node.left.type === "Ref") {
      const right = node.right;
      if (!Array.isArray(right) && right?.type === "Ref") {
        comparisons.push({ left: node.left as RefNode, right });
      }
    }
  });

  return comparisons;
}

function hasJoinBetween(
  comparisons: Array<{ left: RefNode; right: RefNode }>,
  tableA: string,
  tableB: string,
): boolean {
  return comparisons.some((comparison) => {
    const leftTable = comparison.left.path[0]?.name;
    const rightTable = comparison.right.path[0]?.name;
    if (!leftTable || !rightTable) {
      return false;
    }
    return (
      (leftTable === tableA && rightTable === tableB) ||
      (leftTable === tableB && rightTable === tableA)
    );
  });
}

function findForeignKey(
  foreignKeys: SchemaForeignKey[],
  tableA: string,
  tableB: string,
): SchemaForeignKey | undefined {
  return foreignKeys.find((fk) => {
    return (
      (fk.fromTable === tableA && fk.toTable === tableB) ||
      (fk.fromTable === tableB && fk.toTable === tableA)
    );
  });
}

function buildJoinCondition(fk: SchemaForeignKey, baseTable: string, otherTable: string): string {
  if (fk.fromTable === baseTable && fk.toTable === otherTable) {
    return `@${fk.fromTable}.${fk.fromCol} = @${fk.toTable}.${fk.toCol}`;
  }
  if (fk.toTable === baseTable && fk.fromTable === otherTable) {
    return `@${fk.toTable}.${fk.toCol} = @${fk.fromTable}.${fk.fromCol}`;
  }
  return `@${fk.fromTable}.${fk.fromCol} = @${fk.toTable}.${fk.toCol}`;
}

function createJoinFix(
  expression: string,
  fn: FunctionCallNode,
  where: WhereNode,
  joinCondition: string,
): DiagnosticFix {
  return {
    label: `Add ${joinCondition}`,
    apply: (source) => addJoinCondition(source, fn, where, joinCondition),
  };
}

function addJoinCondition(
  source: string,
  fn: FunctionCallNode,
  where: WhereNode,
  joinCondition: string,
): string {
  if (where.range) {
    const insertionPoint = where.range.end;
    const before = source.slice(0, insertionPoint);
    const after = source.slice(insertionPoint);
    const spacer = /\s$/.test(before) ? "" : " ";
    return `${before}${spacer}and ${joinCondition}${after}`;
  }

  const closeIndex = fn.closeRange?.start ?? fn.range?.end ?? source.length;
  const before = source.slice(0, closeIndex);
  const after = source.slice(closeIndex);
  const spacer = /\s$/.test(before) ? "" : " ";
  return `${before}${spacer}where ${joinCondition}${after}`;
}

function collectComparisons(condition?: ConditionNode): ComparisonNode[] {
  if (!condition) {
    return [];
  }

  const comparisons: ComparisonNode[] = [];

  traverseCondition(condition, (node) => {
    if (node.type === "Comparison") {
      comparisons.push(node);
    }
  });

  return comparisons;
}

function traverseCondition(node: ConditionNode, visitor: (node: ComparisonNode | LogicalNode | RefNode) => void): void {
  const stack: ConditionNode[] = [node];

  while (stack.length > 0) {
    const current = stack.pop()!;
    visitor(current as ComparisonNode | LogicalNode | RefNode);

    if (current.type === "Logical") {
      stack.push(current.left);
      stack.push(current.right);
    } else if (current.type === "Comparison") {
      if (current.left.type === "Ref") {
        visitor(current.left);
      }
      const right = current.right;
      if (!Array.isArray(right) && right?.type === "Ref") {
        visitor(right);
      }
    }
  }
}

function createDateDiagnostic(
  expression: string,
  valueNode: ValueNode,
  column: SchemaColumn,
): ReferenceDiagnostic | undefined {
  if (typeof valueNode.value !== "string") {
    return undefined;
  }

  if (ISO_DATE_REGEX.test(valueNode.value)) {
    return undefined;
  }

  const iso = normaliseDate(valueNode.value);
  if (!iso) {
    return {
      code: "invalid_date",
      message: `Use ISO date (YYYY-MM-DD) for column "${column.name}".`,
      range: ensureRange(valueNode.range, expression.length),
      severity: "error",
    };
  }

  if (iso === valueNode.value) {
    return undefined;
  }

  const replacement = wrapWithOriginalQuotes(expression, valueNode.range, iso);
  const fix = createReplacementFix(valueNode.range, replacement, `Reformat to ${iso}`);

  return {
    code: "bad_date",
    message: `Use ISO date (YYYY-MM-DD) for column "${column.name}".`,
    range: ensureRange(valueNode.range, expression.length),
    severity: "warning",
    fix,
  };
}

function isDateType(type: string): boolean {
  return categorizeType(type) === "date";
}

function isValueNode(node: unknown): node is ValueNode {
  return Boolean(node && typeof node === "object" && (node as ValueNode).type === "Value");
}

function createReplacementFix(
  range: SourceRange | undefined,
  replacement: string,
  label: string,
): DiagnosticFix | undefined {
  if (!range) {
    return undefined;
  }

  return {
    label,
    apply: (source) => replaceRange(source, range, replacement),
  };
}

function replaceRange(source: string, range: SourceRange, replacement: string): string {
  return source.slice(0, range.start) + replacement + source.slice(range.end);
}

function ensureRange(range: SourceRange | undefined, fallbackEnd: number): SourceRange {
  if (range) {
    return range;
  }
  return { start: fallbackEnd, end: fallbackEnd };
}

function getColumnName(ref: RefNode): string | undefined {
  if (ref.path.length < 2) {
    return undefined;
  }
  return ref.path
    .slice(1)
    .map((identifier) => identifier.name)
    .join(".");
}

function getColumnRange(ref: RefNode): SourceRange | undefined {
  if (ref.path.length < 2) {
    return undefined;
  }

  const start = ref.path[1]?.range?.start;
  const end = ref.path[ref.path.length - 1]?.range?.end;
  if (start === undefined || end === undefined) {
    return undefined;
  }
  return { start, end };
}

function collectRefs(ast: ProgramNode): RefNode[] {
  const refs: RefNode[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    const typed = node as { type?: string };

    switch (typed.type) {
      case "Program":
        visit((typed as ProgramNode).body);
        break;
      case "FunctionCall": {
        const fn = typed as FunctionCallNode;
        visit(fn.argument);
        if (fn.where) {
          visit(fn.where.condition);
        }
        break;
      }
      case "Where": {
        const where = typed as WhereNode;
        visit(where.condition);
        break;
      }
      case "Logical": {
        const logical = typed as LogicalNode;
        visit(logical.left);
        visit(logical.right);
        break;
      }
      case "Comparison": {
        const comparison = typed as ComparisonNode;
        visit(comparison.left);
        visit(comparison.right);
        break;
      }
      case "Ref":
        refs.push(typed as RefNode);
        break;
      case "Value": {
        const value = typed as ValueNode;
        if (Array.isArray(value.value)) {
          for (const nested of value.value) {
            visit(nested);
          }
        }
        break;
      }
      default:
        break;
    }
  };

  visit(ast);
  return refs;
}

function findClosestMatch(target: string, candidates: Iterable<string>): string | undefined {
  const normalizedTarget = target.toLowerCase();
  let best: { candidate: string; distance: number } | undefined;

  for (const candidate of candidates) {
    const distance = levenshtein(normalizedTarget, candidate.toLowerCase());
    if (distance <= 2 && (!best || distance < best.distance)) {
      best = { candidate, distance };
    }
  }

  return best?.candidate;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i] = [i];
  }

  for (let j = 1; j <= b.length; j += 1) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1,
        );
      }
    }
  }

  return matrix[a.length]![b.length]!;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function normaliseDate(value: string): string | null {
  if (ISO_DATE_REGEX.test(value)) {
    return value;
  }

  const slashOrDash = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashOrDash) {
    const [, first, second, year] = slashOrDash;
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const month = firstNumber > 12 ? secondNumber : firstNumber;
    const day = firstNumber > 12 ? firstNumber : secondNumber;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function wrapWithOriginalQuotes(
  expression: string,
  range: SourceRange | undefined,
  value: string,
): string {
  if (!range) {
    return `'${value}'`;
  }
  const quote = expression[range.start];
  if (quote === '"' || quote === "'") {
    return `${quote}${value}${quote}`;
  }
  return `'${value}'`;
}

function isUnbalancedParenthesesError(error: ParseError): boolean {
  return /Expected RPAREN/i.test(error.message);
}

function findUnclosedParentheses(expression: string): number[] {
  const stack: number[] = [];
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < expression.length; i += 1) {
    const char = expression[i]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      if (inSingle || inDouble) {
        escaped = true;
      }
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (inSingle || inDouble) {
      continue;
    }

    if (char === "(") {
      stack.push(i);
    } else if (char === ")" && stack.length > 0) {
      stack.pop();
    }
  }

  return stack;
}
