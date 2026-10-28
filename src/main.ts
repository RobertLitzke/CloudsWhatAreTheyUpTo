// First, so edited course text (Settings) is in place before anything reads it.
import './course';
import './app/styles/app.css';
import { Router } from 'didactics/router';
import { appShell } from 'didactics/shell';
import { showSplash } from 'didactics/splash';
import { watchForUpdates } from 'didactics/update';
import { retireWhenSaved } from 'didactics/offline';
import { asset } from './app/asset';
import { PHOTOS } from './app/photos';
import { creditsView } from './app/views/credits';
import { homeView } from './app/views/home';
import { journalView } from './app/views/journal';
import { quizView } from './app/views/quiz';
import { seedView } from './app/views/seed';
import { settingsView } from './app/views/settings';
import { shiftView } from './app/views/shift';
import { skyView } from './app/views/sky';

const NAV = [
  { path: '/home', label: 'Home' },
  { path: '/sky', label: 'Sky lab' },
  { path: '/quiz', label: 'Quiz' },
  { path: '/journal', label: 'Journal' },
  { path: '/settings', label: 'Settings' },
];

/** A little peach cloud with an up arrow, for the update banner: drawn inline so it shows offline. */
const CLOUD =
  '<svg viewBox="0 0 44 44"><path d="M13 31a7 7 0 0 1-.6-14 9.5 9.5 0 0 1 18.3 1.6A6.3 6.3 0 0 1 31 31Z" fill="#f6b98e" stroke="#2a2547" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M22 28v-9m-4 4 4-4 4 4" fill="none" stroke="#2a2547" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function boot(): void {
  showSplash({ src: asset('poster.webp'), alt: 'Clouds: What are they up to?' });
  // The pages sit in a menu under the current page's name, so more can join without crowding the bar.
  const shell = appShell({
    mount: document.getElementById('app')!,
    title: 'Clouds',
    subtitle: 'What are they up to?',
    nav: NAV,
    // A lesson fills the screen: the header would only be in the way.
    fullScreen: (path) => path.startsWith('/shift/'),
  });
  const router = new Router(shell.outlet, { before: shell.before });
  router
    .add('/home', homeView)
    .add('/shift/:id', shiftView)
    .add('/quiz', quizView)
    .add('/seed', seedView)
    .add('/sky', skyView)
    .add('/journal', journalView)
    .add('/journal/:tab', journalView)
    .add('/credits', creditsView)
    .add('/settings', settingsView)
    .start('/home');

  if (import.meta.env.DEV) void import('didactics/overflow').then((m) => m.watchOverflow());

  // The page also runs straight from disk, where there is no service worker.
  if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    watchForUpdates({ title: 'New forecast in', text: 'A fresh version of Clouds is ready.', icon: CLOUD });
    // Before 2026-10-26 each photo was kept in a cache of its own once seen.
    void retireWhenSaved('photos/', PHOTOS.length, ['photos']);
  }
}

boot();
