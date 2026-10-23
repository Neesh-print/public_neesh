// Error alerts to a chat webhook. Set ALERT_WEBHOOK_URL to a Slack incoming
// webhook or a Discord webhook (both payload shapes are sent); unset, alerts
// are a no-op and errors only reach the logs. Each event alerts at most once
// per instance every ten minutes so one failing dependency cannot flood the
// channel. Never throws.

const WINDOW_MS = 10 * 60 * 1000;
const lastSent = new Map<string, number>();

export async function alert(event: string, detail: string): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const now = Date.now();
  const prev = lastSent.get(event);
  if (prev && now - prev < WINDOW_MS) return;
  lastSent.set(event, now);

  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown';
  const text = `[neesh.art ${env}] ${event}\n${detail.slice(0, 1500)}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  } catch {
    // alerting is best-effort
  }
}
