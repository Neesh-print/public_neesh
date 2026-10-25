import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { collapse, HubSpotError, HubSpotRateLimited, setSubscription, upsertContacts } from '@/lib/hubspot';

const realFetch = globalThis.fetch;
let calls: { url: string; body: Record<string, unknown> }[] = [];
let respond: (url: string) => Response = () => new Response('{}', { status: 200 });

beforeEach(() => {
  calls = [];
  respond = () => new Response('{}', { status: 200 });
  process.env.HUBSPOT_ACCESS_TOKEN = 'pat-test';
  process.env.HUBSPOT_SUBSCRIPTION_ID = '12345';
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
    return respond(String(url));
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.HUBSPOT_ACCESS_TOKEN;
  delete process.env.HUBSPOT_SUBSCRIPTION_ID;
});

test('collapse keeps the latest consent change per address', () => {
  const groups = collapse([
    { id: 1, email: 'A@x.co', action: 'subscribe', source: 'form' },
    { id: 3, email: 'a@x.co', action: 'unsubscribe', source: 'settings' },
    { id: 2, email: 'b@x.co', action: 'upsert', source: 'backfill' },
    { id: 4, email: 'a@x.co', action: 'upsert', source: 'backfill' },
  ]);
  const a = groups.find((g) => g.email === 'a@x.co');
  assert.equal(a?.action, 'unsubscribe');
  assert.deepEqual(a?.ids, [1, 3, 4]);
  assert.equal(groups.find((g) => g.email === 'b@x.co')?.action, 'upsert');
});

test('upsertContacts batches by 100 and upserts by email', async () => {
  const emails = Array.from({ length: 150 }, (_, i) => `r${i}@x.co`);
  await upsertContacts(emails);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.endsWith('/crm/v3/objects/contacts/batch/upsert'));
  const inputs = calls[0].body.inputs as { idProperty: string; id: string }[];
  assert.equal(inputs.length, 100);
  assert.equal(inputs[0].idProperty, 'email');
  assert.equal((calls[1].body.inputs as unknown[]).length, 50);
});

test('setSubscription sends consent with a legal basis', async () => {
  await setSubscription('a@x.co', 'subscribe', 'collect:settings');
  assert.ok(calls[0].url.endsWith('/communication-preferences/v3/subscribe'));
  assert.equal(calls[0].body.emailAddress, 'a@x.co');
  assert.equal(calls[0].body.subscriptionId, '12345');
  assert.equal(calls[0].body.legalBasis, 'CONSENT_WITH_NOTICE');
});

test('already being in the requested state counts as done', async () => {
  respond = () => new Response('{"message":"Contact is already subscribed"}', { status: 400 });
  await setSubscription('a@x.co', 'subscribe', 'form');
  respond = () => new Response('{"message":"a@x.co is already unsubscribed"}', { status: 400 });
  await setSubscription('a@x.co', 'unsubscribe', 'settings');
});

test('other errors throw, rate limits throw HubSpotRateLimited', async () => {
  respond = () => new Response('{"message":"bad"}', { status: 500 });
  await assert.rejects(setSubscription('a@x.co', 'subscribe', 'form'), HubSpotError);
  respond = () => new Response('', { status: 429 });
  await assert.rejects(upsertContacts(['a@x.co']), HubSpotRateLimited);
});

test('consent changes need a subscription id', async () => {
  delete process.env.HUBSPOT_SUBSCRIPTION_ID;
  await assert.rejects(setSubscription('a@x.co', 'subscribe', 'form'), /HUBSPOT_SUBSCRIPTION_ID/);
  assert.equal(calls.length, 0);
});
