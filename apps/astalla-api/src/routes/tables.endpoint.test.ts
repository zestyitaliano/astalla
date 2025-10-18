import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'http';

import { createApp } from '../index.js';
import {
  __defaultCanRead,
  __resetCanReadOverrideForTests,
  __setCanReadOverrideForTests,
} from '../auth/permissions.js';
import type { PermissionTarget } from '../auth/permissions.js';

describe('Table lookup endpoints', () => {
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

  it('returns tables visible to the user', async () => {
    const response = await fetch(`${baseUrl}/api/tables/choices`);

    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.ok(Array.isArray(payload));
    assert.ok(payload.some((table: any) => table.id === 'public.units'));
    assert.ok(payload.every((table: any) => typeof table.id === 'string'));
  });

  it('returns readable columns for a table', async () => {
    const response = await fetch(
      `${baseUrl}/api/tables/${encodeURIComponent('public.leases')}/columns/choices`,
    );

    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.ok(Array.isArray(payload));
    assert.ok(payload.length > 0);
    assert.ok(payload.every((column: any) => typeof column.type === 'string'));
    assert.ok(!payload.some((column: any) => column.name === 'ResidentEmail'));
  });

  it('omits tables the user cannot read', async () => {
    const originalCanRead = __defaultCanRead;
    __setCanReadOverrideForTests((userId: string, target: PermissionTarget) => {
      if (target.kind === 'table' && target.table.id === 'public.leases') {
        return false;
      }
      return originalCanRead(userId, target);
    });

    try {
      const tableChoicesResponse = await fetch(`${baseUrl}/api/tables/choices`);
      assert.equal(tableChoicesResponse.status, 200);
      const tables = await tableChoicesResponse.json();
      assert.ok(!tables.some((table: any) => table.id === 'public.leases'));

      const columnChoicesResponse = await fetch(
        `${baseUrl}/api/tables/${encodeURIComponent('public.leases')}/columns/choices`,
      );
      assert.equal(columnChoicesResponse.status, 403);
    } finally {
      __resetCanReadOverrideForTests();
    }
  });
});
