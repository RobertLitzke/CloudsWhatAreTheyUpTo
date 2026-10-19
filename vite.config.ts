import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json';

// The app is inlined into dist/index.html (JS, CSS and the fonts), as in
// PatchMatch and Fretron. Photos cannot be: there are too many and they are
// large, so they sit in dist/photos/ and the service worker keeps each one
// once it has been seen, which is what makes a finished lesson work offline.
export default defineConfig({
  // Relative, so index.html works from file:// and from a GitHub Pages sub-path.
  base: './',
  // Ports follow the local-dev port scheme: one block of ten per web project,
  // +1 for the preview server.
  server: { port: 5420, strictPort: true },
  preview: { port: 5421, strictPort: true },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: 'es2022',
  },
  plugins: [
    viteSingleFile(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // registered by hand in main.ts
      // The glob below already lists the icons; left on, the plugin lists them
      // a second time without a revision and workbox refuses the conflict.
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['index.html', 'poster.webp', 'icons/*.png'],
        inlineWorkboxRuntime: true,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Nothing here has a hashed name, so every file gets a revision (see
        // the same setting in Fretron for the bug this avoids).
        dontCacheBustURLsMatching: /^(?!)/,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/photos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'photos',
              expiration: { maxEntries: 600 },
            },
          },
        ],
      },
      manifest: {
        name: 'Clouds: What are they up to?',
        short_name: 'Clouds',
        description: 'A cloud-watching game: learn every kind of cloud, what made it and what it means.',
        // Keep in sync with --bg in src/app/styles/tokens.css.
        theme_color: '#1b172f',
        background_color: '#1b172f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
