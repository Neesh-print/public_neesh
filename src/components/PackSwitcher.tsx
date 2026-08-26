'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowIcon } from './Logo';
import type { Pack } from '@/lib/packs';

// v2 pack switcher: one bordered panel showing a pack at a time, circular
// prev/next arrows below, "N of 5" mono label. Hash sync keeps old
// #the-studio deep links working.
export function PackSwitcher({ packs }: { packs: Pack[] }) {
  const [index, setIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      const k = packs.findIndex((p) => p.slug === hash || `the-${p.slug}` === hash);
      if (k !== -1) return k;
    }
    return 0;
  });

  const pack = packs[index];

  function go(delta: number) {
    setIndex((current) => (current + delta + packs.length) % packs.length);
  }

  return (
    <div className="pack-panel-col">
      <div className="pack-panel">
        <div className="pack-slide">
          <Link href={`/packs/${pack.slug}`} className="pack-img-link">
            <img src={pack.image} alt={`${pack.name} pack, stacked`} />
          </Link>
          <div className="pack-slide-body">
            <h3>{pack.name}</h3>
            <span className="pack-rooms">{pack.rooms}</span>
            <p className="blurb">{pack.blurb}</p>
            <span className="pack-count">
              {pack.count} &middot; Retails at <strong>{pack.retail}</strong>
            </span>
            <div className="cta-row" style={{ marginTop: 6 }}>
              <a href={pack.order} className="btn solid">
                Order this pack
                <ArrowIcon />
              </a>
              <a href={pack.withStand} className="btn ghost">
                With stand, $300
              </a>
            </div>
          </div>
          <Link href={`/packs/${pack.slug}`} className="mono-link" style={{ marginTop: 2 }}>
            See what&rsquo;s in it
            <ArrowIcon size={13} />
          </Link>
        </div>
      </div>
      <div className="pack-arrows">
        <button type="button" aria-label="Previous pack" onClick={() => go(-1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="label">
          {index + 1} of {packs.length}
        </span>
        <button type="button" aria-label="Next pack" onClick={() => go(1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
