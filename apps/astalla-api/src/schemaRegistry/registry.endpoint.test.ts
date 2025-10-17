import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import { app } from '../index.js';

let server: ReturnType<typeof app.listen> | undefined;
let baseUrl: string;

describe('GET /api/schema/registry', () => {
  before(() => {
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
      headers: { 'If-None-Match': etag }
    });

    assert.strictEqual(second.status, 304);
    assert.strictEqual(second.headers.get('etag'), etag);
    assert.strictEqual(await second.text(), '');
  });
});
