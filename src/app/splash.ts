// The poster as a loading screen. It stays up for a moment even when the app
// is ready at once, because a poster that flashes past reads as a glitch, and
// a tap takes it away early.

import { el } from './dom';

const MIN_MS = 1600;

export function showSplash(): void {
  const img = el('img', { src: 'poster.webp', alt: 'Clouds: What are they up to?', decoding: 'async' }) as HTMLImageElement;
  const node = el('div.splash', { role: 'img', 'aria-label': 'Clouds: What are they up to?' }, img);
  document.body.append(node);
  const started = performance.now();
  let gone = false;
  const hide = () => {
    if (gone) return;
    gone = true;
    node.classList.add('out');
    node.addEventListener('transitionend', () => node.remove(), { once: true });
    // In case the transition never fires (reduced motion, a background tab).
    setTimeout(() => node.remove(), 800);
  };
  node.addEventListener('click', hide);
  const ready = img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = img.onerror = () => r(); });
  void ready.then(() => setTimeout(hide, Math.max(0, MIN_MS - (performance.now() - started))));
}
