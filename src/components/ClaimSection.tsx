'use client';

import { appUrl } from '@/lib/seo';
import { ArrowIcon } from './Logo';

// The publisher zone on an unclaimed title profile (v2): a band card with
// the accent claim CTA and a deliberately small removal link underneath.
// Claiming fires a claim_click signal then hands off to the full publisher
// signup flow; every claim still passes manual review. Removal asks for an
// email and triggers an "are you sure" email before anything comes down.
export function ClaimSection({
  titleId,
  titleName,
  titleSlug,
}: {
  titleId: string;
  titleName: string;
  titleSlug: string;
}) {
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
    <div className="publisher-zone">
      <span className="blurb">
        This page has not been claimed. If you publish it, take it over and set your own terms.
      </span>
      <a className="btn accent" href={href} onClick={onClick}>
        Claim this profile
        <ArrowIcon size={16} />
      </a>
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
