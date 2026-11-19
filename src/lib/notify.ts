// Email via Resend. Sender is Neesh <hi@neesh.art>, reply-to the same,
// monitored by a person (handoff section 8). Transactional emails carry no
// unsubscribe link. Every send is fire-and-forget: an insert must never
// fail because an email did.

interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Resolves true when Resend accepted the message. Callers that only notify can ignore it. */
export async function sendEmail({ to, subject, text, html }: EmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.NOTIFY_FROM ?? 'Neesh <hi@neesh.art>';
  const replyTo = process.env.NOTIFY_REPLY_TO ?? 'hi@neesh.art';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text, ...(html ? { html } : {}), reply_to: replyTo }),
    });
    if (!res.ok) {
      console.error('sendEmail: resend responded', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendEmail: send failed', err);
    return false;
  }
}

// Admin notifications go to NOTIFY_EMAIL.
export async function notify(subject: string, text: string): Promise<void> {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  await sendEmail({ to, subject, text });
}

// Minimal markdown-ish to HTML for email bodies: **bold**, [text](url)
// links and paragraphs.
export function emailHtml(text: string): string {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) =>
      p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#7d3bbf">$1</a>')
        .replace(/\n/g, '<br>')
    )
    .map((p) => `<p style="margin:0 0 1em">${p}</p>`)
    .join('');
  return `<div style="font-family:Inter,system-ui,sans-serif;font-size:15px;color:#000;line-height:1.55;max-width:36em">${paragraphs}</div>`;
}
