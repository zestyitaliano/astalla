import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSchemaGraphForUser } from './registry.js';

describe('getSchemaGraphForUser', () => {
  it('returns tables without exposing PII columns for a standard user', () => {
    const graph = getSchemaGraphForUser('dev-user');

    assert.ok(graph.tables.length > 0);

    const leasesTable = graph.tables.find((table) => table.name === 'leases');
    assert.ok(leasesTable);
    assert.ok(!leasesTable.columns.some((column) => column.name === 'ResidentEmail'));

    const unitsTable = graph.tables.find((table) => table.name === 'units');
    assert.ok(unitsTable);
    assert.deepEqual(leasesTable?.fks, [
      { fromTable: 'leases', fromCol: 'UnitId', toTable: 'units', toCol: 'Id' }
    ]);
  });

  it('includes PII columns for privileged users', () => {
    const graph = getSchemaGraphForUser('admin');
    const leasesTable = graph.tables.find((table) => table.name === 'leases');

    assert.ok(leasesTable);
    assert.ok(leasesTable.columns.some((column) => column.name === 'ResidentEmail'));
  });
});
