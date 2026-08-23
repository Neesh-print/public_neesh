/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  async redirects() {
    // Marketing-site IA (handoff section 4): /packs replaces /curatedpacks,
    // /explore collapses into the directory. All 301 permanent; Next
    // preserves query strings on redirects, so Stripe links pointed at
    // /curatedpacks survive. The /retailers -> /spaces and /pricing ->
    // /publishers redirects ship together with those pages.
    return [
      { source: '/', destination: '/directory', permanent: false },
      { source: '/curatedpacks', destination: '/packs', statusCode: 301 },
      { source: '/explore', destination: '/directory', statusCode: 301 },
      { source: '/explore/:path*', destination: '/directory', statusCode: 301 },
    ];
  },
  async rewrites() {
    // The static pages live in public/ as directory indexes; Next's
    // public-folder serving does not resolve index.html for a bare path,
    // so map them explicitly. /packs serves the pack page content (its
    // assets keep their /curatedpacks/assets/ paths) until the v3 copy
    // rebuild of the page lands.
    return {
      beforeFiles: [
        { source: '/packs', destination: '/curatedpacks/index.html' },
        { source: '/newsletter', destination: '/newsletter/index.html' },
      ],
    };
  },
};

export default nextConfig;
