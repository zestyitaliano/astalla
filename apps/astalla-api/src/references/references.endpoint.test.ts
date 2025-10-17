import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import { app } from '../index.js';

let server: ReturnType<typeof app.listen> | undefined;
let baseUrl: string;

describe('POST /api/references/suggest', () => {
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

  it('returns ranked suggestions ordered by score', async () => {
    const response = await fetch(`${baseUrl}/api/references/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokensSoFar: 'us' }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(Array.isArray(payload.suggestions));
    assert.ok(payload.suggestions.length > 0);

    const scores = payload.suggestions.map((item: any) => item.totalScore);
    const sorted = [...scores].sort((a, b) => b - a);
    assert.deepEqual(scores, sorted);

    const topSuggestion = payload.suggestions[0];
    assert.equal(typeof topSuggestion.label, 'string');
    assert.ok(topSuggestion.label.length > 0);
    assert.ok(topSuggestion.scoreBreakdown.schema > 0);
  });
});
