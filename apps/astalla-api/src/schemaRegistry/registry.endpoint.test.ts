import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'http';

import { createApp } from '../index.js';

const closeServer = async (server: Server | undefined) => {
  if (!server) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
};

describe('GET /api/schema/registry', () => {
  describe('when unauthenticated', () => {
    let server: Server | undefined;
    let baseUrl: string;

    before(() => {
      const app = createApp();
      server = app.listen(0);
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
    });

    after(async () => {
      await closeServer(server);
    });

    it('returns 401 for unauthenticated requests', async () => {
      const response = await fetch(`${baseUrl}/api/schema/registry`);
      assert.strictEqual(response.status, 401);
    });
  });

  describe('when authenticated', () => {
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
      await closeServer(server);
    });

    it('returns the schema graph with caching headers', async () => {
      const response = await fetch(`${baseUrl}/api/schema/registry`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.headers.get('cache-control'), 'no-cache');

      const etag = response.headers.get('etag');
      assert.ok(etag);

      const payload = await response.json();
      assert.ok(Array.isArray(payload.tables));

      const leasesTable = payload.tables.find((table: any) => table.name === 'leases');
      assert.ok(leasesTable);
      assert.ok(!leasesTable.columns.some((column: any) => column.name === 'ResidentEmail'));
    });

    it('returns 304 when the ETag matches', async () => {
      const first = await fetch(`${baseUrl}/api/schema/registry`);
      const etag = first.headers.get('etag');
      assert.ok(etag);

      const second = await fetch(`${baseUrl}/api/schema/registry`, {
        headers: { 'If-None-Match': etag },
      });

      assert.strictEqual(second.status, 304);
      assert.strictEqual(second.headers.get('etag'), etag);
      assert.strictEqual(await second.text(), '');
    });
  });
});
