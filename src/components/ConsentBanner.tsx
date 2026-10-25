'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CONSENT_OPEN_EVENT, readConsent, writeConsent } from '@/lib/consent';

// Asks once, before any analytics or attribution cookie is set (see
// src/lib/consent.ts). Declining is one click, same weight as accepting.
// Reopened from the footer's "Cookie settings".
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (granted: boolean) => {
    writeConsent(granted ? 'granted' : 'denied');
    setOpen(false);
  };

  return (
    <section className="consent-banner" role="region" aria-label="Cookie choices">
      <p>
        Can we use analytics cookies to see how the site is used and how you found us? Nothing is
        set unless you say yes. <Link href="/privacy">Privacy</Link>
      </p>
      <div className="consent-actions">
        <button type="button" className="consent-btn" onClick={() => choose(false)}>
          No thanks
        </button>
        <button type="button" className="consent-btn solid" onClick={() => choose(true)}>
          Accept
        </button>
      </div>
    </section>
  );
}

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="footer-link-button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
    >
      Cookie settings
    </button>
  );
}
