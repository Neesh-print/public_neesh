'use client';

import { useEffect } from 'react';
import { captureFirstTouch } from '@/lib/first-touch';

// Records where this browser first came from (see src/lib/first-touch.ts) so
// the app's application forms can attach it to publisher and space signups.
export function FirstTouchBeacon() {
  useEffect(() => {
    captureFirstTouch();
  }, []);

  return null;
}
