/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  async redirects() {
    // Marketing-site IA (handoff section 4). All five 301 permanent; Next
    // preserves query strings on redirects, so Stripe links pointed at
    // /curatedpacks survive.
    return [
      { source: '/curatedpacks', destination: '/packs', statusCode: 301 },
      { source: '/retailers', destination: '/spaces', statusCode: 301 },
      { source: '/pricing', destination: '/publishers', statusCode: 301 },
      { source: '/explore', destination: '/directory', statusCode: 301 },
      { source: '/explore/:path*', destination: '/directory', statusCode: 301 },
    ];
  },
  async rewrites() {
    // The newsletter static page lives in public/ as a directory index;
    // Next's public-folder serving does not resolve index.html for a bare
    // path, so map it explicitly.
    return {
      beforeFiles: [{ source: '/newsletter', destination: '/newsletter/index.html' }],
    };
  },
};

export default nextConfig;
