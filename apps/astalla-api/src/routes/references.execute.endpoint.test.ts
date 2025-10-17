import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import { app } from '../index.js';

const buildAst = () => ({
  type: 'Program',
  body: {
    type: 'FunctionCall',
    name: 'sum',
    argument: {
      type: 'Ref',
      path: [
        { type: 'Identifier', name: 'Leases' },
        { type: 'Identifier', name: 'TotalRent' },
      ],
    },
  },
});

describe('POST /api/references/execute', () => {
  let server: ReturnType<typeof app.listen> | undefined;
  let baseUrl: string;

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

  it('returns aggregated results for a valid AST', async () => {
    const response = await fetch(`${baseUrl}/api/references/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ast: buildAst() }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload.columns, ['value']);
    assert.equal(payload.rowCount, 1);
    assert.equal(payload.rows[0]?.value, 8550);
  });

  it('returns validation errors for malformed input', async () => {
    const response = await fetch(`${baseUrl}/api/references/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ast: { foo: 'bar' } }),
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.ok(Array.isArray(payload.issues));
  });

  it('enforces permission checks', async () => {
    const restrictedAst = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'sum',
        argument: {
          type: 'Ref',
          path: [
            { type: 'Identifier', name: 'Leases' },
            { type: 'Identifier', name: 'ResidentEmail' },
          ],
        },
      },
    };

    const response = await fetch(`${baseUrl}/api/references/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ast: restrictedAst }),
    });

    assert.equal(response.status, 403);
    const payload = await response.json();
    assert.match(payload.message, /permission/i);
  });
});
