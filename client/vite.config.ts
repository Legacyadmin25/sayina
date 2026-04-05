import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Mode can be 'development' or 'production'
      mode: 'development',
      base: '/',
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sayina E-Signature Service',
        short_name: 'Sayina',
        description: 'South African Compliant E-Signature Service',
        theme_color: '#DAB44A',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      strategies: 'generateSW',
      registerType: 'prompt',
      workbox: {
        runtimeCaching: [
          {
            // Cache API responses with network-first strategy
            urlPattern: /^\/api\/.*$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              backgroundSync: {
                name: 'api-queue',
                options: {
                  maxRetentionTime: 24 * 60 // Retry for 24 hours (in minutes)
                }
              }
            }
          },
          {
            // Cache static assets with cache-first strategy
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Cache document and form templates with stale-while-revalidate
            urlPattern: /^\/api\/v1\/templates\/.*$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'templates-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ],
        // Enable background sync for offline operations
        backgroundSync: {
          enable: true,
          // Sync envelope actions
          envelopes: {
            name: 'envelope-sync-queue',
            options: {
              maxRetentionTime: 24 * 60 // 24 hours (in minutes)
            }
          },
          // Sync signing actions
          signing: {
            name: 'signing-sync-queue',
            options: {
              maxRetentionTime: 24 * 60 // 24 hours (in minutes)
            }
          },
          // Sync confirmation emails
          confirmations: {
            name: 'confirmation-sync-queue',
            options: {
              maxRetentionTime: 24 * 60 // 24 hours (in minutes)
            }
          }
        }
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      }
    })
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
});
