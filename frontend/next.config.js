const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: require('next-pwa/cache'),
  buildExcludes: [/middleware-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hides the "X-Powered-By: Next.js" response header — no functional
  // effect, just one less detail handed to anyone probing the stack.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.digitaloceanspaces.com',
      },
      {
        protocol: 'https',
        hostname: '*.cdn.digitaloceanspaces.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Public catalog pages need to stay embeddable in an iframe from
        // any site a vendor drops the embed widget's "modal" mode snippet
        // on — set explicitly rather than relying on the absence of a
        // restrictive header, so a future unrelated security-hardening
        // pass doesn't silently break every vendor's embedded widget.
        source: '/public/:path*',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
      {
        // Everywhere except /public/* — X-Frame-Options: SAMEORIGIN here
        // would compete with that route's own deliberately permissive
        // frame-ancestors CSP above. The regex excludes any path starting
        // with "public" rather than just not-matching '/public/:path*',
        // since a page can accumulate headers from every matching entry.
        source: '/:path((?!public).*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
