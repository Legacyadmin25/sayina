/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: false,
  disable: process.env.NODE_ENV === 'development',
  sw: '/sw.js',
  // Add our custom service worker to extend the default functionality
  swSrc: 'public/sw-custom.js',
  runtimeCaching: [
    {
      // API calls - Stale-While-Revalidate strategy
      urlPattern: /^https?\/\/.*\/api\/v1\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
        networkTimeoutSeconds: 10,
        backgroundSync: {
          name: 'api-queue',
          options: {
            maxRetentionTime: 60 * 60 * 24 * 7, // 1 week in seconds
          },
        },
      },
    },
    {
      // Document files (PDFs) - Cache-First with longer TTL
      urlPattern: /\.pdf$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'document-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
    {
      // Static assets (images, fonts, etc.) - Cache-First with versioning
      urlPattern: /\.(jpe?g|png|svg|gif|webp|ico|woff2?|eot|ttf|otf)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      // Static JS/CSS - Cache-First with versioning
      urlPattern: /\.(js|css)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
    {
      // HTML pages - Network-First for fresh content
      urlPattern: /\.html$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'html-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
    {
      // Everything else - Stale-While-Revalidate as fallback
      urlPattern: /.*$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'others',
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withPWA(nextConfig);
