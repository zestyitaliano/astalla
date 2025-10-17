import { parseExpression } from "./parser";
import type { SchemaGraph } from "@shared/api";

const FUNCTION_ALIASES: Record<string, string> = {
  sum: "sum",
  total: "sum",
  average: "avg",
  avg: "avg",
  mean: "avg",
  count: "count",
  min: "min",
  minimum: "min",
  max: "max",
  maximum: "max",
};

const SYNONYM_GROUPS: readonly string[][] = [
  ["rent", "total_rent"],
  ["move in", "move_in_date"],
  ["property", "site", "community"],
];

type ColumnRef = { table: string; column: string };

type SchemaIndex = {
  tableAliases: Map<string, string>;
  columnAliases: Map<string, Map<string, string>>;
  globalColumnAliases: Map<string, ColumnRef[]>;
};

const SYNONYM_MAP = buildSynonymMap();

export function translateHumanToCanonical(input: string, schema: SchemaGraph): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Input cannot be empty.");
  }

  const index = buildSchemaIndex(schema);

  const attempts: Array<(value: string) => HumanParseResult | null> = [
    parseOfInStructure,
    parseDirectStructure,
  ];

  for (const attempt of attempts) {
    const parsed = attempt(trimmed);
    if (!parsed) continue;

    const func = mapFunction(parsed.func);
    if (!func) {
      throw new Error(`Unsupported function "${parsed.func}".`);
    }

    const tableName = resolveTable(parsed.table, index);
    const columnRef = resolveColumn(parsed.column, tableName, index);

    const whereClause = parsed.filters
      ? translateFilters(parsed.filters, tableName, index)
      : undefined;

    const canonical = whereClause
      ? `${func}(@${columnRef.table}.${columnRef.column} where ${whereClause})`
      : `${func}(@${columnRef.table}.${columnRef.column})`;

    parseExpression(canonical);
    return canonical;
  }

  throw new Error("Unable to translate input to canonical form.");
}

type HumanParseResult = {
  func: string;
  column: string;
  table: string;
  filters?: string;
};

const WHERE_KEYWORD = " where ";

const parseOfInStructure = (value: string): HumanParseResult | null => {
  const funcMatch = value.match(/^(?<func>[a-z]+)\s+of\s+/i);
  const func = funcMatch?.groups?.func;
  if (!funcMatch || !func) {
    return null;
  }

  const remainder = value.slice(funcMatch[0]!.length);
  const lowerRemainder = remainder.toLowerCase();
  const whereIndex = lowerRemainder.indexOf(WHERE_KEYWORD);
  const head = whereIndex === -1 ? remainder : remainder.slice(0, whereIndex);
  const filtersRaw = whereIndex === -1 ? undefined : remainder.slice(whereIndex + WHERE_KEYWORD.length);

  const headLower = head.toLowerCase();
  const separatorIndex = headLower.lastIndexOf(" in ");
  if (separatorIndex === -1) {
    return null;
  }

  const column = head.slice(0, separatorIndex).trim();
  const table = head.slice(separatorIndex + 4).trim();
  if (!column || !table) {
    return null;
  }

  const filters = filtersRaw?.trim();
  return {
    func,
    column,
    table,
    filters: filters ? filters : undefined,
  };
};

const parseDirectStructure = (value: string): HumanParseResult | null => {
  const match = value.match(
    /^(?<func>[a-z]+)\s+(?<table>[a-z0-9_ ]+)\.(?<column>[a-z0-9_]+)(?:\s+where\s+(?<filters>.+))?$/i,
  );
  if (!match?.groups) {
    return null;
  }

  const filters = match.groups.filters?.trim();
  return {
    func: match.groups.func,
    table: match.groups.table.trim(),
    column: match.groups.column,
    filters: filters ? filters : undefined,
  };
};

function mapFunction(raw: string): string | undefined {
  return FUNCTION_ALIASES[raw.toLowerCase()];
}

function translateFilters(value: string, defaultTable: string, index: SchemaIndex): string {
  const tokens = tokenizeFilters(value);
  if (tokens.length === 0) {
    throw new Error("WHERE clause is empty.");
  }

  const clauses: string[] = [];
  const connectors: ("and" | "or")[] = [];

  for (const token of tokens) {
    if (token.type === "connector") {
      connectors.push(token.value);
      continue;
    }

    clauses.push(parseSingleCondition(token.text, defaultTable, index));
  }

  if (clauses.length === 0) {
    throw new Error("WHERE clause is missing conditions.");
  }

  let result = clauses[0]!;
  for (let i = 0; i < connectors.length; i += 1) {
    const connector = connectors[i]!;
    const clause = clauses[i + 1];
    if (!clause) break;
    result += ` ${connector} ${clause}`;
  }

  return result;
}

type FilterToken =
  | { type: "clause"; text: string }
  | { type: "connector"; value: "and" | "or" };

