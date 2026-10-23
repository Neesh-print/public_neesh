import { log } from './log';
import { hashKey, rateLimit } from './rate-limit';

// Email via Resend. Sender is Neesh <hi@neesh.art>, reply-to the same,
// monitored by a person (handoff section 8). Transactional emails carry no
// unsubscribe link. Every send is fire-and-forget: an insert must never
// fail because an email did.
//
// The public forms send a confirmation to whatever address was typed in, so
// anything a visitor wrote is untrusted: it is HTML-escaped in emailHtml,
// echoed only through echoSafe, and kept out of subject lines, and each
// recipient gets at most a few confirmations a day. Without that the forms
// would let anyone send mail from hi@neesh.art to anyone, with their own
// links in it.

interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Cap confirmations per recipient. Off only for the admin inbox. */
  throttle?: boolean;
}

const RECIPIENT_LIMIT = 3;
const RECIPIENT_WINDOW_SEC = 86_400;
const SEND_TIMEOUT_MS = 10_000;

async function postToResend(apiKey: string, body: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    return await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendEmail({ to, subject, text, html, throttle = true }: EmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  if (throttle && !(await rateLimit(`email-to:${hashKey(to)}`, RECIPIENT_LIMIT, RECIPIENT_WINDOW_SEC))) {
    log('warn', 'email.recipient_throttled', { subject });
    return;
  }
  const from = process.env.NOTIFY_FROM ?? 'Neesh <hi@neesh.art>';
  const replyTo = process.env.NOTIFY_REPLY_TO ?? 'hi@neesh.art';
  const body = JSON.stringify({
    from,
    to,
    subject: subjectLine(subject),
    text,
    ...(html ? { html } : {}),
    reply_to: replyTo,
  });

  // One retry for a timeout, a network error, a 429 or a 5xx.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await postToResend(apiKey, body);
      if (res.ok) return;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === 2) {
        log('error', 'email.send_rejected', { status: res.status, response: await res.text(), subject });
        return;
      }
    } catch (err) {
      if (attempt === 2) {
        log('error', 'email.send_failed', { error: err, subject });
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

// Admin notifications go to NOTIFY_EMAIL.
export async function notify(subject: string, text: string): Promise<void> {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  await sendEmail({ to, subject, text, throttle: false });
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Header-safe subject: one line, no control characters, bounded length.
export function subjectLine(subject: string): string {
  return subject.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
}

// A URL, a bare domain or an email address: anything a mail client would
// turn into a link.
const LINKLIKE = /(https?:|www\.|@|[a-z0-9-]+\.(?:[a-z]{2,})(?:[/:?#]|\b))/i;

/**
 * Visitor-typed text to echo back in a confirmation email. Returned clipped
 * and single-line when it is plain words; anything link-like is replaced by
 * the fallback, so a confirmation can never carry someone else's link.
 */
export function echoSafe(value: string | null | undefined, fallback: string, max = 80): string {
  if (!value) return fallback;
  const oneLine = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!oneLine || LINKLIKE.test(oneLine)) return fallback;
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

// Minimal markdown-ish to HTML for email bodies: **bold** and paragraphs.
// The text is escaped first, so nothing in it can become markup.
export function emailHtml(text: string): string {
  const paragraphs = escapeHtml(text)
    .split(/\n\n+/)
    .map((p) =>
      p
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
    )
    .map((p) => `<p style="margin:0 0 1em">${p}</p>`)
    .join('');
  return `<div style="font-family:Inter,system-ui,sans-serif;font-size:15px;color:#000;line-height:1.55;max-width:36em">${paragraphs}</div>`;
}

