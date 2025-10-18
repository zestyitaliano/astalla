import type {
  ComparisonNode,
  ConditionNode,
  FunctionCallNode,
  IdentifierNode,
  ProgramNode,
  RefNode,
  ValueNode,
} from './astTypes.js';
import type { SchemaColumn, SchemaGraph, SchemaTable } from '@shared/api';
import { canRead } from '../auth/permissions.js';
import { BASE_SCHEMA } from '../schemaRegistry/registry.js';
import { getTableRows, hasColumn, type TableRow } from '../db/data.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

export class AstValidationError extends Error {
  public readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super('The provided AST is invalid.');
    this.name = 'AstValidationError';
    this.issues = issues;
  }
}

export class PermissionError extends Error {
  constructor(
    public readonly table: string,
    public readonly column: string,
  ) {
    super(`You do not have permission to read ${table}.${column}.`);
    this.name = 'PermissionError';
  }
}

export class ExecutionPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionPlanError';
  }
}

export interface ExecuteReferenceResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  sqlText: string;
}

interface ColumnBinding {
  schemaTable: SchemaTable;
  schemaColumn: SchemaColumn;
  tableName: string;
  columnName: string;
  sqlText: string;
}

interface OperandBuildResult {
  text: string;
  evaluate(row: RowScope): unknown;
}

interface ConditionBuildResult {
  text: string;
  evaluate(row: RowScope): boolean;
}

interface AggregateBuildResult {
  column: ColumnBinding;
  functionName: FunctionCallNode['name'];
  text: string;
}

interface JoinEdge {
  sourceTable: string;
  targetTable: string;
  sourceColumn: string;
  targetColumn: string;
}

interface JoinStep {
  sourceTableName: string;
  sourceColumnName: string;
  targetTableName: string;
  targetColumnName: string;
  text: string;
}

interface ExecutionPlan {
  baseTableName: string;
  aggregate: AggregateBuildResult;
  joins: JoinStep[];
  where?: ConditionBuildResult;
  toSqlString(): string;
}

interface RowScope {
  [tableName: string]: TableRow | undefined;
}

interface RenderContext {
  baseTable: SchemaTable;
  baseTableName: string;
}

const isPrimitiveValue = (value: unknown): value is string | number | boolean | null =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);

const collectIssue = (issues: ValidationIssue[], path: string, message: string): void => {
  issues.push({ path, message });
};

const validateIdentifierNode = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (typeof value !== 'object' || value === null) {
    collectIssue(issues, path, 'Expected Identifier node.');
    return;
  }

  const node = value as Partial<{ type: unknown; name: unknown }>;
  if (node.type !== 'Identifier') {
    collectIssue(issues, path, 'Identifier node must have type "Identifier".');
  }
  if (typeof node.name !== 'string' || node.name.length === 0) {
    collectIssue(issues, path, 'Identifier node must include a non-empty name.');
  }
};

const validateRefNode = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (typeof value !== 'object' || value === null) {
    collectIssue(issues, path, 'Expected Ref node.');
    return;
  }

  const node = value as Partial<RefNode>;
  if (node.type !== 'Ref') {
    collectIssue(issues, path, 'Ref node must have type "Ref".');
  }

  if (!Array.isArray(node.path) || node.path.length < 2) {
    collectIssue(issues, path, 'Ref node must include at least a table and column identifier.');
    return;
  }

  (node.path as IdentifierNode[]).forEach((segment: IdentifierNode, index: number) => {
    validateIdentifierNode(segment, `${path}.path[${index}]`, issues);
  });
};

