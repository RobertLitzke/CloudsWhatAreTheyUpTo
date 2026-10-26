import { defineConfig } from 'vite';
import { lessonApp } from 'lesson-kit/vite';
import pkg from './package.json';

// The build is lesson-kit's (packages/lesson-kit/src/vite.ts): everything
// inlined into dist/index.html, the same page again as dist/dirt.html for
// Settings' download link, and a service worker. Photos sit in dist/photos/
// and the service worker keeps each one once it has been seen.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5440,
    oneFile: 'dirt.html',
    cacheFolder: { path: '/photos/', name: 'photos', maxEntries: 400 },
    manifest: {
      name: 'Dirt: a gardener’s soil workbook',
      short_name: 'Dirt',
      description: 'Short illustrated lessons on soil for gardeners: texture, water, air, life, nutrients and how to build it.',
      // Keep in sync with --bg in src/app/styles/tokens.css.
      theme_color: '#1f2b1c',
    },
  }),
);
