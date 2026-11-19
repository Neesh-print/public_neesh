import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGone } from '@/lib/gone';

test('titles are gone when removed, ceased, or their publisher is', () => {
  assert.equal(isGone('titles', { removed: false, status: 'active', publisher: { removed: false, eligible: true } }), false);
  assert.equal(isGone('titles', { removed: true, status: 'active' }), true);
  assert.equal(isGone('titles', { removed: false, status: 'ceased' }), true);
  assert.equal(isGone('titles', { status: 'dormant', publisher: { removed: true } }), true);
  assert.equal(isGone('titles', { status: 'dormant', publisher: { eligible: false } }), true);
  assert.equal(isGone('titles', { status: 'dormant', publisher: null }), false);
});

test('publishers are gone when removed or ineligible', () => {
  assert.equal(isGone('publishers', { removed: false, eligible: true }), false);
  assert.equal(isGone('publishers', { removed: true, eligible: true }), true);
  assert.equal(isGone('publishers', { removed: false, eligible: false }), true);
});
