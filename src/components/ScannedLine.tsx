'use client';

import { useEffect, useState } from 'react';
import { CAMPAIGN_LINES } from '@/lib/campaign';

// Shows the campaign line a visitor scanned (via utm_content) above the hero
// headline. Read on the client so the homepage stays statically cached.
export function ScannedLine() {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    try {
      const slug = new URLSearchParams(window.location.search).get('utm_content');
      if (slug && CAMPAIGN_LINES[slug]) setLine(CAMPAIGN_LINES[slug]);
    } catch {
      // no line, no problem
    }
  }, []);

  if (!line) return null;
  return <p className="home-hero-scanned">{line}</p>;
}
