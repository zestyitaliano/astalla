import type { ProgramNode, RefNode } from "@shared/ast";
import type { SchemaGraph, SchemaTable } from "@shared/api";

type ValidationErrorCode = "unknown_table" | "unknown_column";

export interface ValidationIssue {
  code: ValidationErrorCode;
  message: string;
  fix?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
}

export function validate(ast: ProgramNode, schema: SchemaGraph): ValidationResult {
  const tableLookup = buildTableLookup(schema.tables);
  const tableColumns = buildTableColumnLookup(schema.tables);
  const errors: ValidationIssue[] = [];
  const seenErrors = new Set<string>();

  for (const ref of collectRefs(ast)) {
    const tableName = ref.path[0]?.name;
    if (!tableName) {
      const key = `unknown_table::`; // avoid duplicates
      if (!seenErrors.has(key)) {
        errors.push({
          code: "unknown_table",
          message: "Reference is missing a table name.",
        });
        seenErrors.add(key);
      }
      continue;
    }

    if (!tableLookup.has(tableName)) {
      const key = `unknown_table::${tableName}`;
      if (!seenErrors.has(key)) {
        errors.push({
          code: "unknown_table",
          message: `Unknown table "${tableName}" in reference.`,
          fix: suggestionForTable(tableLookup),
        });
        seenErrors.add(key);
      }
      continue;
    }

    const columnName = getColumnName(ref);
    if (!columnName) {
      const key = `unknown_column::${tableName}::`;
      if (!seenErrors.has(key)) {
        errors.push({
          code: "unknown_column",
          message: `Reference to table "${tableName}" is missing a column name.`,
          fix: suggestionForColumns(tableColumns.get(tableName)),
        });
        seenErrors.add(key);
      }
      continue;
    }

    const tableColumnSet = tableColumns.get(tableName);
    if (!tableColumnSet || !tableColumnSet.has(columnName)) {
      const key = `unknown_column::${tableName}::${columnName}`;
      if (!seenErrors.has(key)) {
        errors.push({
          code: "unknown_column",
          message: `Unknown column "${columnName}" on table "${tableName}".`,
          fix: suggestionForColumns(tableColumnSet),
        });
        seenErrors.add(key);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function buildTableLookup(tables: SchemaTable[]): Map<string, SchemaTable> {
  const lookup = new Map<string, SchemaTable>();
  for (const table of tables) {
    lookup.set(table.name, table);
  }
  return lookup;
}

function buildTableColumnLookup(tables: SchemaTable[]): Map<string, Set<string>> {
  const lookup = new Map<string, Set<string>>();
  for (const table of tables) {
    const columns = new Set<string>();
    for (const column of table.columns) {
      columns.add(column.name);
    }
    lookup.set(table.name, columns);
  }
  return lookup;
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
        const fn = typed as unknown as { argument: unknown; where?: { condition: unknown } };
        visit(fn.argument);
        if (fn.where) {
          visit(fn.where.condition);
        }
        break;
      }
      case "Where": {
        const where = typed as { condition: unknown };
        visit(where.condition);
        break;
      }
      case "Logical": {
        const logical = typed as { left: unknown; right: unknown };
        visit(logical.left);
        visit(logical.right);
        break;
      }
      case "Comparison": {
        const comparison = typed as { left: unknown; right: unknown };
        visit(comparison.left);
        visit(comparison.right);
        break;
      }
      case "Ref":
        refs.push(typed as RefNode);
        break;
      case "Value": {
        const value = typed as { value: unknown };
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

function getColumnName(ref: RefNode): string | undefined {
  if (ref.path.length < 2) {
    return undefined;
  }

  const columnSegments = ref.path.slice(1).map((part) => part.name);
  return columnSegments.join(".");
}

function suggestionForTable(tables: Map<string, SchemaTable>): string | undefined {
  if (tables.size === 0) {
    return undefined;
  }

  return `Known tables: ${Array.from(tables.keys()).join(", ")}`;
}

function suggestionForColumns(columns?: Set<string>): string | undefined {
  if (!columns || columns.size === 0) {
    return undefined;
  }

  return `Available columns: ${Array.from(columns.values()).join(", ")}`;
}
