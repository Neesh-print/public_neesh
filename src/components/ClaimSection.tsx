'use client';

import { useEffect, useRef, useState } from 'react';

// Claim CTA on the title profile. Opening the form fires a claim_click
// signal so claim intent is measurable separately from completed claims
// (spec 8). Submission is a plain form post, so it works with JS off.
// Arriving with ?claim=1 (from the auth flow's "Yes, claim it") opens the
// form and scrolls to it.
export function ClaimSection({
  publisherId,
  publisherName,
  titleId,
  claimed,
}: {
  publisherId: string;
  publisherName: string;
  titleId: string;
  claimed: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [autoOpen, setAutoOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('claim') === '1') {
      setAutoOpen(true);
      ref.current?.scrollIntoView({ block: 'center' });
    }
  }, []);

  if (claimed) {
    return <p className="claimed-badge">Verified by the publisher</p>;
  }

  function onToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open) return;
    try {
      const body = JSON.stringify({ title_id: titleId, signal_type: 'claim_click', payload: {} });
      navigator.sendBeacon?.('/api/signal', new Blob([body], { type: 'application/json' }));
    } catch {
      // counting must never break the page
    }
  }

  return (
    <>
      <p className="unclaimed-banner">
        This page was built by Neesh. If this is your magazine, claim it and take the
        keys.
      </p>
      <details className="cta-form" onToggle={onToggle} ref={ref} open={autoOpen || undefined}>
        <summary>
          Claim this profile <span className="cta-subline">Publishers only.</span>
        </summary>
        <form action="/api/claim" method="post">
          <input type="hidden" name="publisher_id" value={publisherId} />
          <input type="hidden" name="title_id" value={titleId} />
          <div className="field">
            <label htmlFor="cl-name">Your name</label>
            <input id="cl-name" name="name" maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="cl-email">Email</label>
            <input id="cl-email" name="email" type="email" required maxLength={320} />
          </div>
          <div className="field">
            <label htmlFor="cl-message">Anything we should know</label>
            <textarea id="cl-message" name="message" rows={3} maxLength={4000} />
          </div>
          <button className="button" type="submit">
            Submit claim
          </button>
          <p className="privacy-note">
            We review every claim by hand. An email from the publisher domain speeds
            things up.
          </p>
        </form>
      </details>
    </>
  );
}
