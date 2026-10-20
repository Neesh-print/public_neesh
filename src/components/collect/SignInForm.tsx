'use client';

import { useState } from 'react';

// Email magic-link sign-in. The newsletter box is separate from account
// creation, unchecked by default, and only ever set by the reader.
export function SignInForm({ secondary, next }: { secondary?: React.ReactNode; next?: string }) {
  const [email, setEmail] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/collect/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          newsletter,
          next: next ?? `${window.location.pathname}${window.location.search}`,
        }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <p className="collect-sent" role="status">
        Check your inbox. We sent a sign-in link to <strong>{email}</strong>. It works once.
      </p>
    );
  }

  return (
    <form className="collect-signin" onSubmit={submit}>
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          required
          maxLength={320}
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label className="collect-check">
        <input type="checkbox" checked={newsletter} onChange={(event) => setNewsletter(event.target.checked)} />
        <span>Also send me Indexed, the monthly letter from Neesh on independent print.</span>
      </label>
      <div className="collect-actions">
        <button className="btn solid" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending' : 'Send my link'}
        </button>
        {secondary}
      </div>
      {status === 'error' && (
        <p className="collect-error" role="alert">
          That didn&rsquo;t go through. Check the address and try again.
        </p>
      )}
      <p className="collect-fine">
        Your collection is private. Spaces and publishers only ever see anonymous totals, and never for
        small groups of readers.
      </p>
    </form>
  );
}
