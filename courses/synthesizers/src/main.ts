import './app/styles/app.css';
import { registerSW } from 'virtual:pwa-register';
import { el } from './app/dom';
import { Router } from './app/router';
import { toast } from './app/ui';
import { arcadeView } from './app/views/arcade';
import { freeplayView } from './app/views/freeplay';
import { homeView } from './app/views/home';
import { learnView } from './app/views/learn';
import { lessonView } from './app/views/lesson';
import { practiceView, roundView } from './app/views/round';
import { settingsView } from './app/views/settings';

const NAV: readonly [string, string][] = [
  ['/learn', 'Learn'],
  ['/free', 'Free play'],
  ['/settings', 'Settings'],
];

function boot(): void {
  const app = document.getElementById('app')!;
  const links = NAV.map(([path, label]) => el('a', { href: `#${path}` }, label));
  const outlet = el('main');
  app.replaceChildren(
    el('header.topbar', {}, el('a.wordmark', { href: '#/home' }, 'Patch', el('b', {}, 'Match')), el('nav', {}, links)),
    outlet,
  );

  const markHere = () => {
    const here = location.hash.replace(/^#/, '');
    // Lessons and practice belong to Learn.
    const section = /^\/(lesson|practice)\//.test(here) ? '/learn' : here;
    links.forEach((a, i) => a.classList.toggle('here', section.startsWith(NAV[i][0])));
  };
  window.addEventListener('hashchange', markHere);

  new Router(outlet)
    .add('/home', homeView)
    .add('/learn', learnView)
    .add('/lesson/:stage', lessonView)
    .add('/practice/:stage', practiceView)
    .add('/round/:key', roundView)
    .add('/round/:key/:puzzle', roundView)
    .add('/free', freeplayView)
    .add('/arcade', arcadeView)
    .add('/settings', settingsView)
    .start('/home');
  markHere();

  if (import.meta.env.DEV) void import('./app/overflow').then((m) => m.watchOverflow());

  // The page also runs straight from disk, where there is no service worker.
  if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const updateSW = registerSW({
      onNeedRefresh() {
        // A banner rather than confirm(): a native dialog would land in the
        // middle of a puzzle. This waits until the player chooses.
        toast('A new version is ready.', { label: 'Reload', run: () => void updateSW(true) });
      },
    });
  }
}

boot();