const validateValueNode = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (typeof value !== 'object' || value === null) {
    collectIssue(issues, path, 'Expected Value node.');
    return;
  }

  const node = value as Partial<ValueNode>;
  if (node.type !== 'Value') {
    collectIssue(issues, path, 'Value node must have type "Value".');
  }

  if (Array.isArray(node.value)) {
    (node.value as unknown[]).forEach((item: unknown, index: number) => {
      if (!isPrimitiveValue(item)) {
        collectIssue(issues, `${path}.value[${index}]`, 'Value list items must be primitive.');
      }
    });
  } else if (!isPrimitiveValue(node.value)) {
    collectIssue(issues, `${path}.value`, 'Value node must contain a primitive or list of primitives.');
  }
};

const validateOperand = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (typeof value !== 'object' || value === null) {
    collectIssue(issues, path, 'Expected operand node.');
    return;
  }

  const node = value as { type?: string };
  if (node.type === 'Ref') {
    validateRefNode(value, path, issues);
  } else if (node.type === 'Value') {
    validateValueNode(value, path, issues);
  } else {
    collectIssue(issues, path, 'Operand must be a Ref or Value node.');
  }
};

const validateComparisonNode = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (typeof value !== 'object' || value === null) {
    collectIssue(issues, path, 'Expected Comparison node.');
    return;
  }

  const node = value as Partial<ComparisonNode>;
  if (node.type !== 'Comparison') {
    collectIssue(issues, path, 'Comparison node must have type "Comparison".');
  }

  if (!node.operator || !['=', '!=', '>', '<', 'in', 'between'].includes(node.operator as string)) {
    collectIssue(issues, path, 'Unsupported comparison operator.');
  }

  validateOperand(node.left, `${path}.left`, issues);

  if (Array.isArray(node.right)) {
    (node.right as (RefNode | ValueNode)[]).forEach((item: RefNode | ValueNode, index: number) =>
      validateOperand(item, `${path}.right[${index}]`, issues),
    );
  } else {
    validateOperand(node.right, `${path}.right`, issues);
  }
};

const validateConditionNode = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (typeof value !== 'object' || value === null) {
    collectIssue(issues, path, 'Expected condition node.');
    return;
  }

  const node = value as { type?: string };
  if (node.type === 'Comparison') {
    validateComparisonNode(value, path, issues);
  } else if (node.type === 'Logical') {
    const logical = value as any;
    if (!['and', 'or'].includes(logical.operator)) {
      collectIssue(issues, `${path}.operator`, 'Logical operator must be "and" or "or".');
    }
    validateConditionNode(logical.left, `${path}.left`, issues);
    validateConditionNode(logical.right, `${path}.right`, issues);
  } else {
    collectIssue(issues, path, 'Condition must be a Comparison or Logical node.');
  }
};

const validateWhereNode = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (typeof value !== 'object' || value === null) {
    collectIssue(issues, path, 'Expected Where node.');
    return;
  }

  const node = value as { type?: string; condition?: unknown };
  if (node.type !== 'Where') {
    collectIssue(issues, path, 'Where node must have type "Where".');
  }
  validateConditionNode(node.condition, `${path}.condition`, issues);
};

const validateFunctionCallNode = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (typeof value !== 'object' || value === null) {
    collectIssue(issues, path, 'Expected FunctionCall node.');
    return;
  }

  const node = value as Partial<FunctionCallNode> & { where?: unknown };
  if (node.type !== 'FunctionCall') {
    collectIssue(issues, path, 'FunctionCall node must have type "FunctionCall".');
  }

  if (!node.name || !['sum', 'count', 'avg', 'min', 'max'].includes(node.name as string)) {
    collectIssue(issues, `${path}.name`, 'Unsupported function name.');
  }

  validateOperand(node.argument, `${path}.argument`, issues);

  if (node.where !== undefined) {
    validateWhereNode(node.where, `${path}.where`, issues);
  }
};

const validateProgramNode = (value: unknown, issues: ValidationIssue[]): value is ProgramNode => {
  if (typeof value !== 'object' || value === null) {
    collectIssue(issues, '', 'Program node must be an object.');
    return false;
  }

  const node = value as Partial<ProgramNode>;
  if (node.type !== 'Program') {
    collectIssue(issues, 'type', 'Program node must have type "Program".');
  }
  validateFunctionCallNode(node.body, 'body', issues);
  return issues.length === 0;
};

