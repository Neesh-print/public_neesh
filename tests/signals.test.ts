import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, ipHash, isBot, payloadSchemas, signalSchema } from '@/lib/signals';

test('signalSchema requires a uuid title and a known type', () => {
  const ok = signalSchema.safeParse({ title_id: '7d9f2c3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f', signal_type: 'view' });
  assert.ok(ok.success);
  if (ok.success) assert.deepEqual(ok.data.payload, {});
  assert.equal(signalSchema.safeParse({ title_id: 'nope', signal_type: 'view' }).success, false);
  assert.equal(
    signalSchema.safeParse({ title_id: '7d9f2c3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f', signal_type: 'x' }).success,
    false
  );
});

test('payload schemas are strict and validate emails', () => {
  assert.ok(payloadSchemas.want_near.safeParse({ postcode: '97214', email: 'a@b.co' }).success);
  assert.equal(payloadSchemas.want_near.safeParse({ postcode: '97214', email: 'nope' }).success, false);
  assert.equal(
    payloadSchemas.want_near.safeParse({ postcode: '97214', email: 'a@b.co', extra: 1 }).success,
    false
  );
  assert.ok(payloadSchemas.view.safeParse({ referrer: 'https://google.com' }).success);
  assert.ok(payloadSchemas.stock_request.safeParse({ email: 'a@b.co', role: 'space' }).success);
});

test('ipHash stores nothing without a salt secret', () => {
  delete process.env.SIGNAL_SALT_SECRET;
  assert.equal(ipHash('203.0.113.7'), null);
});

test('ipHash is stable within a day and never the raw IP', () => {
  process.env.SIGNAL_SALT_SECRET = 'test-secret';
  const a = ipHash('203.0.113.7');
  assert.equal(a, ipHash('203.0.113.7'));
  assert.notEqual(a, ipHash('203.0.113.8'));
  assert.match(a ?? '', /^[0-9a-f]{64}$/);
  delete process.env.SIGNAL_SALT_SECRET;
});

test('isBot drops empty and known bot user agents', () => {
  assert.equal(isBot(null), true);
  assert.equal(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
  assert.equal(isBot('curl/8.0'), true);
  assert.equal(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15'), false);
});

test('clientIp takes the first forwarded address', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7');
  assert.equal(clientIp(new Headers()), '0.0.0.0');
});
