import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): the page with everything inlined,
// the same page again as dist/geology.html for Settings' download link, and
// a service worker. Photos and the map reliefs sit in dist/photos/ and
// dist/maps/; the site's service worker keeps them for offline.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5470,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    oneFile: 'geology.html',
    precache: ['photos/*.webp', 'maps/*.png', 'maps/*.json'],
    manifest: {
      name: 'Geology: mysteries in the rocks',
      short_name: 'Geology',
      description: 'Short illustrated lessons on reading rocks, each opening on a puzzle.',
      // Keep in sync with --bg in src/styles/tokens.css.
      theme_color: '#2a2420',
      id: '.',
      icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
  }),
);
