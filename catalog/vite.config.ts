import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readCatalog } from './registry';

// The catalog page, built last, into the root of the site's dist/ after every
// course has been built into its own folder there (tools/build-site.mjs). Its
// service worker is the whole site's: it lists the catalog and every course's
// page, icons, poster and photos, so the one installed app works offline in
// every course.

const courses = resolve(__dirname, '../courses');

/** Serves `virtual:courses`: every course's course.json, read when the page is built. */
function coursesModule(): Plugin {
  const id = '\0virtual:courses';
  return {
    name: 'catalog-courses',
    resolveId: (source) => (source === 'virtual:courses' ? id : null),
    load(source) {
      if (source !== id) return null;
      return `export default ${JSON.stringify(readCatalog(courses))};`;
    },
  };
}

export default defineConfig({
  root: __dirname,
  // Relative, so the site works from a GitHub Pages sub-path.
  base: './',
  // Ports follow the local-dev port scheme: one block of ten per web project.
  server: { port: 5410, strictPort: true },
  preview: { port: 5411, strictPort: true },
  build: { target: 'es2022', outDir: resolve(__dirname, '../dist'), emptyOutDir: false },
  plugins: [
    coursesModule(),
    viteSingleFile(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // registered in src/main.ts and by each course
      includeManifestIcons: false,
      workbox: {
        globPatterns: [
          'index.html',
          'icons/*.{png,svg}',
          '*/index.html',
          '*/poster.webp',
          '*/photos/*.webp',
          '*/icons/*.{png,svg}',
        ],
        inlineWorkboxRuntime: true,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Photos are well under this; Clouds' inlined page is the largest file.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Nothing here has a hashed name, so every file gets a revision.
        dontCacheBustURLsMatching: /^(?!)/,
      },
      manifest: {
        name: 'Course Catalog',
        short_name: 'Courses',
        description: 'Interactive workbooks: clouds and weather, soil, electronics, photography.',
        // Kept from when the site was Clouds alone, so the app already
        // installed on a phone updates in place rather than becoming a second app.
        id: 'clouds-app',
        theme_color: '#f4f1e8',
        background_color: '#f4f1e8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
