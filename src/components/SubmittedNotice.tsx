'use client';

import { useEffect, useState } from 'react';

const MESSAGES: Record<string, string> = {
  stock_request: 'Thanks. Your stock request is in and we will be in touch.',
  want_near: 'Thanks. We have logged where you want this title to show up.',
  claim: 'Thanks. Your claim is in the review queue and we will email you.',
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
