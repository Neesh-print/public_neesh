// Error alerts. Each error-level log event (src/lib/log.ts) is sent to:
//
// - email: ALERT_EMAIL, or NOTIFY_EMAIL when that is unset, through Resend;
// - the admin dashboard: one 'system' notification, priority 'high', for
//   every user with role = 'admin' in public.users, which the app shows in
//   the admins' notification list;
// - a chat webhook, when ALERT_WEBHOOK_URL is set (Slack and Discord
//   payload shapes are both sent).
//
// Each event alerts at most once per instance every ten minutes, so one
// failing dependency cannot flood an inbox. Never throws, and never logs
// through log(): a failing alert must not raise another alert. Uses fetch
// only, so it runs in every runtime (route handlers, middleware, the
// instrumentation hook).

const WINDOW_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 4000;
const lastSent = new Map<string, number>();

async function post(url: string, init: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function alertByEmail(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL ?? process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;
  const res = await post('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM ?? 'Neesh <hi@neesh.art>',
      to,
      subject,
      text,
    }),
  });
  if (!res?.ok) console.error(JSON.stringify({ level: 'warn', event: 'alert.email_failed', status: res?.status }));
}

async function alertAdminDashboard(title: string, content: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const admins = await post(`${url}/rest/v1/users?role=eq.admin&select=id`, { headers });
  if (!admins?.ok) {
    console.error(JSON.stringify({ level: 'warn', event: 'alert.admin_lookup_failed', status: admins?.status }));
    return;
  }
  const rows = ((await admins.json()) as { id: string }[]).map((a) => ({
    user_id: a.id,
    title: title.slice(0, 200),
    content: content.slice(0, 2000),
    notification_type: 'system',
    priority: 'high',
  }));
  if (rows.length === 0) return;
  const res = await post(`${url}/rest/v1/notifications`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res?.ok) console.error(JSON.stringify({ level: 'warn', event: 'alert.admin_notify_failed', status: res?.status }));
}

async function alertByWebhook(text: string): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  await post(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, content: text }),
  });
}

export async function alert(event: string, detail: string): Promise<void> {
  const now = Date.now();
  const prev = lastSent.get(event);
  if (prev && now - prev < WINDOW_MS) return;
  lastSent.set(event, now);

  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown';
  // Previews share production credentials today; alert only from production.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') return;

  const title = `neesh.art error: ${event}`;
  const body = `${event} (${env})\n\n${detail.slice(0, 1500)}\n\nFull logs: Vercel → public-neesh → Logs, search "${event}".`;
  try {
    await Promise.all([alertByEmail(title, body), alertAdminDashboard(title, body), alertByWebhook(`[${env}] ${body}`)]);
  } catch {
    // alerting is best-effort
  }
}