const normalizeIdentifier = (value: string): string => value.toLowerCase();

const quoteIdentifier = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const findTableById = (graph: SchemaGraph, id: string): SchemaTable | undefined =>
  graph.tables.find((table) => table.id === id);

const findBaseTable = (graph: SchemaGraph, identifier: string): SchemaTable | undefined => {
  const normalized = normalizeIdentifier(identifier);
  return graph.tables.find((table) => {
    const nameMatch = normalizeIdentifier(table.name) === normalized;
    const labelMatch = table.label ? normalizeIdentifier(table.label) === normalized : false;
    return nameMatch || labelMatch;
  });
};

const findColumn = (table: SchemaTable, identifier: string): SchemaColumn | undefined => {
  const normalized = normalizeIdentifier(identifier);
  return table.columns.find((column) => normalizeIdentifier(column.name) === normalized);
};

const findIdentifierColumnName = (table: SchemaTable): string | undefined => {
  const explicit = table.columns.find((column) => normalizeIdentifier(column.name) === 'id');
  if (explicit) {
    return explicit.name;
  }
  return table.columns[0]?.name;
};

const resolveColumnBinding = (
  ref: RefNode,
  graph: SchemaGraph,
  userId: string,
  referencedTables: Set<string>,
): ColumnBinding => {
  const path = ref.path;
  if (path.length < 2) {
    throw new ExecutionPlanError('References must include a table and column.');
  }

  const tableIdentifier = path[path.length - 2]!.name;
  const columnIdentifier = path[path.length - 1]!.name;
  const table = findBaseTable(graph, tableIdentifier);

  if (!table) {
    const baseTable = findBaseTable(BASE_SCHEMA, tableIdentifier);
    if (baseTable) {
      throw new PermissionError(baseTable.label ?? baseTable.name, columnIdentifier);
    }
    throw new ExecutionPlanError(`Table \"${tableIdentifier}\" is not available.`);
  }

  const column = findColumn(table, columnIdentifier);
  if (!column) {
    const baseTable = findBaseTable(BASE_SCHEMA, tableIdentifier);
    const baseColumn = baseTable ? findColumn(baseTable, columnIdentifier) : undefined;
    if (baseTable && baseColumn && !canRead(userId, { kind: 'column', table: baseTable, column: baseColumn })) {
      throw new PermissionError(baseTable.label ?? baseTable.name, baseColumn.name);
    }
    throw new ExecutionPlanError(`Column \"${columnIdentifier}\" is not available on table ${table.label ?? table.name}.`);
  }

  if (!hasColumn(table.name, column.name)) {
    throw new ExecutionPlanError(`Column \"${column.name}\" is not configured for execution.`);
  }

  referencedTables.add(table.name);

  return {
    schemaTable: table,
    schemaColumn: column,
    tableName: table.name,
    columnName: column.name,
    sqlText: `${quoteIdentifier(table.name)}.${quoteIdentifier(column.name)}`,
  };
};

const buildAggregate = (
  call: FunctionCallNode,
  graph: SchemaGraph,
  userId: string,
  referencedTables: Set<string>,
): AggregateBuildResult => {
  if (call.argument.type !== 'Ref') {
    throw new ExecutionPlanError('Function arguments must reference a column.');
  }

  const binding = resolveColumnBinding(call.argument, graph, userId, referencedTables);
  const fn = call.name.toUpperCase();

  return {
    column: binding,
    functionName: call.name,
    text: `${fn}(${binding.sqlText})`,
  };
};

const isThisReference = (ref: RefNode): boolean =>
  ref.path.length >= 3 && normalizeIdentifier(ref.path[0]!.name) === 'this';

