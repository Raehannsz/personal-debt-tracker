import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Personal Debt Tracker',
        short_name: 'Debt Tracker',
        description: 'Catat dan kelola hutang/piutang antar orang secara pribadi.',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // PERBAIKAN: Tambahkan runtime caching untuk Supabase API
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 jam
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  // PERBAIKAN: Tambahkan manual chunk splitting untuk vendor libraries
  build: {
  rollupOptions: {
    output: {
      manualChunks(id: string) {
        // Supabase
        if (id.includes('@supabase/supabase-js')) {
          return 'vendor-supabase';
        }
        // FontAwesome
        if (
          id.includes('@fortawesome/react-fontawesome') ||
          id.includes('@fortawesome/free-solid-svg-icons') ||
          id.includes('@fortawesome/fontawesome-svg-core')
        ) {
          return 'vendor-fontawesome';
        }
        // React ecosystem
        if (
          id.includes('react') &&
          !id.includes('react-router') &&
          !id.includes('vite')
        ) {
          return 'vendor-react';
        }
        // React Router
        if (id.includes('react-router')) {
          return 'vendor-router';
        }
        // Default: biarkan Vite handle sendiri
        return undefined;
      },
    },
  },
},
})