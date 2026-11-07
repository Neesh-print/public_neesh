'use client';

import { appUrl } from '@/lib/seo';

// The claim line under a title's details: "Is this your magazine? Claim it"
// on an unclaimed profile, "Claimed by publisher" once it has an owner.
// Claiming fires a claim_click signal then hands off to the publisher
// application, prefilled for this title. Claiming is free and separate from
// selling: the application asks whether they want to sell after the page
// details, and "just claim my page" never touches pricing or fulfillment.
// Every claim still passes manual review. Removal stays as a small link that
// asks for an email and triggers an "are you sure" email before anything
// comes down.
export function ClaimSection({
  titleId,
  titleName,
  titleSlug,
  publisherName,
  claimed,
}: {
  titleId: string;
  titleName: string;
  titleSlug: string;
  publisherName?: string;
  claimed: boolean;
}) {
  if (claimed) {
    return (
      <div className="claim-line">
        <span className="claim-note">Claimed by publisher</span>
      </div>
    );
  }

  const href = appUrl(
    `/apply/publisher?title=${encodeURIComponent(titleName)}&claim=${titleSlug}` +
      (publisherName ? `&publisher=${encodeURIComponent(publisherName)}` : '')
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
    <div className="claim-line">
      <div className="claim-row">
        <span className="claim-note">Is this your magazine?</span>
        <a className="claim-link" href={href} onClick={onClick}>
          Claim it &rarr;
        </a>
      </div>
      <p className="claim-sub">
        Claiming is free and you don&rsquo;t have to sell on Neesh. Selling is a separate choice
        you can make any time.
      </p>
      <details className="remove-details">
        <summary>Remove this profile</summary>
        <form className="remove-form" action="/api/remove-request" method="post">
          <input type="hidden" name="title_id" value={titleId} />
          <input
            name="email"
            type="email"
            required
            maxLength={320}
            placeholder="Your email at the magazine"
            aria-label="Your email at the magazine"
          />
          <button type="submit">Request removal</button>
        </form>
      </details>
    </div>
  );
}