const buildReferenceFieldOperand = (
  ref: RefNode,
  graph: SchemaGraph,
  userId: string,
  context: RenderContext,
): OperandBuildResult => {
  const columnIdentifier = ref.path[1]?.name;
  const fieldSegments = ref.path.slice(2);

  if (!columnIdentifier || fieldSegments.length === 0) {
    throw new ExecutionPlanError('Reference columns must specify a field to access.');
  }

  const referenceColumn = findColumn(context.baseTable, columnIdentifier);
  if (!referenceColumn) {
    throw new ExecutionPlanError(
      `Column "${columnIdentifier}" is not available on table ${context.baseTable.label ?? context.baseTable.name}.`,
    );
  }

  if (referenceColumn.type !== 'reference') {
    throw new ExecutionPlanError(
      `Column "${referenceColumn.name}" on table ${context.baseTable.label ?? context.baseTable.name} is not configured as a reference column.`,
    );
  }

  const config = referenceColumn.referenceConfig;
  if (!config?.targetTableId) {
    throw new ExecutionPlanError(
      `Reference column "${referenceColumn.name}" is missing a target table configuration.`,
    );
  }

  const targetTable = findTableById(graph, config.targetTableId);
  if (!targetTable) {
    throw new ExecutionPlanError(`Target table "${config.targetTableId}" is not available.`);
  }

  const fieldName = fieldSegments.map((segment) => segment.name).join('.');
  const targetColumn = findColumn(targetTable, fieldName);
  if (!targetColumn) {
    throw new ExecutionPlanError(
      `Column "${fieldName}" is not available on table ${targetTable.label ?? targetTable.name}.`,
    );
  }

  const baseTargetTable = BASE_SCHEMA.tables.find(
    (table) => table.id === targetTable.id || normalizeIdentifier(table.name) === normalizeIdentifier(targetTable.name),
  );

  if (baseTargetTable) {
    const baseTargetColumn = findColumn(baseTargetTable, targetColumn.name);
    if (
      baseTargetColumn &&
      !canRead(userId, { kind: 'column', table: baseTargetTable, column: baseTargetColumn })
    ) {
      throw new PermissionError(baseTargetTable.label ?? baseTargetTable.name, baseTargetColumn.name);
    }
  }

  const idColumnName = findIdentifierColumnName(targetTable);
  if (!idColumnName) {
    throw new ExecutionPlanError(
      `Target table ${targetTable.label ?? targetTable.name} does not have an identifier column.`,
    );
  }

  const targetRows = getTableRows(targetTable.name);
  const lookup = new Map<string, TableRow>();
  for (const row of targetRows) {
    const rawKey = row[idColumnName];
    if (rawKey === undefined || rawKey === null) {
      continue;
    }
    lookup.set(String(rawKey), row);
  }

  const toKey = (value: unknown): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  };

  const cardinality = config.cardinality === 'multi' ? 'multi' : 'single';
  const text = `${quoteIdentifier(context.baseTableName)}.${quoteIdentifier(referenceColumn.name)} -> ${quoteIdentifier(targetTable.name)}.${quoteIdentifier(targetColumn.name)}`;

  return {
    text,
    evaluate: (row) => {
      const sourceRow = row[context.baseTableName];
      if (!sourceRow) {
        return cardinality === 'multi' ? [] : null;
      }

      const rawValue = sourceRow[referenceColumn.name];

      if (cardinality === 'multi') {
        if (!Array.isArray(rawValue)) {
          return [];
        }

        const results: unknown[] = [];
        for (const entry of rawValue) {
          const key = toKey(entry);
          if (key === null) {
            continue;
          }
          const targetRow = lookup.get(key);
          if (targetRow && targetColumn.name in targetRow) {
            results.push(targetRow[targetColumn.name]);
          }
        }
        return results;
      }

      const key = toKey(rawValue);
      if (key === null) {
        return null;
      }

      const targetRow = lookup.get(key);
      if (!targetRow) {
        return null;
      }

      return targetRow[targetColumn.name] ?? null;
    },
  };
};

