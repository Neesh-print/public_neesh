import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { hashKey, limitFormRequest, rateLimit, resetMemoryLimiter } from '@/lib/rate-limit';

beforeEach(() => {
  resetMemoryLimiter();
  delete process.env.UPSTASH_REDIS_REST_URL;
});

test('rateLimit allows up to the limit, then refuses', async () => {
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await rateLimit('k', 3, 60));
  assert.deepEqual(results, [true, true, true, false]);
  assert.equal(await rateLimit('other', 3, 60), true);
});

test('limitFormRequest allows a burst of 5 per client', async () => {
  const req = (ip: string) =>
    new NextRequest('https://neesh.art/api/claim', { method: 'POST', headers: { 'x-forwarded-for': ip } });
  const results = [];
  for (let i = 0; i < 6; i++) results.push(await limitFormRequest(req('203.0.113.7'), 'claim'));
  assert.deepEqual(results, [true, true, true, true, true, false]);
  assert.equal(await limitFormRequest(req('203.0.113.8'), 'claim'), true);
});

test('hashKey never returns the raw value', () => {
  assert.notEqual(hashKey('203.0.113.7'), '203.0.113.7');
  assert.equal(hashKey('A@B.co'), hashKey('a@b.co'));
});
