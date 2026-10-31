import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): everything inlined into
// dist/index.html, the same page again as dist/dirt.html for Settings'
// download link, and a service worker. Photos sit in dist/photos/ and the
// service worker downloads them all when it installs, so the installed app
// works offline from then on.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5440,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    oneFile: 'dirt.html',
    precache: ['photos/*.webp'],
    manifest: {
      name: 'Dirt: a gardener’s soil workbook',
      short_name: 'Dirt',
      description: 'Short illustrated lessons on soil for gardeners: texture, water, air, life, nutrients and how to build it.',
      // Keep in sync with --bg in src/app/styles/tokens.css.
      theme_color: '#1f2b1c',
      id: '.',
      icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
  }),
);
