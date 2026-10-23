import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { HONEYPOT_FIELD, domainMatch, readSubmission, redirectWithNotice } from '@/lib/forms';

function formRequest(fields: Record<string, string>, headers: Record<string, string> = {}) {
  return new NextRequest('https://neesh.art/api/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(fields).toString(),
  });
}

test('form submissions are trimmed, empties dropped, honeypot removed', async () => {
  const sub = await readSubmission(formRequest({ email: ' a@b.co ', name: '  ', [HONEYPOT_FIELD]: '' }));
  assert.ok(sub.ok);
  if (!sub.ok) return;
  assert.equal(sub.isForm, true);
  assert.equal(sub.trapped, false);
  assert.deepEqual(sub.raw, { email: 'a@b.co' });
});

test('a filled honeypot marks the submission trapped', async () => {
  const sub = await readSubmission(formRequest({ email: 'a@b.co', [HONEYPOT_FIELD]: 'spam' }));
  assert.ok(sub.ok && sub.trapped);
});

test('JSON honeypot key is stripped before schemas see it', async () => {
  const req = new NextRequest('https://neesh.art/api/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.co', [HONEYPOT_FIELD]: 'x' }),
  });
  const sub = await readSubmission(req);
  assert.ok(sub.ok && sub.trapped);
  if (sub.ok) assert.deepEqual(sub.raw, { email: 'a@b.co' });
});

test('malformed JSON is reported as not ok', async () => {
  const req = new NextRequest('https://neesh.art/api/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal((await readSubmission(req)).ok, false);
});

test('redirectWithNotice follows a same-origin referer only', () => {
  const same = redirectWithNotice(formRequest({}, { referer: 'https://neesh.art/titles/kinfolk?x=1' }), 'claim');
  assert.equal(same.status, 303);
  assert.equal(same.headers.get('location'), 'https://neesh.art/titles/kinfolk?x=1&submitted=claim');

  const foreign = redirectWithNotice(formRequest({}, { referer: 'https://evil.example/phish' }), 'claim');
  assert.equal(foreign.headers.get('location'), 'https://neesh.art/index?submitted=claim');

  const hashed = redirectWithNotice(formRequest({}), 'stockist', '/index', 'stockists');
  assert.equal(hashed.headers.get('location'), 'https://neesh.art/index?submitted=stockist#stockists');
});

test('domainMatch compares the email domain with the website host', () => {
  assert.equal(domainMatch('ed@kinfolk.com', 'https://www.kinfolk.com'), true);
  assert.equal(domainMatch('ed@mail.kinfolk.com', 'https://kinfolk.com'), true);
  assert.equal(domainMatch('ed@notkinfolk.com', 'https://kinfolk.com'), false);
  assert.equal(domainMatch('ed@kinfolk.com', null), false);
  assert.equal(domainMatch('ed@kinfolk.com', 'not a url'), false);
});
