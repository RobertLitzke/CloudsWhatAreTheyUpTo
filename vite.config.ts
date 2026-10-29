import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): everything
// inlined into dist/index.html, the same page again as dist/out-of-auto.html for
// Settings' download link, and a service worker. Photos sit in dist/photos/
// and the service worker keeps each one once it has been seen.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5460,
    oneFile: 'out-of-auto.html',
    precache: ['photos/*.webp'],
    manifest: {
      name: 'Out of Auto: a photography workbook',
      short_name: 'Out of Auto',
      description: 'Short illustrated lessons on photography for nature with a long zoom: exposure, focus, movement, grain, reach and colour.',
      // Keep in sync with --bg in src/app/styles/tokens.css.
      theme_color: '#1d2430',
    },
  }),
);
