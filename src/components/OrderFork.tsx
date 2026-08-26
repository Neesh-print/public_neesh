'use client';

import Link from 'next/link';
import { useState } from 'react';
import { appUrl } from '@/lib/seo';
import { ArrowIcon } from './Logo';

// The Order on Neesh fork, v2. Neesh sells wholesale, so a space heads into
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
        <h1>Neesh is wholesale, for now</h1>
        <p className="sub">
          We have logged that you wanted this one. Enough of those and we have a reason to open
          direct sales.
        </p>
        <div className="cta-row" style={{ marginTop: 8 }}>
          {hasWebsite && (
            <a className="btn solid" href={`/out/${titleSlug}`} rel="nofollow">
              See where it&rsquo;s stocked
              <ArrowIcon />
            </a>
          )}
          <Link className="btn ghost" href={`/titles/${titleSlug}`}>
            Back to {titleName}
          </Link>
        </div>
        <p className="small">
          Run a space yourself?{' '}
          <a href={appUrl('/apply/retailer')} className="text-link">
            Sign up here
          </a>
        </p>
      </>
    );
  }

  return (
    <>
      <span className="eyebrow dim">Order on Neesh</span>
      <h1>Order {titleName} on Neesh</h1>
      <p className="sub">
        Neesh is wholesale. Spaces and shops buy at trade prices, by the copy, with no minimums
        and no account to open beyond signup.
      </p>
      <div className="door-cards">
        <a href={appUrl('/apply/retailer')} className="door-card dark">
          <span className="title">I have a space</span>
          <span className="sub">Buy at wholesale for your room.</span>
        </a>
        <button type="button" className="door-card" onClick={onReader}>
          <span className="title">I&rsquo;m a reader</span>
          <span className="sub">Find a shop that stocks it.</span>
        </button>
      </div>
      <p className="small">Signup takes under a minute and nothing is locked in.</p>
    </>
  );
}
