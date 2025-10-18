import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import { REF_AUTOCOMPLETE_V1 } from '@shared/api';

import { app } from '../index.js';
import { resetFeatureFlagOverrides, setFeatureFlagOverride } from '../featureFlags.js';
import { referencesTelemetry } from '../telemetry/references.js';

let server: ReturnType<typeof app.listen> | undefined;
let baseUrl: string;

describe('POST /api/references/suggest', () => {
  before(() => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    setFeatureFlagOverride(REF_AUTOCOMPLETE_V1, true);
    referencesTelemetry.drain();
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

  afterEach(() => {
    resetFeatureFlagOverrides();
    referencesTelemetry.drain();
  });

  it('returns 404 when feature is disabled', async () => {
    setFeatureFlagOverride(REF_AUTOCOMPLETE_V1, false);

    const response = await fetch(`${baseUrl}/api/references/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokensSoFar: 'us' }),
    });

    assert.equal(response.status, 404);
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

  it('returns reference columns from the active table when using @{this.', async () => {
    const response = await fetch(`${baseUrl}/api/references/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokensSoFar: '@{this.', cursorContext: { tableId: 'leases' } }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(Array.isArray(payload.suggestions));
    assert.ok(payload.suggestions.length >= 3);

    const labels = payload.suggestions.map((item: any) => item.label);
    assert.ok(labels.includes('Unit'));
    assert.ok(labels.includes('RelatedCharges'));
    assert.ok(labels.includes('UnlinkedReference'));
    assert.ok(!labels.some((label: string) => /TotalRent|Status/.test(label)), 'non-reference columns should be filtered');
  });

  it('returns nested target columns for configured references', async () => {
    const response = await fetch(`${baseUrl}/api/references/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokensSoFar: '@{this.Unit.', cursorContext: { tableId: 'leases' } }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(Array.isArray(payload.suggestions));
    assert.ok(payload.suggestions.length > 0);
    assert.ok(
      payload.suggestions.every((item: any) => typeof item.label === 'string' && item.label.startsWith('Unit › Units ›')),
      'suggestions should reference nested target columns',
    );
  });

  it('returns an action when a reference column is missing a target table', async () => {
    const response = await fetch(`${baseUrl}/api/references/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokensSoFar: '@{this.UnlinkedReference.', cursorContext: { tableId: 'leases' } }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(Array.isArray(payload.suggestions));
    assert.equal(payload.suggestions.length, 1);

    const [action] = payload.suggestions;
    assert.equal(action.kind, 'action');
    assert.equal(action.label, 'Set target table…');
  });

  it('records telemetry events posted from the UI', async () => {
    const response = await fetch(`${baseUrl}/api/references/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'quickFixApplied', code: 'sum(Leases.TotalRent)' }),
    });

    assert.equal(response.status, 202);
    const events = referencesTelemetry.drain();
    assert.ok(events.some((event) => event.type === 'quickFixApplied'));
  });
});
