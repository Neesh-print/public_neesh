'use client';

import { appUrl } from '@/lib/seo';

// The publisher zone on a title profile: a claim CTA in the accent
// treatment, and a deliberately small removal link underneath. Claiming
// fires a claim_click signal (spec 8) then hands off to the full publisher
// signup flow; every claim still passes manual review. Removal asks for an
// email and triggers an "are you sure" email before anything comes down.
export function ClaimSection({
  titleId,
  titleName,
  titleSlug,
  claimed,
}: {
  titleId: string;
  titleName: string;
  titleSlug: string;
  claimed: boolean;
}) {
  if (claimed) {
    return <p className="claimed-badge">Verified by the publisher</p>;
  }

  const href = appUrl(
    `/apply/publisher?title=${encodeURIComponent(titleName)}&claim=${titleSlug}`
  );

  function onClick() {
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
      <div className="cta-row">
        <span>
          <a className="button accent" href={href} onClick={onClick}>
            Claim this profile
          </a>
          <span className="cta-subline">
            Publishers only. We review every claim by hand.
          </span>
        </span>
      </div>
      <details className="remove-request">
        <summary>Remove this profile</summary>
        <form action="/api/remove-request" method="post">
          <input type="hidden" name="title_id" value={titleId} />
          <input
            name="email"
            type="email"
            required
            maxLength={320}
            placeholder="Your email"
            aria-label="Your email"
          />
          <button className="linklike" type="submit">
            Request removal
          </button>
        </form>
      </details>
    </>
  );
}