const renderValue = (value: ValueNode): OperandBuildResult => ({
  text: '?',
  evaluate: () => value.value,
});

const renderOperand = (
  operand: RefNode | ValueNode,
  graph: SchemaGraph,
  userId: string,
  referencedTables: Set<string>,
  context: RenderContext,
): OperandBuildResult => {
  if (operand.type === 'Ref') {
    if (isThisReference(operand)) {
      return buildReferenceFieldOperand(operand, graph, userId, context);
    }

    const binding = resolveColumnBinding(operand, graph, userId, referencedTables);
    return {
      text: binding.sqlText,
      evaluate: (row) => row[binding.tableName]?.[binding.columnName],
    };
  }

  return renderValue(operand);
};

const buildComparison = (
  node: ComparisonNode,
  graph: SchemaGraph,
  userId: string,
  referencedTables: Set<string>,
  context: RenderContext,
): ConditionBuildResult => {
  const left = renderOperand(node.left, graph, userId, referencedTables, context);

  if (node.operator === 'in') {
    if (!Array.isArray(node.right)) {
      throw new ExecutionPlanError('IN comparisons require a list of values.');
    }

    const rightOperands = node.right as (RefNode | ValueNode)[];
    const values = rightOperands.map((valueNode: RefNode | ValueNode) =>
      renderOperand(valueNode, graph, userId, referencedTables, context),
    );
    const textValues = values.map((item: OperandBuildResult) => item.text).join(', ');

    return {
      text: `${left.text} IN (${textValues})`,
      evaluate: (row) => {
        const target = left.evaluate(row);
        return values.some((operand: OperandBuildResult) => operand.evaluate(row) === target);
      },
    };
  }

  if (node.operator === 'between') {
    if (!Array.isArray(node.right) || node.right.length !== 2) {
      throw new ExecutionPlanError('BETWEEN comparisons require two values.');
    }

    const [start, end] = node.right;
    const startOperand = renderOperand(start, graph, userId, referencedTables, context);
    const endOperand = renderOperand(end, graph, userId, referencedTables, context);

    return {
      text: `${left.text} BETWEEN ${startOperand.text} AND ${endOperand.text}`,
      evaluate: (row) => {
        const value = left.evaluate(row) as any;
        const lower = startOperand.evaluate(row) as any;
        const upper = endOperand.evaluate(row) as any;
        if (value === undefined || value === null) return false;
        return value >= lower && value <= upper;
      },
    };
  }

  const rightOperand = Array.isArray(node.right)
    ? (() => {
        throw new ExecutionPlanError('Invalid comparison operand.');
      })()
    : renderOperand(node.right, graph, userId, referencedTables, context);

  const operator = node.operator.toUpperCase();
  return {
    text: `${left.text} ${operator} ${rightOperand.text}`,
    evaluate: (row) => {
      const leftValue = left.evaluate(row) as any;
      const rightValue = rightOperand.evaluate(row) as any;

      switch (node.operator) {
        case '=':
          return leftValue === rightValue;
        case '!=':
          return leftValue !== rightValue;
        case '>':
          return leftValue > rightValue;
        case '<':
          return leftValue < rightValue;
        default:
          return false;
      }
    },
  };
};

const buildCondition = (
  node: ConditionNode,
  graph: SchemaGraph,
  userId: string,
  referencedTables: Set<string>,
  context: RenderContext,
): ConditionBuildResult => {
  if (node.type === 'Comparison') {
    return buildComparison(node, graph, userId, referencedTables, context);
  }

  const left = buildCondition(node.left, graph, userId, referencedTables, context);
  const right = buildCondition(node.right, graph, userId, referencedTables, context);
  const operator = node.operator.toUpperCase();

  return {
    text: `(${left.text}) ${operator} (${right.text})`,
    evaluate: (row) =>
      node.operator === 'and'
        ? left.evaluate(row) && right.evaluate(row)
        : left.evaluate(row) || right.evaluate(row),
  };
};

