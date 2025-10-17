import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import { performance } from 'node:perf_hooks';
import type { SchemaColumn, SchemaTable } from '@shared/api';

import { app } from '../index.js';
import { REF_AUTOCOMPLETE_V1 } from '@shared/api';
import { setFeatureFlagOverride, resetFeatureFlagOverrides } from '../featureFlags.js';
import { BASE_SCHEMA } from '../schemaRegistry/registry.js';

const buildBenchmarkSchema = (tableCount: number, columnCount: number): SchemaTable[] => {
  const tables: SchemaTable[] = [];
  let remainingColumns = columnCount;

  for (let tableIndex = 0; tableIndex < tableCount; tableIndex += 1) {
    const tablesLeft = tableCount - tableIndex;
    const columnsForTable = Math.max(1, Math.floor(remainingColumns / tablesLeft));
    const tableName = `benchmark_table_${tableIndex}`;
    const columns: SchemaColumn[] = [];

    for (let columnIndex = 0; columnIndex < columnsForTable; columnIndex += 1) {
      const name = columnIndex === 0 && tableIndex === 0 ? 'TotalRent' : `Column${columnIndex}`;
      columns.push({
        id: `${tableName}.${name}`,
        name,
        type: columnIndex % 3 === 0 ? 'numeric' : 'text',
      });
    }

    tables.push({
      id: tableName,
      name: tableName,
      label: `Benchmark Table ${tableIndex + 1}`,
      columns,
      fks: [],
    });

    remainingColumns -= columnsForTable;
  }

  if (remainingColumns > 0) {
    const lastTable = tables[tables.length - 1];
    for (let i = 0; i < remainingColumns; i += 1) {
      const index = lastTable.columns.length + i;
      lastTable.columns.push({
        id: `${lastTable.name}.Extra${index}`,
        name: `Extra${index}`,
        type: 'text',
      });
    }
  }

  return tables;
};

describe('POST /api/references/suggest benchmark', () => {
  let server: ReturnType<typeof app.listen> | undefined;
  let baseUrl: string;
  let originalTables: SchemaTable[] = [];

  before(() => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it('responds under 100ms on average with generated schema', async () => {
    const generated = buildBenchmarkSchema(150, 4000);
    originalTables = structuredClone(BASE_SCHEMA.tables);

    BASE_SCHEMA.tables.splice(0, BASE_SCHEMA.tables.length, ...generated);
    setFeatureFlagOverride(REF_AUTOCOMPLETE_V1, true);

    try {
      // Warm-up request
      await fetch(`${baseUrl}/api/references/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokensSoFar: 'rent' }),
      });

      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i += 1) {
        const start = performance.now();
        const response = await fetch(`${baseUrl}/api/references/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokensSoFar: 'rent' }),
        });

        const elapsed = performance.now() - start;
        durations.push(elapsed);

        assert.equal(response.status, 200);
        const payload = await response.json();
        assert.ok(Array.isArray(payload.suggestions));
      }

      const average = durations.reduce((acc, value) => acc + value, 0) / durations.length;
      console.info(
        `Average suggest latency over ${iterations} runs: ${average.toFixed(2)}ms`,
      );
      assert.ok(
        average < 100,
        `Expected average response under 100ms but measured ${average.toFixed(2)}ms`,
      );
    } finally {
      BASE_SCHEMA.tables.splice(0, BASE_SCHEMA.tables.length, ...originalTables);
      resetFeatureFlagOverrides();
    }
  });
});
