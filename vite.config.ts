import { defineConfig } from 'vite';
import { lessonApp } from 'lesson-kit/vite';
import pkg from './package.json';

// The build is lesson-kit's (packages/lesson-kit/src/vite.ts): everything
// inlined into dist/index.html, the same page again as dist/clouds.html for
// Settings' download link, and a service worker. Photos are too many and too
// large to inline into the page itself, so they sit in dist/photos/ and the
// service worker downloads every one when it installs, so the installed app
// works offline. dist/clouds-offline.html is the one-file copy with every
// photo inlined (about 13 MB), for when no install is possible.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5420,
    oneFile: 'clouds.html',
    offlineFile: 'clouds-offline.html',
    precache: ['poster.webp', 'photos/*.webp'],
    manifest: {
      name: 'Clouds: What are they up to?',
      short_name: 'Clouds',
      description: 'A cloud-watching game: learn every kind of cloud, what made it and what it means.',
      // Not the default (start_url): Rob's Chrome remembered an install that
      // had vanished from the phone and refused to install again (2026-10-26).
      id: 'clouds-app',
      // Keep in sync with --bg in src/app/styles/tokens.css.
      theme_color: '#1b172f',
    },
  }),
);
