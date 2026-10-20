// Picks up a new deploy without a hard refresh.
//
// Each build's service worker lists index.html with a hash of its contents, so
// a changed build is a changed sw.js. The browser only looks at sw.js when a
// page is navigated to, though, and an installed app on a phone is mostly
// resumed from the background rather than opened afresh. So this also asks for
// an update whenever the app comes back to the foreground. A new worker waits
// until the player taps Reload.

import { registerSW } from 'virtual:pwa-register';
import { el } from './dom';

/** Don't look again sooner than this after the last look. */
const MIN_GAP_MS = 60 * 1000;

export function watchForUpdates(): void {
  let lastCheck = Date.now();

  const updateSW = registerSW({
    onNeedRefresh() {
      showBanner(() => void updateSW(true));
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      const check = async () => {
        if (Date.now() - lastCheck < MIN_GAP_MS) return;
        if (registration.installing || !navigator.onLine) return;
        lastCheck = Date.now();
        // Asking while the server is unreachable would log a failed update, so
        // make sure sw.js can be fetched first.
        try {
          const resp = await fetch(swUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
          if (resp.status === 200) await registration.update();
        } catch {
          // Offline or flaky: try again next time.
        }
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void check();
      });
      window.addEventListener('focus', () => void check());
    },
  });
}

/** A little peach cloud with an up arrow: drawn inline so it shows offline. */
const CLOUD =
  '<svg viewBox="0 0 44 44"><path d="M13 31a7 7 0 0 1-.6-14 9.5 9.5 0 0 1 18.3 1.6A6.3 6.3 0 0 1 31 31Z" fill="#f6b98e" stroke="#2a2547" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M22 28v-9m-4 4 4-4 4 4" fill="none" stroke="#2a2547" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * A banner rather than confirm(): a native dialog would land in the middle of a
 * run. It does not use the .toast class, so a passing toast cannot knock it away,
 * and it stays until the player reloads or dismisses it.
 */
function showBanner(reload: () => void): void {
  if (document.querySelector('.update-banner')) return;
  const close = () => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 200);
  };
  const node = el(
    'div.update-banner',
    { role: 'status' },
    el('span.update-icon', { innerHTML: CLOUD, 'aria-hidden': 'true' }),
    el(
      'div.update-text',
      {},
      el('strong', {}, 'New forecast in'),
      el('span', {}, 'A fresh version of Clouds is ready.'),
    ),
    el(
      'div.update-actions',
      {},
      el('button.btn.btn-small.update-later', { type: 'button', onclick: close }, 'Later'),
      el('button.btn.btn-small', { type: 'button', onclick: () => { node.remove(); reload(); } }, 'Reload'),
    ),
  );
  document.body.append(node);
}
