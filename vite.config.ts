import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // supported floor: Chrome/Android WebView 111+, Safari/iOS 16.4+ (color-mix, :has, ??=)
  build: { target: ['chrome111', 'safari16.4', 'firefox114', 'edge111'] },
  plugins: [
    react(),
    VitePWA({
      // never reload in the middle of a lesson: the app applies updates on its own screens
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        globIgnores: ['**/nunito-vietnamese*', '**/nunito-latin-ext*', '**/nunito-cyrillic-ext*'],
      },
      manifest: {
        id: './',
        lang: 'ru',
        categories: ['education', 'music'],
        name: 'EarWise — тренажёр музыкального слуха',
        short_name: 'EarWise',
        description: 'Тренируй слух играючи: интервалы, аккорды, ступени, мелодии, гармония, ритм и пение.',
        theme_color: '#0f0a1f',
        background_color: '#0f0a1f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