const buildAdjacency = (graph: SchemaGraph): Map<string, JoinEdge[]> => {
  const adjacency = new Map<string, JoinEdge[]>();

  const register = (sourceTable: string, edge: JoinEdge) => {
    const list = adjacency.get(sourceTable);
    if (list) {
      list.push(edge);
    } else {
      adjacency.set(sourceTable, [edge]);
    }
  };

  for (const table of graph.tables) {
    adjacency.set(table.name, adjacency.get(table.name) ?? []);
  }

  for (const table of graph.tables) {
    for (const fk of table.fks) {
      register(fk.fromTable, {
        sourceTable: fk.fromTable,
        targetTable: fk.toTable,
        sourceColumn: fk.fromCol,
        targetColumn: fk.toCol,
      });
      register(fk.toTable, {
        sourceTable: fk.toTable,
        targetTable: fk.fromTable,
        sourceColumn: fk.toCol,
        targetColumn: fk.fromCol,
      });
    }
  }

  return adjacency;
};

const findJoinPath = (adjacency: Map<string, JoinEdge[]>, start: string, target: string): JoinEdge[] | null => {
  const queue: string[] = [start];
  const visited = new Set<string>([start]);
  const parents = new Map<string, { prev: string; edge: JoinEdge }>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === target) {
      break;
    }

    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.targetTable)) continue;
      visited.add(edge.targetTable);
      parents.set(edge.targetTable, { prev: current, edge });
      queue.push(edge.targetTable);
    }
  }

  if (!visited.has(target)) {
    return null;
  }

  const path: JoinEdge[] = [];
  let cursor = target;
  while (cursor !== start) {
    const entry = parents.get(cursor);
    if (!entry) break;
    path.unshift(entry.edge);
    cursor = entry.prev;
  }

  return path;
};

const createJoinStep = (edge: JoinEdge): JoinStep => {
  if (!hasColumn(edge.sourceTable, edge.sourceColumn) || !hasColumn(edge.targetTable, edge.targetColumn)) {
    throw new ExecutionPlanError(
      `Join columns ${edge.sourceTable}.${edge.sourceColumn} -> ${edge.targetTable}.${edge.targetColumn} are not configured.`,
    );
  }

  const text = `LEFT JOIN ${quoteIdentifier(edge.targetTable)} ON ${quoteIdentifier(edge.sourceTable)}.${quoteIdentifier(edge.sourceColumn)} = ${quoteIdentifier(edge.targetTable)}.${quoteIdentifier(edge.targetColumn)}`;

  return {
    sourceTableName: edge.sourceTable,
    sourceColumnName: edge.sourceColumn,
    targetTableName: edge.targetTable,
    targetColumnName: edge.targetColumn,
    text,
  };
};

const buildExecutionPlan = (
  program: ProgramNode,
  graph: SchemaGraph,
  userId: string,
): ExecutionPlan => {
  const referencedTables = new Set<string>();
  const aggregate = buildAggregate(program.body, graph, userId, referencedTables);
  const baseTableName = aggregate.column.tableName;
  const renderContext: RenderContext = {
    baseTable: aggregate.column.schemaTable,
    baseTableName,
  };

  let where: ConditionBuildResult | undefined;
  if (program.body.where) {
    where = buildCondition(program.body.where.condition, graph, userId, referencedTables, renderContext);
  }

  const adjacency = buildAdjacency(graph);
  const joins: JoinStep[] = [];
  const joinedTables = new Set<string>([baseTableName]);

  for (const tableName of referencedTables) {
    if (tableName === baseTableName) continue;

    const path = findJoinPath(adjacency, baseTableName, tableName);
    if (!path || path.length === 0) {
      throw new ExecutionPlanError(`Unable to resolve a join path from ${baseTableName} to ${tableName}.`);
    }

    for (const edge of path) {
      if (joinedTables.has(edge.targetTable)) continue;
      joins.push(createJoinStep(edge));
      joinedTables.add(edge.targetTable);
    }
  }

  return {
    baseTableName,
    aggregate,
    joins,
    where,
    toSqlString() {
      const parts = [
        `SELECT ${this.aggregate.text} AS value`,
        `FROM ${quoteIdentifier(this.baseTableName)}`,
      ];

      for (const join of this.joins) {
        parts.push(join.text);
      }

      if (this.where) {
        parts.push(`WHERE ${this.where.text}`);
      }

      return parts.join(' ');
    },
  };
};

