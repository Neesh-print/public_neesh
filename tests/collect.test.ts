import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isUnreviewedReaderRecord, safeNextPath } from '@/lib/collect/shared';
import { makeToken, readToken } from '@/lib/collect/tokens';

test('safeNextPath keeps paths on this site', () => {
  assert.equal(safeNextPath('/collect/wants'), '/collect/wants');
  assert.equal(safeNextPath('/titles/kinfolk?tab=issues#issues'), '/titles/kinfolk?tab=issues#issues');
  assert.equal(safeNextPath(null), '/collect/shelf');
  assert.equal(safeNextPath(''), '/collect/shelf');
});

test('safeNextPath rejects anything that leaves the site', () => {
  for (const bad of [
    '//evil.example',
    '/\\evil.example',
    '/\\/evil.example',
    'https://evil.example',
    'evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    `/${'a'.repeat(600)}`,
  ]) {
    assert.equal(safeNextPath(bad), '/collect/shelf', JSON.stringify(bad));
  }
});

test('only unapproved reader additions count as unreviewed', () => {
  assert.equal(isUnreviewedReaderRecord({ created_from: 'reader_created', review_status: 'pending' }), true);
  assert.equal(isUnreviewedReaderRecord({ created_from: 'reader_created', review_status: 'flagged' }), true);
  assert.equal(isUnreviewedReaderRecord({ created_from: 'reader_created', review_status: 'approved' }), false);
  // A report on an admin record does not hide it.
  assert.equal(isUnreviewedReaderRecord({ created_from: 'imported', review_status: 'flagged' }), false);
});

const env = { ...process.env };
afterEach(() => {
  process.env.COLLECT_LINK_SECRET = env.COLLECT_LINK_SECRET;
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (env.COLLECT_LINK_SECRET === undefined) delete process.env.COLLECT_LINK_SECRET;
  if (env.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('tokens round-trip and are bound to their action', () => {
  process.env.COLLECT_LINK_SECRET = 'link-secret';
  const t = makeToken('unfollow', 'user:title', 1);
  assert.equal(readToken(t, 'unfollow'), 'user:title');
  assert.equal(readToken(t, 'delete'), null);
  assert.equal(readToken(`${t}x`, 'unfollow'), null);
  assert.equal(readToken('garbage', 'unfollow'), null);
});

test('links signed before COLLECT_LINK_SECRET was set keep working', () => {
  delete process.env.COLLECT_LINK_SECRET;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-key';
  const old = makeToken('unfollow', 'user:title', 365);
  process.env.COLLECT_LINK_SECRET = 'new-secret';
  assert.equal(readToken(old, 'unfollow'), 'user:title');
  const fresh = makeToken('unfollow', 'user:title', 365);
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(readToken(fresh, 'unfollow'), 'user:title');
  assert.equal(readToken(old, 'unfollow'), null);
});
