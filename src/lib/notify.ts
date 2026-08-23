// Email notifications for claims and stock requests. Sends through Resend
// when configured, no-ops otherwise so the insert never fails on email.
export async function notify(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;
  const from = process.env.NOTIFY_FROM ?? 'Neesh Directory <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error('notify: resend responded', res.status, await res.text());
    }
  } catch (err) {
    console.error('notify: send failed', err);
  }
}
