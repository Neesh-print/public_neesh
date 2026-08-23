'use client';

import { useEffect } from 'react';

// Profile pages are statically rendered, so the view cannot be counted
// server-side. Fire-and-forget beacon on mount (spec 1.3).
export function ViewBeacon({ titleId }: { titleId: string }) {
  useEffect(() => {
    const body = JSON.stringify({
      title_id: titleId,
      signal_type: 'view',
      payload: document.referrer ? { referrer: document.referrer.slice(0, 2000) } : {},
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/signal', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // never let counting break the page
    }
  }, [titleId]);
  return null;
}
