/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  async redirects() {
    // Marketing-site IA (handoff section 4). All 301 permanent; Next
    // preserves query strings on redirects, so Stripe links pointed at
    // /curatedpacks survive. The index lives at /index.
    const redirects = [
      { source: '/curatedpacks', destination: '/packs', statusCode: 301 },
      { source: '/retailers', destination: '/spaces', statusCode: 301 },
      { source: '/pricing', destination: '/publishers', statusCode: 301 },
      { source: '/explore', destination: '/index', statusCode: 301 },
      { source: '/explore/:path*', destination: '/index', statusCode: 301 },
      { source: '/directory', destination: '/index', statusCode: 301 },
      // The catalog's file-system route lives at /catalog (Next normalizes a
      // request for /index to /, so a segment literally named "index" is
      // unreachable); the rewrite below serves it at /index, and a direct
      // /catalog hit bounces to the canonical URL.
      { source: '/catalog', destination: '/index', statusCode: 301 },
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
    // The newsletter static page lives in public/ as a directory index;
    // Next's public-folder serving does not resolve index.html for a bare
    // path, so map it explicitly.
    return {
      beforeFiles: [
        { source: '/newsletter', destination: '/newsletter/index.html' },
        // Serve the catalog at /index. The page itself lives at /catalog
        // because Next normalizes an incoming /index to / before routing,
        // which made a route segment named "index" resolve to the homepage.
        { source: '/index', destination: '/catalog' },
      ],
    };
  },
};

export default nextConfig;
