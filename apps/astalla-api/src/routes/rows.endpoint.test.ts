import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'http';

import { createApp } from '../index.js';

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
});
