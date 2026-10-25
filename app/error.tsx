'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-error';

// 500 copy from the transactional doc (4.2).
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, 'page');
  }, [error]);

  return (
    <main className="container system-page">
      <h1>Something broke on our end</h1>
      <p>
        Not your fault. Try again in a minute, or reply to hi@neesh.art if it keeps
        happening.
      </p>
      <div className="cta-row">
        <button className="button ghost" onClick={reset}>
          Try again
        </button>
        <a className="button" href="/">
          Go home
        </a>
      </div>
    </main>
  );
}
