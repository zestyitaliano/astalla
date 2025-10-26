import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'http';

import { createApp } from '../index.js';
import {
  __resetDynamicTableLoadersForTests,
  __setDynamicTableLoaderForTests,
  __setDynamicTableRowsLoaderForTests,
} from '../services/tables.service.js';

describe('Row search endpoint', () => {
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
  });

  it('returns items for a table with default limit', async () => {
    const response = await fetch(
      `${baseUrl}/api/rows?tableId=${encodeURIComponent('public.units')}`,
    );

    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.ok(Array.isArray(payload.items));
    assert.ok(payload.items.length > 0);

    const first = payload.items[0];
    assert.equal(first.id, 'unit-1');
    assert.equal(first.preview, 'Unit 1A');
    assert.ok(first.fields);
    assert.equal(first.fields['units.Name'], 'Unit 1A');
  });

  it('supports pagination with limit and cursor', async () => {
    const initialResponse = await fetch(
      `${baseUrl}/api/rows?tableId=${encodeURIComponent('public.units')}&limit=1`,
    );

    assert.equal(initialResponse.status, 200);
    const initialPayload = await initialResponse.json();

    assert.equal(initialPayload.items.length, 1);
    assert.equal(initialPayload.items[0].preview, 'Unit 1A');
    assert.equal(initialPayload.nextCursor, '1');

    const nextResponse = await fetch(
      `${baseUrl}/api/rows?tableId=${encodeURIComponent('public.units')}&limit=1&cursor=${encodeURIComponent(initialPayload.nextCursor)}`,
    );

    assert.equal(nextResponse.status, 200);
    const nextPayload = await nextResponse.json();
    assert.equal(nextPayload.items.length, 1);
    assert.equal(nextPayload.items[0].preview, 'Unit 2B');
  });

  it('filters results by query against the preview text', async () => {
    const response = await fetch(
      `${baseUrl}/api/rows?tableId=${encodeURIComponent('public.units')}&q=${encodeURIComponent('unit 3')}`,
    );

    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(payload.items.length, 1);
    assert.equal(payload.items[0].preview, 'Unit 3C');
  });

  describe('dynamic tables', () => {
    const dynamicTable = {
      id: 'dyn.table',
      orgId: 'demo-org',
      name: 'dyn.table',
      description: 'Dynamic Table',
      columns: [
        { id: 'dyn-col-1', name: 'Title', type: 'TEXT' },
        { id: 'dyn-col-2', name: 'Count', type: 'NUMBER' },
      ],
    };

    const dynamicRows = [
      {
        id: 'row-1',
        tableId: dynamicTable.id,
        cells: [
          { columnId: 'dyn-col-1', value: 'Alpha' },
          { columnId: 'dyn-col-2', value: 3 },
        ],
      },
      {
        id: 'row-2',
        tableId: dynamicTable.id,
        cells: [
          { columnId: 'dyn-col-1', value: 'Beta' },
          { columnId: 'dyn-col-2', value: 7 },
        ],
      },
    ];

    before(() => {
      __setDynamicTableLoaderForTests(async (identifier) => {
        if (identifier === dynamicTable.id || identifier === dynamicTable.name) {
          return { ...dynamicTable };
        }
        return null;
      });
      __setDynamicTableRowsLoaderForTests(async () => dynamicRows.map((row) => ({ ...row })));
    });

    after(() => {
      __resetDynamicTableLoadersForTests();
    });

    it('returns rows for a dynamic table', async () => {
      const response = await fetch(
        `${baseUrl}/api/rows?tableId=${encodeURIComponent(dynamicTable.id)}`,
      );

      assert.equal(response.status, 200);
      const payload = await response.json();

      assert.ok(Array.isArray(payload.items));
      assert.equal(payload.items.length, dynamicRows.length);
      assert.equal(payload.items[0].id, 'row-1');
      assert.equal(payload.items[0].preview, 'Alpha');
      assert.equal(payload.items[0].fields['dyn-col-1'], 'Alpha');
    });

    it('returns 404 when a dynamic table is missing', async () => {
      const response = await fetch(
        `${baseUrl}/api/rows?tableId=${encodeURIComponent('missing.dynamic')}`,
      );

      assert.equal(response.status, 404);
    });
  });
});
