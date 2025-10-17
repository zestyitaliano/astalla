import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ProgramNode, RefNode, ValueNode, WhereNode } from './astTypes.js';
import { getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import { executeReference, ExecutionPlanError, PermissionError } from './executeReference.js';

const createRef = (table: string, column: string): RefNode => ({
  type: 'Ref',
  path: [
    { type: 'Identifier', name: table },
    { type: 'Identifier', name: column },
  ],
});

const createValue = (value: ValueNode['value']): ValueNode => ({
  type: 'Value',
  value,
});

const createWhere = (left: RefNode, operator: string, right: ValueNode | RefNode | ValueNode[]): WhereNode => ({
  type: 'Where',
  condition: {
    type: 'Comparison',
    operator: operator as any,
    left,
    right: right as any,
  },
});

describe('executeReference', () => {
  const graph = getSchemaGraphForUser('dev-user');

  it('computes the sum of total rent', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'sum',
        argument: createRef('Leases', 'TotalRent'),
      },
    };

    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0]?.value, 8550);
    assert.ok(/SELECT SUM\("leases"\."TotalRent"\)/.test(result.sqlText));
  });

  it('filters by status and computes the average', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'avg',
        argument: createRef('Leases', 'TotalRent'),
        where: createWhere(createRef('Leases', 'Status'), '=', createValue('Active')),
      },
    };

    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    const value = Number(result.rows[0]?.value);
    assert.ok(Math.abs(value - 2133.3333333333335) < 1e-6);
    assert.ok(/WHERE "leases"\."Status" = \?/.test(result.sqlText));
  });

  it('automatically joins related tables when filters reference them', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'sum',
        argument: createRef('Leases', 'TotalRent'),
        where: createWhere(createRef('Units', 'Bedrooms'), '=', createValue(2)),
      },
    };

    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    assert.equal(result.rows[0]?.value, 4250);
    assert.ok(/LEFT JOIN "units" ON "leases"\."UnitId" = "units"\."Id"/.test(result.sqlText));
  });

  it('supports logical conditions', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'count',
        argument: createRef('Leases', 'Id'),
        where: {
          type: 'Where',
          condition: {
            type: 'Logical',
            operator: 'or',
            left: {
              type: 'Comparison',
              operator: '=',
              left: createRef('Leases', 'Status'),
              right: createValue('Pending'),
            },
            right: {
              type: 'Comparison',
              operator: '=',
              left: createRef('Leases', 'Year'),
              right: createValue(2024),
            },
          },
        },
      },
    };

    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    assert.equal(result.rows[0]?.value, 3);
  });

  it('throws when accessing a restricted column', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'sum',
        argument: createRef('Leases', 'ResidentEmail'),
      },
    };

    await assert.rejects(() => executeReference({ ast, graph, userId: 'dev-user' }), PermissionError);
  });

  it('throws when a join path cannot be resolved', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'sum',
        argument: createRef('Leases', 'TotalRent'),
        where: createWhere(createRef('Properties', 'Name'), '=', createValue('River Place')),
      },
    };

    await assert.rejects(() => executeReference({ ast, graph, userId: 'dev-user' }), ExecutionPlanError);
  });
});
