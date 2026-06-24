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
            }
          ]
        }
      })
    ],
    base: '/',
    build: {
      outDir: 'dist',
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
