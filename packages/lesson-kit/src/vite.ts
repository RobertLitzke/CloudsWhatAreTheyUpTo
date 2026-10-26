// The build every lesson app shares. The app is inlined into dist/index.html
// (JS, CSS and fonts), so the page works from file:// and from a GitHub Pages
// sub-path; photos and other large files sit next to it and the service
// worker keeps each one once it has been seen, which is what makes a finished
// lesson work offline. The same page is also written under a second name, the
// one-file copy that the settings page offers to download.

import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin, UserConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Writes dist/index.html again as dist/`name`. A second name, so the browser
 * saves it as a file rather than opening the app, and so it is not the page
 * the service worker serves.
 */
export function oneFileCopy(root: string, name: string): Plugin {
  return {
    name: 'one-file-copy',
    apply: 'build',
    closeBundle() {
      const out = resolve(root, 'dist');
      copyFileSync(resolve(out, 'index.html'), resolve(out, name));
    },
  };
}

export interface LessonAppOptions {
  /** The folder vite.config.ts is in. */
  root: string;
  /** The app's version, shown as __APP_VERSION__. */
  version: string;
  /** Dev server port; the preview server gets the next one. */
  port: number;
  /** The one-file copy's name, such as "clouds.html". */
  oneFile: string;
  manifest: { name: string; short_name: string; description: string; theme_color: string; background_color?: string };
  /** Files besides index.html and the icons to precache, such as a poster. */
  precache?: string[];
  /** A folder of large files (photos) kept by the service worker once seen. */
  cacheFolder?: { path: string; name: string; maxEntries: number };
}

/** The whole Vite config for a lesson app. */
export function lessonApp(o: LessonAppOptions): UserConfig {
  return {
    // Relative, so index.html works from file:// and from a GitHub Pages sub-path.
    base: './',
    server: { port: o.port, strictPort: true },
    preview: { port: o.port + 1, strictPort: true },
    define: { __APP_VERSION__: JSON.stringify(o.version) },
    build: { target: 'es2022' },
    plugins: [
      viteSingleFile(),
      oneFileCopy(o.root, o.oneFile),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null, // registered by hand, with lesson-kit's update.ts
        // The glob below already lists the icons; left on, the plugin lists them
        // a second time without a revision and workbox refuses the conflict.
        includeManifestIcons: false,
        workbox: {
          globPatterns: ['index.html', ...(o.precache ?? []), 'icons/*.png'],
          inlineWorkboxRuntime: true,
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          // Nothing here has a hashed name, so every file gets a revision.
          dontCacheBustURLsMatching: /^(?!)/,
          runtimeCaching: o.cacheFolder
            ? [
                {
                  urlPattern: ({ url }) => url.pathname.includes(o.cacheFolder!.path),
                  handler: 'CacheFirst',
                  options: { cacheName: o.cacheFolder.name, expiration: { maxEntries: o.cacheFolder.maxEntries } },
                },
              ]
            : [],
        },
        manifest: {
          ...o.manifest,
          background_color: o.manifest.background_color ?? o.manifest.theme_color,
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
  };
}