const performJoin = (rows: RowScope[], step: JoinStep): RowScope[] => {
  const targetRows = getTableRows(step.targetTableName);
  const results: RowScope[] = [];

  for (const row of rows) {
    const source = row[step.sourceTableName];
    if (!source) {
      results.push({ ...row, [step.targetTableName]: undefined });
      continue;
    }

    const matches = targetRows.filter(
      (target) => target[step.targetColumnName] === source[step.sourceColumnName],
    );

    if (matches.length === 0) {
      results.push({ ...row, [step.targetTableName]: undefined });
      continue;
    }

    for (const match of matches) {
      results.push({ ...row, [step.targetTableName]: match });
    }
  }

  return results;
};

const evaluatePlanRows = (plan: ExecutionPlan): RowScope[] => {
  let rows: RowScope[] = getTableRows(plan.baseTableName).map((row) => ({ [plan.baseTableName]: row }));

  for (const join of plan.joins) {
    rows = performJoin(rows, join);
  }

  if (plan.where) {
    rows = rows.filter((row) => plan.where!.evaluate(row));
  }

  return rows;
};

const aggregateValues = (plan: ExecutionPlan, rows: RowScope[]): number | string | null => {
  const values = rows
    .map((row) => row[plan.aggregate.column.tableName]?.[plan.aggregate.column.columnName])
    .filter((value) => value !== null && value !== undefined);

  switch (plan.aggregate.functionName) {
    case 'count':
      return values.length;
    case 'sum': {
      if (values.length === 0) return null;
      return values.reduce((total, current) => total + Number(current), 0);
    }
    case 'avg': {
      if (values.length === 0) return null;
      const total = values.reduce((sum, current) => sum + Number(current), 0);
      return total / values.length;
    }
    case 'min': {
      if (values.length === 0) return null;
      if (typeof values[0] === 'number') {
        const numeric = values.map((value) => Number(value));
        return Math.min(...numeric);
      }
      return values.reduce((min, current) => (min < current ? min : current));
    }
    case 'max': {
      if (values.length === 0) return null;
      if (typeof values[0] === 'number') {
        const numeric = values.map((value) => Number(value));
        return Math.max(...numeric);
      }
      return values.reduce((max, current) => (max > current ? max : current));
    }
    default:
      return null;
  }
};

export const validateProgramAst = (input: unknown): ProgramNode => {
  const issues: ValidationIssue[] = [];
  if (!validateProgramNode(input, issues)) {
    throw new AstValidationError(issues);
  }
  return input as ProgramNode;
};

interface ExecuteReferenceParams {
  ast: ProgramNode;
  graph: SchemaGraph;
  userId: string;
}

export const executeReference = async ({ ast, graph, userId }: ExecuteReferenceParams): Promise<ExecuteReferenceResult> => {
  const plan = buildExecutionPlan(ast, graph, userId);
  const rows = evaluatePlanRows(plan);
  const aggregated = aggregateValues(plan, rows);

  return {
    rows: [{ value: aggregated }],
    columns: ['value'],
    rowCount: 1,
    sqlText: plan.toSqlString(),
  };
};

export const __test = {
  buildReferenceFieldOperand: (
    ref: RefNode,
    graph: SchemaGraph,
    userId: string,
    context: { baseTable: SchemaTable; baseTableName: string },
  ): OperandBuildResult => buildReferenceFieldOperand(ref, graph, userId, context),
};
