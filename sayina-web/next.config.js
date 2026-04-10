/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: false,
  disable: process.env.NODE_ENV === 'development',
});

const RAILWAY_API = process.env.NEXT_PUBLIC_API_BASE_URL
  ? process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '')
  : 'https://sayina-production.up.railway.app';

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  // Proxy all /api/v1 calls to the Railway backend
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${RAILWAY_API}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
