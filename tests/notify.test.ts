import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { echoSafe, emailHtml, escapeHtml, notify, sendEmail, subjectLine } from '@/lib/notify';
import { resetMemoryLimiter } from '@/lib/rate-limit';

test('escapeHtml escapes markup characters', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('emailHtml keeps **bold** but never emits visitor markup', () => {
  const html = emailHtml('Hi,\n\nThanks for **<a href="https://evil.example">Kinfolk</a>**');
  assert.ok(html.includes('<strong>&lt;a href=&quot;https://evil.example&quot;&gt;Kinfolk&lt;/a&gt;</strong>'));
  assert.ok(!html.includes('<a '));
});

test('echoSafe passes plain names and replaces anything link-like', () => {
  assert.equal(echoSafe('Delayed Gratification', 'x'), 'Delayed Gratification');
  assert.equal(echoSafe('Vol.2 Quarterly', 'x'), 'Vol.2 Quarterly');
  for (const bad of [
    'visit evil.com now',
    'https://evil.example/login',
    'www.evil.example',
    'reset at evil.co/x',
    'mail me@evil.example',
  ]) {
    assert.equal(echoSafe(bad, 'FALLBACK'), 'FALLBACK', bad);
  }
  assert.equal(echoSafe(undefined, 'FALLBACK'), 'FALLBACK');
  assert.equal(echoSafe('a\r\nBcc: x', 'f'), 'a Bcc: x');
  assert.equal(echoSafe('x'.repeat(100), 'f', 10), `${'x'.repeat(9)}…`);
});

test('subjectLine strips header-breaking characters and bounds length', () => {
  assert.equal(subjectLine('Hello\r\nBcc: victim@example.com'), 'Hello Bcc: victim@example.com');
  assert.equal(subjectLine('x'.repeat(400)).length, 150);
});

const realFetch = globalThis.fetch;
let calls: { url: string; body: Record<string, unknown> }[] = [];

beforeEach(() => {
  resetMemoryLimiter();
  calls = [];
  process.env.RESEND_API_KEY = 'test-key';
  process.env.NOTIFY_EMAIL = 'admin@example.com';
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.NOTIFY_EMAIL;
});

test('sendEmail caps confirmations per recipient', async () => {
  for (let i = 0; i < 5; i++) {
    await sendEmail({ to: 'Someone@Example.com', subject: 's', text: 't' });
  }
  assert.equal(calls.length, 3);
  await sendEmail({ to: 'other@example.com', subject: 's', text: 't' });
  assert.equal(calls.length, 4);
});

test('admin notifications are not throttled', async () => {
  for (let i = 0; i < 5; i++) await notify('s', 't');
  assert.equal(calls.length, 5);
});

test('sendEmail retries once on a 5xx', async () => {
  let n = 0;
  globalThis.fetch = (async () => {
    n += 1;
    return new Response('down', { status: n === 1 ? 503 : 200 });
  }) as typeof fetch;
  await sendEmail({ to: 'a@example.com', subject: 's', text: 't' });
  assert.equal(n, 2);
});

test('emailHtml links only the URLs passed explicitly', () => {
  const url = 'https://neesh.art/collect/auth?token_hash=abc&type=magiclink';
  const html = emailHtml(`Sign in:\n\n${url}\n\nor visit https://evil.example`, { [url]: 'Sign in to Neesh' });
  assert.ok(html.includes('<a href="https://neesh.art/collect/auth?token_hash=abc&amp;type=magiclink">Sign in to Neesh</a>'));
  assert.equal(html.match(/<a /g)?.length, 1);
});

test('throttle can be raised per email or turned off', async () => {
  for (let i = 0; i < 8; i++) await sendEmail({ to: 'reader@example.com', subject: 's', text: 't', throttle: 6 });
  assert.equal(calls.length, 6);
  for (let i = 0; i < 5; i++) await sendEmail({ to: 'cron@example.com', subject: 's', text: 't', throttle: false });
  assert.equal(calls.length, 11);
});
