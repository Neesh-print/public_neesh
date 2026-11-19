'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CONSENT_OPEN_EVENT, askFirst, readConsent, writeConsent } from '@/lib/consent';

// Shown until the visitor makes a choice (see src/lib/consent.ts).
// Ask-first regions get a question, and nothing is set before "Accept".
// Elsewhere measurement is already on, so the banner is a notice with a
// one-click "Opt out". Either way the two buttons carry the same weight.
// Reopened from the footer's "Cookie settings".
export function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(true);

  useEffect(() => {
    setAsk(askFirst());
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
      {ask ? (
        <p>
          Can we use analytics cookies to see how the site is used and how you found us, including
          from our ads? Nothing is set unless you say yes. <Link href="/privacy">Privacy</Link>
        </p>
      ) : (
        <p>
          We use analytics cookies to see how the site is used and how you found us, including from
          our ads. You can opt out anytime. <Link href="/privacy">Privacy</Link>
        </p>
      )}
      <div className="consent-actions">
        <button type="button" className="consent-btn" onClick={() => choose(false)}>
          {ask ? 'No thanks' : 'Opt out'}
        </button>
        <button type="button" className="consent-btn solid" onClick={() => choose(true)}>
          {ask ? 'Accept' : 'OK'}
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
