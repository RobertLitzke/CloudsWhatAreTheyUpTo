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

export interface UpdateBannerText {
  /** The banner's heading, such as "New forecast in". */
  title: string;
  /** One line under it, such as "A fresh version of Clouds is ready." */
  text: string;
  /** An SVG drawn in the banner's icon tile, as markup, so it shows offline. */
  icon?: string;
}

export function watchForUpdates(banner: UpdateBannerText): void {
  let lastCheck = Date.now();

  const updateSW = registerSW({
    onNeedRefresh() {
      showBanner(banner, () => void updateSW(true));
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

/** An up arrow in a ring, for when the app gives no icon of its own. */
const ARROW =
  '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="12" fill="#fff" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M22 28v-12m-5 5 5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * A banner rather than confirm(): a native dialog would land in the middle of a
 * run. It does not use the .toast class, so a passing toast cannot knock it away,
 * and it stays until the player reloads or dismisses it.
 */
function showBanner({ title, text, icon = ARROW }: UpdateBannerText, reload: () => void): void {
  if (document.querySelector('.update-banner')) return;
  const close = () => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 200);
  };
  const node = el(
    'div.update-banner',
    { role: 'status' },
    el('span.update-icon', { innerHTML: icon, 'aria-hidden': 'true' }),
    el(
      'div.update-text',
      {},
      el('strong', {}, title),
      el('span', {}, text),
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
