'use client';

import { useEffect, useState } from 'react';

// The generic form success string (transactional copy 4.10).
const MESSAGES: Record<string, string> = {
  stock_request: "Got it. We'll be in touch.",
  want_near: "Got it. We'll be in touch.",
  claim: "Got it. We'll be in touch.",
};

// The profile page stays static (ISR), so the post-submit "thanks" state is
// read from the query string on the client instead of via searchParams.
export function SubmittedNotice() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('submitted');
    if (key && MESSAGES[key]) setMessage(MESSAGES[key]);
  }, []);
  if (!message) return null;
  return <p className="submitted-notice">{message}</p>;
}
