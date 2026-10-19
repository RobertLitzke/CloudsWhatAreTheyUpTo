import './app/styles/app.css';
import { el } from './app/dom';
import { Router } from './app/router';
import { showSplash } from './app/splash';
import { watchForUpdates } from './app/update';
import { creditsView } from './app/views/credits';
import { homeView } from './app/views/home';
import { journalView } from './app/views/journal';
import { settingsView } from './app/views/settings';
import { shiftView } from './app/views/shift';

const NAV: readonly [string, string][] = [
  ['/home', 'Lookout'],
  ['/journal', 'Journal'],
  ['/settings', 'Settings'],
];

function boot(): void {
  showSplash();
  const app = document.getElementById('app')!;
  const links = NAV.map(([path, label]) => el('a', { href: `#${path}` }, label));
  const header = el(
    'header.topbar',
    {},
    el('a.wordmark', { href: '#/home' }, 'Clouds', el('span', {}, 'What are they up to?')),
    el('nav', {}, links),
  );
  const outlet = el('main');
  app.replaceChildren(header, outlet);

  const markHere = () => {
    const here = location.hash.replace(/^#/, '');
    links.forEach((a, i) => a.classList.toggle('here', here.startsWith(NAV[i][0])));
  };
  window.addEventListener('hashchange', markHere);

  const router = new Router(outlet, {
    // A shift fills the screen: the header would only be in the way.
    before: (path) => document.body.classList.toggle('in-shift', path.startsWith('/shift/')),
  });
  router
    .add('/home', homeView)
    .add('/shift/:id', shiftView)
    .add('/journal', journalView)
    .add('/credits', creditsView)
    .add('/settings', settingsView)
    .start('/home');
  markHere();

  if (import.meta.env.DEV) void import('./app/overflow').then((m) => m.watchOverflow());

  // The page also runs straight from disk, where there is no service worker.
  if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    watchForUpdates();
  }
}

boot();
