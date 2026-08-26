'use client';

import { useState } from 'react';

// Newsletter capture writes to the same list as the old static page:
// public.mailing_list_subscribers via the publishable REST key. 409 means
// the unique-email constraint fired — already subscribed, treated as done.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function NewsletterForm({
  confirmation = "Got it. First issue lands at the end of the month.",
}: {
  confirmation?: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState('error');
      return;
    }
    setState('busy');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/mailing_list_subscribers`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email }),
      });
      setState(res.ok || res.status === 409 ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <form className="newsletter-form" onSubmit={submit}>
      <div className="newsletter-form-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@yourspace.com"
          aria-label="Email address"
          required
        />
        <button type="submit" disabled={state === 'busy'}>
          Subscribe
        </button>
      </div>
      {state === 'done' && <span className="form-note">{confirmation}</span>}
      {state === 'error' && (
        <span className="form-error">That didn&rsquo;t go through. Check the address and try again.</span>
      )}
    </form>
  );
}
