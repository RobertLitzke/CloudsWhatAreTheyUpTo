// First, so edited course text (Settings) is in place before anything reads it.
import './course';
import './app/styles/app.css';
import { el } from 'didactics/dom';
import { Router } from 'didactics/router';
import { appShell, type NavLink } from 'didactics/shell';
import { retireWhenSaved } from 'didactics/offline';
import { watchForUpdates } from 'didactics/update';
import photos from './data/photos.json';
import { creditsView } from './app/views/credits';
import { homeView } from './app/views/home';
import { lessonView } from './app/views/lesson';
import { quizView } from './app/views/quiz';
import { referenceView } from './app/views/reference';
import { settingsView } from './app/views/settings';

const NAV: readonly NavLink[] = [
  { path: '/home', label: 'Home' },
  { path: '/reference', label: 'Reference' },
  { path: '/quiz', label: 'Quiz' },
  { path: '/settings', label: 'Settings' },
];

/** A sprout with an up arrow, for the update banner: drawn inline so it shows offline. */
const SPROUT =
  '<svg viewBox="0 0 44 44"><path d="M8 34h28" stroke="#5a3f28" stroke-width="4" stroke-linecap="round"/>' +
  '<path d="M22 33V20" stroke="#efe6cf" stroke-width="2.4" stroke-linecap="round"/>' +
  '<path d="M22 22c-1-6-6-9-12-8 0 6 5 9 12 8Z" fill="#b9d36c"/><path d="M22 19c1-6 6-9 12-8 0 6-5 9-12 8Z" fill="#b9d36c"/></svg>';

/** The app icon (tools/icons.mjs) as the header's logo mark: inline, so it shows offline. */
const MARK =
  '<svg viewBox="0 0 100 100" aria-hidden="true"><clipPath id="mark-r"><rect width="100" height="100" rx="22"/></clipPath>' +
  '<g clip-path="url(#mark-r)"><rect width="100" height="100" fill="#efe6cf"/>' +
  '<path d="M-40 76 Q50 50 140 76 V140 H-40Z" fill="#5a3f28"/>' +
  '<path d="M50 70 V47" stroke="#3f6b2a" stroke-width="7" stroke-linecap="round"/>' +
  '<path d="M50 50 C45 33 31 25 14 27 C14 45 30 54 50 50Z" fill="#4e8a2e"/>' +
  '<path d="M50 43 C55 26 69 18 86 20 C86 38 70 47 50 43Z" fill="#86b43e"/></g></svg>';

function boot(): void {
  const shell = appShell({
    mount: document.getElementById('app')!,
    title: 'Dirt',
    subtitle: 'A soil workbook',
    mark: el('span.mark', { innerHTML: MARK }),
    nav: NAV,
    // A lesson fills the screen: the header would only be in the way.
    fullScreen: (path) => path.startsWith('/lesson/'),
  });
  const router = new Router(shell.outlet, { before: shell.before });
  router
    .add('/home', homeView)
    .add('/lesson/:id', lessonView)
    .add('/reference', referenceView)
    .add('/quiz', quizView)
    .add('/credits', creditsView)
    .add('/settings', settingsView)
    .start('/home');

  if (import.meta.env.DEV) void import('didactics/overflow').then((m) => m.watchOverflow());

  // The page also runs straight from disk, where there is no service worker.
  if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    watchForUpdates({ title: 'Fresh growth', text: 'A new version of Dirt is ready.', icon: SPROUT });
    // Earlier versions kept each photo once seen, in a cache of their own; the
    // service worker now downloads them all, so drop that cache once it has.
    void retireWhenSaved('photos/', photos.length, ['photos']);
  }
}

boot();
