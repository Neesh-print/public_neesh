'use client';

import Link from 'next/link';
import { useState } from 'react';
import { appUrl } from '@/lib/seo';

// The Order on Neesh fork. Neesh sells wholesale, so a space heads into
// retailer signup; a reader gets a straight answer about who Neesh is for,
// and the click is recorded as a reader_order signal so reader demand is
// measurable when we decide what to do with it.
export function OrderFork({
  titleId,
  titleName,
  titleSlug,
  hasWebsite,
}: {
  titleId: string;
  titleName: string;
  titleSlug: string;
  hasWebsite: boolean;
}) {
  const [reader, setReader] = useState(false);

  function onReader() {
    try {
      const body = JSON.stringify({
        title_id: titleId,
        signal_type: 'reader_order',
        payload: {},
      });
      navigator.sendBeacon?.('/api/signal', new Blob([body], { type: 'application/json' }));
    } catch {
      // counting must never break the page
    }
    setReader(true);
  }

  if (reader) {
    return (
      <>
        <h2>Neesh is wholesale, for now</h2>
        <p className="lede">
          We sell to the shops, cafés, hotels, and waiting rooms that stock independent
          magazines, so only spaces can order here. We&apos;ve made a note that you
          wanted {titleName}; enough notes like yours are how a title ends up stocked
          near you.
        </p>
        <div className="cta-row">
          {hasWebsite && (
            <a className="button" href={`/out/${titleSlug}`} rel="nofollow">
              See where it&apos;s stocked
            </a>
          )}
          <Link className="button ghost" href={`/titles/${titleSlug}`}>
            Back to {titleName}
          </Link>
        </div>
        <p className="muted">
          Run a space yourself?{' '}
          <a href={appUrl('/apply/retailer')}>Sign up and order it wholesale</a>
        </p>
      </>
    );
  }

  return (
    <>
      <p className="lede">
        Neesh is a wholesale marketplace: spaces and retailers order here, direct from
        the publisher. Which one are you?
      </p>
      <div className="auth-fork">
        <a className="button" href={appUrl('/apply/retailer')}>
          I have a space
        </a>
        <button className="button ghost" onClick={onReader}>
          I&apos;m a reader
        </button>
      </div>
      <p className="muted">
        Signup takes under a minute and nothing is locked in.
      </p>
    </>
  );
}
