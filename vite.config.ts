import { defineConfig } from 'vite';
import { lessonApp } from 'lesson-kit/vite';
import pkg from './package.json';

// The build is lesson-kit's (packages/lesson-kit/src/vite.ts): everything
// inlined into dist/index.html, the same page again as dist/clouds.html for
// Settings' download link, and a service worker. Photos cannot be inlined:
// there are too many and they are large, so they sit in dist/photos/ and the
// service worker keeps each one once it has been seen.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5420,
    oneFile: 'clouds.html',
    precache: ['poster.webp'],
    cacheFolder: { path: '/photos/', name: 'photos', maxEntries: 600 },
    manifest: {
      name: 'Clouds: What are they up to?',
      short_name: 'Clouds',
      description: 'A cloud-watching game: learn every kind of cloud, what made it and what it means.',
      // Keep in sync with --bg in src/app/styles/tokens.css.
      theme_color: '#1b172f',
    },
  }),
);
