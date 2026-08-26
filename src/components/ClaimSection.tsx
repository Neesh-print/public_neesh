'use client';

import { appUrl } from '@/lib/seo';

// Claim CTA on the title profile. Clicking fires a claim_click signal so
// claim intent stays measurable (spec 8), then hands off to the full
// publisher signup flow; every claim still passes manual review there.
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
          <a className="button" href={href} onClick={onClick}>
            Claim this profile
          </a>
          <span className="cta-subline">
            Publishers only. We review every claim by hand.
          </span>
        </span>
      </div>
    </>
  );
}
