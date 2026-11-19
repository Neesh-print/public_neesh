// Sends a render error caught by an error boundary to /api/client-error.
// Message and digest only: no stack, no page content.
export function reportClientError(error: Error & { digest?: string }, boundary: 'page' | 'global'): void {
  try {
    const body = JSON.stringify({
      message: String(error?.message ?? 'unknown').slice(0, 500),
      digest: error?.digest?.slice(0, 100),
      path: window.location.pathname.slice(0, 500),
      boundary,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // reporting must never throw from an error boundary
  }
}
