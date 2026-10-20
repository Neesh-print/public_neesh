'use client';

import { useState } from 'react';
import { TOAST } from '@/lib/collect/shared';
import { useCollect } from './CollectProvider';

// Email magic-link sign-in. One field, one button. The newsletter box is
// separate from account creation, unchecked by default, and only ever set
// by the reader.

export function useSendLink(next?: string) {
  const { notice, track } = useCollect();
  const [email, setEmail] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
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
      if (!res.ok) throw new Error(String(res.status));
      setStatus('sent');
      notice(TOAST.linkSent);
      track('collect_save_prompt_sent', { newsletter });
    } catch {
      setStatus('error');
    }
  }

  return { email, setEmail, newsletter, setNewsletter, status, send };
}

export function SignInFields({
  link,
  inputRef,
}: {
  link: ReturnType<typeof useSendLink>;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <>
      <label className="c-field">
        <span>Email</span>
        <input
          ref={inputRef}
          type="email"
          required
          maxLength={320}
          autoComplete="email"
          inputMode="email"
          value={link.email}
          onChange={(event) => link.setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label className="c-check">
        <input
          type="checkbox"
          checked={link.newsletter}
          onChange={(event) => link.setNewsletter(event.target.checked)}
        />
        <span>Also send me Indexed, the monthly letter from Neesh on independent print.</span>
      </label>
      {link.status === 'error' && (
        <p className="c-error" role="alert">
          That didn&rsquo;t go through. Check the address and try again.
        </p>
      )}
    </>
  );
}

// The signed-out block on Settings and Add.
export function SignInForm({ intro, next }: { intro: string; next?: string }) {
  const link = useSendLink(next);
  if (link.status === 'sent') {
    return (
      <div className="c-stack">
        <h2 className="c-h2">Check your inbox</h2>
        <p className="c-prose">
          We sent a sign-in link to {link.email}. Tap it on any device and your collection comes with you.
        </p>
      </div>
    );
  }
  return (
    <form className="c-stack" onSubmit={link.send}>
      <p className="c-prose">{intro}</p>
      <SignInFields link={link} />
      <button className="c-btn solid" type="submit" disabled={link.status === 'sending'}>
        Send my link
      </button>
    </form>
  );
}
