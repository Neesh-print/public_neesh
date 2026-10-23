'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-error';

// Last-resort boundary for errors in the root layout itself, where
// app/error.tsx cannot render. It replaces the whole document, so it carries
// its own html, body and inline styles rather than the site stylesheet.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, 'global');
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something broke | Neesh</title>
        <meta name="robots" content="noindex" />
      </head>
      <body
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#000',
          padding: '4rem 1.5rem',
          maxWidth: '36rem',
          margin: '0 auto',
        }}
      >
        <h1 style={{ fontSize: '1.5rem' }}>Something broke on our end</h1>
        <p style={{ color: '#5c5f6b' }}>
          Not your fault. Try again in a minute, or reply to hi@neesh.art if it keeps happening.
        </p>
        <p style={{ display: 'flex', gap: 16 }}>
          <button
            type="button"
            onClick={reset}
            style={{ font: 'inherit', padding: '8px 16px', cursor: 'pointer' }}
          >
            Try again
          </button>
          <a href="/" style={{ color: '#7d3abf', alignSelf: 'center' }}>
            Go home
          </a>
        </p>
      </body>
    </html>
  );
}
