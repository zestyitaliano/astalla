import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'http';

import { createApp } from '../index.js';
import { BASE_SCHEMA } from '../schemaRegistry/registry.js';

const ORIGINAL_TABLES = structuredClone(BASE_SCHEMA.tables);

const restoreBaseSchema = () => {
  BASE_SCHEMA.tables.splice(0, BASE_SCHEMA.tables.length, ...structuredClone(ORIGINAL_TABLES));
};

describe('Column management endpoints', () => {
  let server: Server | undefined;
  let baseUrl: string;

  before(() => {
    const app = createApp({
      beforeRoutes: [
        (req, _res, next) => {
          (req as any).user = { id: 'dev-user' };
          next();
        },
      ],
    });

    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    restoreBaseSchema();
  });

  beforeEach(() => {
    restoreBaseSchema();
  });

  afterEach(() => {
    restoreBaseSchema();
  });

  describe('PATCH /api/tables/:tableId/columns/:columnId', () => {
    it('updates the column with reference configuration and persists it to the registry', async () => {
      const response = await fetch(
        `${baseUrl}/api/tables/${encodeURIComponent('public.leases')}/columns/${encodeURIComponent('leases.UnitId')}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reference',
            referenceConfig: {
              targetTableId: 'public.units',
              displayColumnId: 'units.Name',
            },
          }),
        },
      );

      assert.equal(response.status, 200);
      const payload = await response.json();
      const column = payload.column;

      assert.equal(column.type, 'reference');
      assert.ok(column.referenceConfig);
      assert.equal(column.referenceConfig.targetTableId, 'public.units');
      assert.equal(column.referenceConfig.displayColumnId, 'units.Name');
      assert.equal(column.referenceConfig.cardinality, 'single');
      assert.equal(column.referenceConfig.enforceForeignKey, false);

      const registryResponse = await fetch(`${baseUrl}/api/schema/registry`);
      assert.equal(registryResponse.status, 200);
      const registry = await registryResponse.json();
      const leasesTable = registry.tables.find((table: any) => table.id === 'public.leases');
      assert.ok(leasesTable, 'Leases table should be present');
      const updatedColumn = leasesTable.columns.find((item: any) => item.id === 'leases.UnitId');
      assert.ok(updatedColumn, 'Updated column should exist');
      assert.equal(updatedColumn.type, 'reference');
      assert.deepEqual(updatedColumn.referenceConfig, {
        targetTableId: 'public.units',
        displayColumnId: 'units.Name',
        cardinality: 'single',
        enforceForeignKey: false,
      });
    });

    it('fails validation when the target table does not exist', async () => {
      const response = await fetch(
        `${baseUrl}/api/tables/${encodeURIComponent('public.leases')}/columns/${encodeURIComponent('leases.UnitId')}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reference',
            referenceConfig: {
              targetTableId: 'public.unknown',
            },
          }),
        },
      );

      assert.equal(response.status, 400);
      const payload = await response.json();
      assert.match(payload.message, /target table/i);
    });

    it('fails validation when the display column is missing from the target table', async () => {
      const response = await fetch(
        `${baseUrl}/api/tables/${encodeURIComponent('public.leases')}/columns/${encodeURIComponent('leases.UnitId')}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reference',
            referenceConfig: {
              targetTableId: 'public.units',
              displayColumnId: 'leases.DoesNotExist',
            },
          }),
        },
      );

      assert.equal(response.status, 400);
      const payload = await response.json();
      assert.match(payload.message, /display column/i);
    });
  });

});
