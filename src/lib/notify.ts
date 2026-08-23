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

export async function sendEmail({ to, subject, text, html }: EmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
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
    }
  } catch (err) {
    console.error('sendEmail: send failed', err);
  }
}

// Admin notifications go to NOTIFY_EMAIL.
export async function notify(subject: string, text: string): Promise<void> {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  await sendEmail({ to, subject, text });
}

// Minimal markdown-ish to HTML for email bodies: **bold** and paragraphs.
export function emailHtml(text: string): string {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'))
    .map((p) => `<p style="margin:0 0 1em">${p}</p>`)
    .join('');
  return `<div style="font-family:Inter,system-ui,sans-serif;font-size:15px;color:#000;line-height:1.55;max-width:36em">${paragraphs}</div>`;
}
