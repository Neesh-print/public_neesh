/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  async redirects() {
    // Marketing-site IA. All 301 permanent; Next preserves query strings on
    // redirects, so Stripe links pointed at /curatedpacks survive. The index
    // lives at /index.
    const redirects = [
      { source: '/curatedpacks', destination: '/packs', statusCode: 301 },
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
        '/publisher/:path*',
        '/retailer/:path*',
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
