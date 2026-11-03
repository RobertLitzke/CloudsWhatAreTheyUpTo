// The hint to install the site as an app, shown to a new reader until they
// install it or say not now. Where the browser offers its own install prompt
// (Chrome, Edge, Android), the button opens it; elsewhere it says how: on an
// iPhone or iPad from the Share menu, otherwise from the browser's menu.

import { el } from 'didactics/dom';

const KEY = 'catalog.install';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let offer: InstallEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    offer = e as InstallEvent;
  });
  window.addEventListener('appinstalled', () => {
    offer = null;
    document.querySelector('.install')?.remove();
  });
}

/** Whether the page is open as an installed app already. */
export function isInstalled(): boolean {
  try {
    return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

const apple = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function installSlip(read: (key: string) => string | null, write?: (key: string, value: string) => void, installed = isInstalled()): HTMLElement | null {
  if (installed || read(KEY) === 'no') return null;
  const how = el('p.install-how', { hidden: true }, apple()
    ? 'In Safari, tap Share, then Add to Home Screen.'
    : 'Open your browser’s menu and choose Install, or Add to Home screen.');
  const button = el('button.btn.small', { type: 'button' }, 'Install');
  button.addEventListener('click', () => {
    if (offer) {
      void offer.prompt();
      void offer.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') slip.remove();
      });
      offer = null;
    } else how.hidden = !how.hidden;
  });
  const close = el('button.install-x', { type: 'button', 'aria-label': 'Not now' }, '✕');
  const slip = el(
    'aside.install',
    { 'aria-label': 'Install' },
    el('span.phone-ico', { 'aria-hidden': 'true' }),
    el('div', {}, el('p', {}, el('b', {}, 'Install'), ' to keep every course on this device, photos and all, for reading with no signal.'), how),
    button,
    close,
  );
  close.addEventListener('click', () => {
    write?.(KEY, 'no');
    slip.remove();
  });
  return slip;
}
