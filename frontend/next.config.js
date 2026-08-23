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
    ];
  },
};

module.exports = withPWA(nextConfig);
