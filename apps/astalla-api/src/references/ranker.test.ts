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
});
