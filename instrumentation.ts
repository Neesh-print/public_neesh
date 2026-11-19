import type { Instrumentation } from 'next';

// Server-side error tracking. Next calls onRequestError for every uncaught
// error in a page render, route handler, server action or middleware; each
// one becomes a structured log line, and an alert when ALERT_WEBHOOK_URL is
// set (src/lib/log.ts). For stack-level grouping and release tracking, a
// hosted tracker such as Sentry can be added here later.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { log } = await import('@/lib/log');
  const error = err as Error & { digest?: string };
  log('error', 'request.unhandled_error', {
    error,
    digest: error.digest,
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: 'renderSource' in context ? context.renderSource : undefined,
  });
};
