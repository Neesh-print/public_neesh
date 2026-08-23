/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  async redirects() {
    return [{ source: '/', destination: '/directory', permanent: false }];
  },
  async rewrites() {
    // The pre-existing static pages live in public/ as directory indexes;
    // Next's public-folder serving does not resolve index.html for a bare
    // directory path, so map them explicitly.
    return {
      beforeFiles: [
        { source: '/curatedpacks', destination: '/curatedpacks/index.html' },
        { source: '/newsletter', destination: '/newsletter/index.html' },
      ],
    };
  },
};

export default nextConfig;
