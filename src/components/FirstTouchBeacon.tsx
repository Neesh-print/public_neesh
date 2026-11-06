'use client';

import { useEffect } from 'react';
import { captureFirstTouch } from '@/lib/first-touch';
import { CONSENT_EVENT, analyticsAllowed, type Consent } from '@/lib/consent';

// Records where this browser first came from (see src/lib/first-touch.ts) so
// the app's application forms can attach it to publisher and space signups.
// Attribution is non-essential, so it follows the consent rules in
// src/lib/consent.ts: captured on load when allowed (a stored grant or the
// region default), or the moment the visitor accepts.
export function FirstTouchBeacon() {
  useEffect(() => {
    if (analyticsAllowed()) captureFirstTouch();
    const onConsent = (event: Event) => {
      if ((event as CustomEvent<Consent>).detail === 'granted') captureFirstTouch();
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return null;
}
