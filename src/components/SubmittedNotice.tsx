'use client';

import { useEffect, useState } from 'react';
import { trackTitleRequest } from '@/lib/neesh-analytics';

// The generic form success string (transactional copy 4.10).
const MESSAGES: Record<string, string> = {
  stock_request: "Got it. We'll be in touch.",
  want_near: "Got it. We'll be in touch.",
  title_interest: "Got it. We'll be in touch.",
  claim: "Got it. We'll be in touch.",
  remove_request: 'Got it. Check your email to confirm.',
  suggestion: "Got it. If it fits the index, it'll be live within a couple of days, and we'll email you when it is.",
};

// The "Want this title?" form posts title_interest; stock_request and
// want_near are the older per-audience names the API still accepts.
const TITLE_REQUEST_KEYS = new Set(['title_interest', 'stock_request', 'want_near']);

// The profile page stays static (ISR), so the post-submit "thanks" state is
// read from the query string on the client instead of via searchParams.
export function SubmittedNotice() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('submitted');
    if (key && MESSAGES[key]) setMessage(MESSAGES[key]);
    if (key && TITLE_REQUEST_KEYS.has(key)) trackTitleRequest();
  }, []);
  if (!message) return null;
  return <p className="submitted-notice">{message}</p>;
}
