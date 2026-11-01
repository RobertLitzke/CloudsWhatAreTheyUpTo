import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): the page with everything inlined,
// the same page again as dist/astronomy.html for Settings' download link, and
// a service worker entry. Photos sit in dist/photos/; the site's service
// worker keeps them for offline.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5480,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    oneFile: 'astronomy.html',
    precache: ['photos/*.webp'],
    manifest: {
      name: 'Astronomy: how we found out',
      short_name: 'Astronomy',
      description: 'Short illustrated lessons on the sky and the stars, each opening on a puzzle.',
      // Keep in sync with --bg in src/styles/tokens.css.
      theme_color: '#141a2e',
      id: '.',
      icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
  }),
);
