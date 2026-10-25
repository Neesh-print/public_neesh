import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { resetMemoryLimiter } from '@/lib/rate-limit';
import { HONEYPOT_FIELD } from '@/lib/forms';
import { POST as suggestTitle } from '../app/api/suggest-title/route';
import { POST as revalidate } from '../app/api/revalidate/route';

// Route-level regression checks that need no database: with the Supabase
// env unset, serviceClient() throws inside the handler's try block, so these
// exercise everything around the write.

beforeEach(() => {
  resetMemoryLimiter();
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

function jsonPost(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9', ...headers },
    body: JSON.stringify(body),
  });
}

const suggestion = { title_name: 'Kinfolk', email: 'reader@example.com', role: 'reader' };

test('suggest-title rejects invalid JSON bodies with 400', async () => {
  const res = await suggestTitle(jsonPost('https://neesh.art/api/suggest-title', { email: 'nope' }));
  assert.equal(res.status, 400);
});

test('suggest-title answers 429 after the burst limit', async () => {
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    statuses.push((await suggestTitle(jsonPost('https://neesh.art/api/suggest-title', suggestion))).status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
});

test('a trapped form post is answered like a success', async () => {
  const req = new NextRequest('https://neesh.art/api/suggest-title', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      referer: 'https://neesh.art/add-title',
      'x-forwarded-for': '198.51.100.10',
    },
    body: new URLSearchParams({ ...suggestion, [HONEYPOT_FIELD]: 'bot' }).toString(),
  });
  const res = await suggestTitle(req);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'https://neesh.art/add-title?submitted=suggestion');
});

test('revalidate requires the bearer token and ignores the query string', async () => {
  process.env.REVALIDATE_TOKEN = 'secret-token';
  const viaQuery = await revalidate(jsonPost('https://neesh.art/api/revalidate?token=secret-token', {}));
  assert.equal(viaQuery.status, 401);
  const wrong = await revalidate(
    jsonPost('https://neesh.art/api/revalidate', {}, { authorization: 'Bearer nope' })
  );
  assert.equal(wrong.status, 401);
  delete process.env.REVALIDATE_TOKEN;
  const unset = await revalidate(
    jsonPost('https://neesh.art/api/revalidate', {}, { authorization: 'Bearer secret-token' })
  );
  assert.equal(unset.status, 401);
});
