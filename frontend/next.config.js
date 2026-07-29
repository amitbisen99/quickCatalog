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
};

module.exports = withPWA(nextConfig);