function tokenizeFilters(value: string): FilterToken[] {
  const words = value.trim().split(/\s+/);
  const tokens: FilterToken[] = [];
  const clause: string[] = [];
  let betweenPending = 0;

  const flushClause = () => {
    if (clause.length === 0) return;
    tokens.push({ type: "clause", text: clause.join(" ") });
    clause.length = 0;
  };

  for (const rawWord of words) {
    const lower = rawWord.toLowerCase();
    if ((lower === "and" || lower === "or") && betweenPending === 0 && clause.length > 0) {
      flushClause();
      tokens.push({ type: "connector", value: lower as "and" | "or" });
      continue;
    }

    clause.push(rawWord);

    if (lower === "between") {
      betweenPending = 1;
    } else if (betweenPending > 0 && lower === "and") {
      betweenPending -= 1;
    }
  }

  flushClause();
  return tokens;
}

function parseSingleCondition(clause: string, defaultTable: string, index: SchemaIndex): string {
  const trimmed = clause.trim();
  const hasBetweenKeyword = /\sbetween\s/i.test(trimmed);
  const between = trimmed.match(/^(?<column>.+?)\s+between\s+(?<start>.+?)\s+and\s+(?<end>.+)$/i);
  if (between?.groups) {
    const column = resolveColumn(between.groups.column ?? "", defaultTable, index);
    const start = formatOperand(between.groups.start ?? "", index, column.table);
    const end = formatOperand(between.groups.end ?? "", index, column.table);
    return `@${column.table}.${column.column} between ${start} and ${end}`;
  }

  if (hasBetweenKeyword) {
    throw new Error(`Unsupported condition: "${clause}"`);
  }

  const after = trimmed.match(/^(?<column>.+?)\s+after\s+(?<value>.+)$/i);
  if (after?.groups) {
    const column = resolveColumn(after.groups.column ?? "", defaultTable, index);
    const value = formatOperand(after.groups.value ?? "", index, column.table);
    return `@${column.table}.${column.column} > ${value}`;
  }

  const before = trimmed.match(/^(?<column>.+?)\s+before\s+(?<value>.+)$/i);
  if (before?.groups) {
    const column = resolveColumn(before.groups.column ?? "", defaultTable, index);
    const value = formatOperand(before.groups.value ?? "", index, column.table);
    return `@${column.table}.${column.column} < ${value}`;
  }

  const inMatch = trimmed.match(/^(?<column>.+?)\s+in\s+(?<values>.+)$/i);
  if (inMatch?.groups) {
    const column = resolveColumn(inMatch.groups.column ?? "", defaultTable, index);
    const values = parseValueList(inMatch.groups.values ?? "").map((item) =>
      formatOperand(item, index, column.table),
    );
    if (values.length === 0) {
      throw new Error("IN clause requires at least one value.");
    }
    return `@${column.table}.${column.column} in (${values.join(", ")})`;
  }

  const equals = trimmed.match(/^(?<column>.+?)\s+(?:is|equals)\s+(?<value>.+)$/i);
  if (equals?.groups) {
    const column = resolveColumn(equals.groups.column ?? "", defaultTable, index);
    const value = formatOperand(equals.groups.value ?? "", index, column.table);
    return `@${column.table}.${column.column} = ${value}`;
  }

  throw new Error(`Unsupported condition: "${clause}"`);
}

function parseValueList(input: string): string[] {
  let inner = input.trim();
  if (inner.startsWith("(") && inner.endsWith(")")) {
    inner = inner.slice(1, -1);
  }

  const values: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i]!;
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      current += char;
      continue;
    }
    if (char === "\"" && !inSingle) {
      inDouble = !inDouble;
      current += char;
      continue;
    }
    if (char === "," && !inSingle && !inDouble) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
}

function formatOperand(raw: string, index: SchemaIndex, preferredTable?: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Value cannot be empty.");
  }

  if (/^[-+]?\d+(?:\.\d+)?$/.test(trimmed)) {
    return trimmed;
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === "true" || lowered === "false" || lowered === "null") {
    return lowered;
  }

  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    const unquoted = trimmed.slice(1, -1);
    return quoteString(unquoted);
  }

  try {
    const column = resolveColumn(trimmed, preferredTable, index);
    return `@${column.table}.${column.column}`;
  } catch {
    // fall through to treat as string literal
  }

  return quoteString(trimmed);
}

function quoteString(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `'${escaped}'`;
}

function resolveTable(raw: string, index: SchemaIndex): string {
  const normalized = normalizeTerm(raw);
  const table = index.tableAliases.get(normalized);
  if (table) {
    return table;
  }
  throw new Error(`Unknown table "${raw}".`);
}

