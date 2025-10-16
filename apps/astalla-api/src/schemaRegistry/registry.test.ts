import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSchemaGraphForUser } from './registry.js';

describe('getSchemaGraphForUser', () => {
  it('returns tables without exposing PII columns for a standard user', () => {
    const graph = getSchemaGraphForUser('dev-user');

    assert.ok(graph.tables.length > 0);

    const usersTable = graph.tables.find((table) => table.name === 'users');
    assert.ok(usersTable);
    assert.ok(!usersTable.columns.some((column) => column.name === 'email'));

    const ordersTable = graph.tables.find((table) => table.name === 'orders');
    assert.ok(ordersTable);
    assert.ok(ordersTable.columns.some((column) => column.name === 'user_id'));
    assert.deepEqual(ordersTable.fks, [
      { fromTable: 'orders', fromCol: 'user_id', toTable: 'users', toCol: 'id' }
    ]);
  });

  it('includes PII columns for privileged users', () => {
    const graph = getSchemaGraphForUser('admin');
    const usersTable = graph.tables.find((table) => table.name === 'users');

    assert.ok(usersTable);
    assert.ok(usersTable.columns.some((column) => column.name === 'email'));
  });
});
