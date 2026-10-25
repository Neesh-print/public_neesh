'use client';

import { useEffect } from 'react';
import { captureFirstTouch } from '@/lib/first-touch';
import { CONSENT_EVENT, readConsent, type Consent } from '@/lib/consent';

// Records where this browser first came from (see src/lib/first-touch.ts) so
// the app's application forms can attach it to publisher and space signups.
// Attribution is non-essential, so it waits for cookie consent: captured on
// load when consent is already stored, or the moment the visitor accepts.
export function FirstTouchBeacon() {
  useEffect(() => {
    if (readConsent() === 'granted') captureFirstTouch();
    const onConsent = (event: Event) => {
      if ((event as CustomEvent<Consent>).detail === 'granted') captureFirstTouch();
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return null;
}