function resolveColumn(
  raw: string,
  defaultTable: string | undefined,
  index: SchemaIndex,
): ColumnRef {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Column reference cannot be empty.");
  }

  const dotMatch = trimmed.match(/^(?<table>[^.]+)\.(?<column>.+)$/);
  let preferredTable = defaultTable;
  let columnPart = trimmed;

  if (dotMatch?.groups) {
    preferredTable = resolveTable(dotMatch.groups.table ?? "", index);
    columnPart = dotMatch.groups.column ?? "";
  }

  const normalizedColumn = normalizeTerm(columnPart);
  let tableName = preferredTable;
  let columnAlias = normalizedColumn;

  const explicit = extractTableAlias(normalizedColumn, index);
  if (explicit) {
    tableName = explicit.table;
    columnAlias = explicit.remaining;
  }

  if (!columnAlias) {
    throw new Error(`Column name missing in "${raw}".`);
  }

  if (tableName) {
    const tableColumns = index.columnAliases.get(tableName);
    const columnName = tableColumns?.get(columnAlias);
    if (columnName) {
      return { table: tableName, column: columnName };
    }

    const globalMatches = index.globalColumnAliases.get(columnAlias) ?? [];
    const sameTable = globalMatches.find((match) => match.table === tableName);
    if (sameTable) {
      return sameTable;
    }

    if (globalMatches.length === 1) {
      return globalMatches[0]!;
    }
  } else {
    const globalMatches = index.globalColumnAliases.get(columnAlias) ?? [];
    if (globalMatches.length === 1) {
      return globalMatches[0]!;
    }
  }

  throw new Error(`Unknown column "${raw}".`);
}

function extractTableAlias(column: string, index: SchemaIndex): { table: string; remaining: string } | undefined {
  if (!column) return undefined;

  let best: { table: string; remaining: string; length: number } | undefined;
  for (const [alias, tableName] of index.tableAliases.entries()) {
    if (column === alias) {
      continue;
    }
    if (column.startsWith(`${alias} `)) {
      const remaining = column.slice(alias.length).trim();
      if (!remaining) {
        continue;
      }
      if (!best || alias.length > best.length) {
        best = { table: tableName, remaining, length: alias.length };
      }
    }
  }

  if (best) {
    return { table: best.table, remaining: best.remaining };
  }

  return undefined;
}

function buildSchemaIndex(schema: SchemaGraph): SchemaIndex {
  const tableAliases = new Map<string, string>();
  const columnAliases = new Map<string, Map<string, string>>();
  const globalColumnAliases = new Map<string, ColumnRef[]>();

  for (const table of schema.tables) {
    const aliases = expandAliases(createAliasSet(table.name, table.label));
    for (const alias of aliases) {
      if (!tableAliases.has(alias)) {
        tableAliases.set(alias, table.name);
      }
    }

    const columnMap = new Map<string, string>();
    for (const column of table.columns) {
      const columnAliasSet = expandAliases(createAliasSet(column.name));
      for (const alias of columnAliasSet) {
        if (!columnMap.has(alias)) {
          columnMap.set(alias, column.name);
        }
        const existing = globalColumnAliases.get(alias) ?? [];
        existing.push({ table: table.name, column: column.name });
        globalColumnAliases.set(alias, existing);
      }
    }

    columnAliases.set(table.name, columnMap);
  }

  return { tableAliases, columnAliases, globalColumnAliases };
}

function createAliasSet(...values: (string | undefined)[]): Set<string> {
  const set = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const normalized = normalizeTerm(value);
    if (!normalized) continue;
    set.add(normalized);
    if (normalized.endsWith("ies")) {
      set.add(`${normalized.slice(0, -3)}y`);
    }
    if (normalized.endsWith("s")) {
      set.add(normalized.slice(0, -1));
    }
  }
  return set;
}

function expandAliases(base: Set<string>): Set<string> {
  const result = new Set(base);
  const queue = [...result];

  while (queue.length > 0) {
    const current = queue.pop()!;
    const synonyms = SYNONYM_MAP.get(current);
    if (!synonyms) continue;
    for (const synonym of synonyms) {
      if (!result.has(synonym)) {
        result.add(synonym);
        queue.push(synonym);
      }
    }
  }

  const additional: string[] = [];
  for (const alias of result) {
    if (alias.endsWith("ies")) {
      additional.push(`${alias.slice(0, -3)}y`);
    }
    if (alias.endsWith("s")) {
      additional.push(alias.slice(0, -1));
    }
  }
  for (const alias of additional) {
    if (alias) {
      result.add(alias);
    }
  }

  return result;
}

function buildSynonymMap(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group
      .map((term) => normalizeTerm(term))
      .filter((term): term is string => Boolean(term));
    for (const term of normalizedGroup) {
      const others = normalizedGroup.filter((item) => item !== term);
      map.set(term, new Set(others));
    }
  }
  return map;
}

function normalizeTerm(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}
