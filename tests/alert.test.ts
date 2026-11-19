import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { alert } from '@/lib/alert';

const realFetch = globalThis.fetch;
const saved = { ...process.env };
let calls: { url: string; body: unknown }[] = [];

beforeEach(() => {
  calls = [];
  Object.assign(process.env, {
    RESEND_API_KEY: 'resend-key',
    NOTIFY_EMAIL: 'owner@example.com',
    NEXT_PUBLIC_SUPABASE_URL: 'https://db.example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  });
  delete process.env.ALERT_EMAIL;
  delete process.env.ALERT_WEBHOOK_URL;
  delete process.env.VERCEL_ENV;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });
    if (String(url).includes('/rest/v1/users')) {
      return new Response(JSON.stringify([{ id: 'admin-1' }, { id: 'admin-2' }]), { status: 200 });
    }
    return new Response('{}', { status: 201 });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
});

test('an alert emails the owner and notifies every admin on the dashboard', async () => {
  await alert('test.event_one', 'something broke');
  const email = calls.find((c) => c.url === 'https://api.resend.com/emails');
  assert.ok(email);
  assert.equal((email.body as { to: string }).to, 'owner@example.com');
  const notify = calls.find((c) => c.url.endsWith('/rest/v1/notifications'));
  assert.ok(notify);
  const rows = notify.body as { user_id: string; notification_type: string; priority: string }[];
  assert.deepEqual(rows.map((r) => r.user_id), ['admin-1', 'admin-2']);
  assert.ok(rows.every((r) => r.notification_type === 'system' && r.priority === 'high'));
});

test('ALERT_EMAIL overrides NOTIFY_EMAIL', async () => {
  process.env.ALERT_EMAIL = 'alerts@example.com';
  await alert('test.event_two', 'x');
  const email = calls.find((c) => c.url === 'https://api.resend.com/emails');
  assert.equal((email?.body as { to: string }).to, 'alerts@example.com');
});

test('the same event alerts once per ten minutes', async () => {
  await alert('test.event_three', 'x');
  const first = calls.length;
  await alert('test.event_three', 'x');
  assert.equal(calls.length, first);
});

test('preview deployments do not alert', async () => {
  process.env.VERCEL_ENV = 'preview';
  await alert('test.event_four', 'x');
  assert.equal(calls.length, 0);
});
