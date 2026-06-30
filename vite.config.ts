import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
      }
    },
    test: {
      globals: true,
      environment: 'node',
    },
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Olma Marketplace',
          short_name: 'Olma',
          theme_color: '#f9f4e8',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          icons: []
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /[\/]locales[\/].*\.json/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'locales-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 300 // 5 minutes max cache
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-image-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'firebase-image-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    base: '/',
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        external: ['firebase-admin', 'firebase-admin/firestore'],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Core React
              if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react-router/') || id.includes('/node_modules/react-router-dom/') || id.includes('/node_modules/@remix-run/')) {
                return 'vendor-react';
              }
              // Firebase
              if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) {
                return 'vendor-firebase';
              }
              // Data Visualization
              if (id.includes('/node_modules/recharts/') || id.includes('/node_modules/d3-')) {
                return 'vendor-charts';
              }
              // Export / Utils (xlsx, html2canvas, jspdf)
              if (id.includes('/node_modules/xlsx/')) {
                return 'vendor-xlsx';
              }
              if (id.includes('/node_modules/html2canvas/')) {
                return 'vendor-html2canvas';
              }
              if (id.includes('/node_modules/jspdf/')) {
                return 'vendor-jspdf';
              }
              // Animation
              if (id.includes('/node_modules/framer-motion/') || id.includes('/node_modules/motion/')) {
                return 'vendor-motion';
              }
              // i18n
              if (id.includes('/node_modules/i18next/') || id.includes('/node_modules/react-i18next/')) {
                return 'vendor-i18n';
              }
              // Icons
              if (id.includes('/node_modules/lucide-react/')) {
                return 'vendor-icons';
              }
              // State Management
              if (id.includes('/node_modules/zustand/')) {
                return 'vendor-zustand';
              }
              // Algolia / Search
              if (id.includes('/node_modules/algoliasearch/') || id.includes('/node_modules/fuse.js/')) {
                return 'vendor-search';
              }
              // Sentry
              if (id.includes('/node_modules/@sentry/')) {
                return 'vendor-sentry';
              }
              // Date-fns
              if (id.includes('/node_modules/date-fns/')) {
                return 'vendor-date-fns';
              }
              // Tanstack
              if (id.includes('/node_modules/@tanstack/')) {
                return 'vendor-tanstack';
              }
              // File handling
              if (id.includes('/node_modules/browser-image-compression/') || id.includes('/node_modules/papaparse/')) {
                return 'vendor-files';
              }
              // Rich Text Editor
              if (id.includes('/node_modules/react-quill/') || id.includes('/node_modules/quill/')) {
                return 'vendor-quill';
              }
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false
    },
  };
});
