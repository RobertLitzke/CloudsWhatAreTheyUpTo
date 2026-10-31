// First: the edited words go in before any module reads them.
import './course';
import './app/styles/app.css';
import { BLADES } from './app/mark';
import { el } from 'didactics/dom';
import { Router } from 'didactics/router';
import { appShell } from 'didactics/shell';
import { watchForUpdates } from 'didactics/update';
import { creditsView } from './app/views/credits';
import { homeView } from './app/views/home';
import { lessonView } from './app/views/lesson';
import { quizView } from './app/views/quiz';
import { referenceView } from './app/views/reference';
import { settingsView } from './app/views/settings';

const NAV = [
  { path: '/home', label: 'Home' },
  { path: '/reference', label: 'Reference' },
  { path: '/quiz', label: 'Quiz' },
  { path: '/settings', label: 'Settings' },
];

/** A shutter button with an up arrow, for the update banner: inline, so it shows offline. */
const SHUTTER =
  '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="14" fill="none" stroke="#e8a33d" stroke-width="3"/>' +
  '<path d="M22 29v-14m-5 5 5-5 5 5" fill="none" stroke="#f2efe9" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The app icon (tools/icons.mjs) as the header's logo mark: inline, so it shows offline. */
const MARK =
  '<svg viewBox="0 0 100 100" aria-hidden="true"><clipPath id="mark-r"><rect width="100" height="100" rx="22"/></clipPath>' +
  '<g clip-path="url(#mark-r)"><rect width="100" height="100" fill="#f2efe9"/>' +
  BLADES +
  '</g></svg>';

function boot(): void {
  const shell = appShell({
    mount: document.getElementById('app')!,
    title: 'Out of Auto',
    subtitle: 'A field workbook',
    mark: el('span.mark', { innerHTML: MARK }),
    nav: NAV,
    // A lesson fills the screen: the bar would only be in the way.
    fullScreen: (path) => path.startsWith('/lesson/'),
  });

  new Router(shell.outlet, { before: shell.before })
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
    watchForUpdates({ title: 'New version', text: 'A fresh version of Out of Auto is ready.', icon: SHUTTER });
  }
}

boot();
