import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rankReferences, type ReferenceCandidate } from './ranker.js';

describe('rankReferences', () => {
  it('prioritises prefix matches over synonyms and unrelated items', () => {
    const candidates: ReferenceCandidate[] = [
      { id: 'tbl:rentals', kind: 'table', name: 'rentals', label: 'Rentals' },
      {
        id: 'col:total_rent',
        kind: 'column',
        name: 'total_rent',
        label: 'total_rent',
        tableId: 'tbl:financials',
        tableName: 'financials',
      },
      { id: 'tbl:orders', kind: 'table', name: 'orders', label: 'Orders' },
    ];

    const suggestions = rankReferences({ candidates, tokensSoFar: 'rent' });

    assert.equal(suggestions[0]?.id, 'tbl:rentals');
    assert.equal(suggestions[1]?.id, 'col:total_rent');
    assert.ok(suggestions[0].totalScore > suggestions[1].totalScore);
    assert.ok(suggestions[1].scoreBreakdown.semantic > 0);
    assert.ok(suggestions[suggestions.length - 1].totalScore < suggestions[0].totalScore);
  });

  it('applies context and data boosts for matching columns when filtering', () => {
    const candidates: ReferenceCandidate[] = [
      {
        id: 'users.is_active',
        kind: 'column',
        name: 'is_active',
        label: 'is_active',
        tableId: 'public.users',
        tableName: 'users',
        dataType: 'boolean',
      },
      {
        id: 'orders.created_at',
        kind: 'column',
        name: 'created_at',
        label: 'created_at',
        tableId: 'public.orders',
        tableName: 'orders',
        dataType: 'timestamp',
      },
    ];

    const [suggestion] = rankReferences({
      candidates,
      tokensSoFar: 'is_',
      cursorContext: { tableId: 'public.users', editingFieldType: 'filter' },
    });

    assert.equal(suggestion.id, 'users.is_active');
    assert.ok(suggestion.scoreBreakdown.context > 0);
    assert.ok(suggestion.scoreBreakdown.data > 0);
  });

  it('sorts suggestions alphabetically when scores match', () => {
    const candidates: ReferenceCandidate[] = [
      { id: 'tbl:beta', kind: 'table', name: 'beta', label: 'Beta' },
      { id: 'tbl:alpha', kind: 'table', name: 'alpha', label: 'Alpha' },
      { id: 'tbl:charlie', kind: 'table', name: 'charlie', label: 'Charlie' },
    ];

    const suggestions = rankReferences({ candidates, tokensSoFar: '' });

    assert.deepEqual(
      suggestions.map((item) => item.label),
      ['Alpha', 'Beta', 'Charlie'],
    );
    const totals = suggestions.map((item) => item.totalScore);
    assert.ok(totals.every((score) => Math.abs(score - totals[0]!) < 1e-9));
  });

  it('prioritises context matches when schema scores tie', () => {
    const candidates: ReferenceCandidate[] = [
      {
        id: 'users.status',
        kind: 'column',
        name: 'status',
        label: 'Status',
        tableId: 'public.users',
        tableName: 'users',
        dataType: 'text',
      },
      {
        id: 'orders.status',
        kind: 'column',
        name: 'status',
        label: 'Status',
        tableId: 'public.orders',
        tableName: 'orders',
        dataType: 'text',
      },
    ];

    const suggestions = rankReferences({
      candidates,
      tokensSoFar: 'status',
      cursorContext: { tableId: 'public.users', editingFieldType: 'expr' },
    });

    assert.equal(suggestions[0]?.id, 'users.status');
    assert.ok(suggestions[0]!.scoreBreakdown.context > suggestions[1]!.scoreBreakdown.context);
  });
});
