/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  poweredByHeader: false,
  async headers() {
    // Baseline security headers on every response. HSTS is deliberately
    // without includeSubDomains/preload until every neesh.art subdomain is
    // confirmed HTTPS-only. The CSP covers framing, plugins and base-URI
    // hijacking only; a full script-src policy needs the GTM container's
    // tag list first (see docs/operations.md).
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
  async redirects() {
    // Marketing-site IA. All 301 permanent; Next preserves query strings on
    // redirects, so Stripe links pointed at /curatedpacks survive. The index
    // lives at /index.
    const redirects = [
      { source: '/curatedpacks', destination: '/packs', statusCode: 301 },
      // Pack lineup rebuilt and renamed (October 2026). Retired and renamed
      // pack pages land on their replacement, so earlier links keep working.
      { source: '/packs/studio', destination: '/packs/fine-print', statusCode: 301 },
      { source: '/packs/locker-room', destination: '/packs/dog-ear', statusCode: 301 },
      { source: '/packs/upper-left', destination: '/packs', statusCode: 301 },
      { source: '/packs/waiting-room', destination: '/packs/slow-read', statusCode: 301 },
      { source: '/packs/table-service', destination: '/packs/the-spread', statusCode: 301 },
      { source: '/packs/listening-room', destination: '/packs/liner-notes', statusCode: 301 },
      { source: '/retailers', destination: '/spaces', statusCode: 301 },
      { source: '/pricing', destination: '/publishers', statusCode: 301 },
      { source: '/explore', destination: '/index', statusCode: 301 },
      { source: '/explore/:path*', destination: '/index', statusCode: 301 },
      { source: '/directory', destination: '/index', statusCode: 301 },
      // The catalog's file-system routes live under /catalog (Next
      // normalizes a request for /index to /, so a segment literally named
      // "index" is unreachable); the rewrites below serve them at /index,
      // and direct /catalog hits bounce to the canonical URLs.
      { source: '/catalog', destination: '/index', statusCode: 301 },
      { source: '/catalog/:path+', destination: '/index/:path+', statusCode: 301 },
      // v1 niche URLs moved from /magazines/[tag] to /index/[tag].
      { source: '/magazines/:tag', destination: '/index/:tag', statusCode: 301 },
      { source: '/magazines/:tag/page/:n', destination: '/index/:tag/page/:n', statusCode: 301 },
      // Legal docs moved onto this site from the app's /legal/* paths.
      { source: '/legal/terms', destination: '/terms', statusCode: 301 },
      { source: '/legal/privacy', destination: '/privacy', statusCode: 301 },
      { source: '/legal/publisher-agreement', destination: '/publisher-agreement', statusCode: 301 },
      { source: '/legal/retailer-agreement', destination: '/retailer-agreement', statusCode: 301 },
      // Directory duplicates merged into their canonical entry.
      { source: '/titles/dg-quarterly', destination: '/titles/delayed-gratification', statusCode: 301 },
      { source: '/publishers/dg-quarterly', destination: '/publishers/delayed-gratification', statusCode: 301 },
      { source: '/out/dg-quarterly', destination: '/out/delayed-gratification', statusCode: 301 },
      // Portland split into Portland, Oregon and Portland, Maine (October 2026).
      { source: '/cities/portland', destination: '/cities/portland-oregon', statusCode: 301 },
      // Duplicate store entries merged into the main one (October 2026).
      { source: '/stores/chess-club-us', destination: '/stores/chess-club-portland', statusCode: 301 },
      { source: '/stores/smoke-signals-newsstand-us', destination: '/stores/smoke-signals-san-francisco', statusCode: 301 },
    ];

    // Domain cutover passthroughs: once this site serves neesh.art and the
    // app moves to its own subdomain, set NEXT_PUBLIC_APP_URL (e.g.
    // https://app.neesh.art) and every app path, old magic link, bookmark,
    // and Stripe return URL keeps working via these redirects. Unset, no
    // passthroughs are emitted.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      for (const path of [
        '/login',
        '/apply',
        '/apply/:path*',
        '/auth/callback',
        // Password reset and verification links in already-sent emails.
        '/forgot-password',
        '/reset-password',
        '/verify-email',
        // Application status screens and the role-redirect helper.
        '/home',
        '/pending',
        '/rejected',
        // Stripe payout onboarding links in nudge emails.
        '/onboarding/:path*',
        // Shared public profile links (neesh.art/p/..., /r/...).
        '/p/:path*',
        '/r/:path*',
        // Dashboards, bare and nested.
        '/publisher',
        '/publisher/:path*',
        '/retailer',
        '/retailer/:path*',
        '/admin',
        '/admin/:path*',
      ]) {
        redirects.push({
          source: path,
          destination: `${appUrl.replace(/\/$/, '')}${path.replace('/:path*', '/:path*')}`,
          statusCode: 301,
        });
      }
    }
    return redirects;
  },
  async rewrites() {
    // Serve the catalog at /index. The pages live under /catalog because
    // Next normalizes an incoming /index to / before routing, which made a
    // route segment named "index" resolve to the homepage.
    return {
      beforeFiles: [
        { source: '/index', destination: '/catalog' },
        { source: '/index/:niche', destination: '/catalog/:niche' },
        { source: '/index/:niche/page/:n', destination: '/catalog/:niche/page/:n' },
      ],
    };
  },
};

export default nextConfig;
