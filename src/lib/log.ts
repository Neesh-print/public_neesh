import { alert } from './alert';

// Structured logs: one JSON object per line, so Vercel's log search and any
// drain can filter on event, route and level. Fields that could carry a
// secret or a person's contact details are redacted before printing, and
// email addresses inside free text are masked. Error-level events also go
// to the alert webhook (src/lib/alert.ts).

type Level = 'info' | 'warn' | 'error';

const SECRET_KEY = /(email|token|secret|password|authorization|api_?key|cookie|ip$)/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function clean(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message.replace(EMAIL, '[email]') };
  }
  if (typeof value === 'string') return value.replace(EMAIL, '[email]').slice(0, 2000);
  if (depth > 3 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => clean(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) ? '[redacted]' : clean(v, depth + 1);
  }
  return out;
}

export function redact(fields: Record<string, unknown>): Record<string, unknown> {
  return clean(fields) as Record<string, unknown>;
}

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...redact(fields) });
  if (level === 'error') {
    console.error(line);
    void alert(event, line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
