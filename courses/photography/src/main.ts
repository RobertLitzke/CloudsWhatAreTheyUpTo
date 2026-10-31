// First: the edited words go in before any module reads them.
import { COURSE, LESSON_PIECES } from './course';
import './app/styles/app.css';
import { defineCourse } from 'didactics/app';
import { el } from 'didactics/dom';
import { SITE_URL } from './app/asset';
import { CREDITS } from './app/credits';
import { DECK } from './app/deck';
import { FIGURES } from './app/figures';
import { prose } from './app/figures/kit';
import { BLADES } from './app/mark';
import { makeScene } from './app/scene/field';
import { store } from './app/store';
import { homeView } from './app/views/home';
import { referenceView } from './app/views/reference';
import { LESSONS } from './core/lessons';
import { emptySave } from './core/save';

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

// The whole app (Didactics' app.ts). The save stays under "outofauto.save"
// (app/store.ts) and the edited text under "out-of-auto.course" (course.ts),
// as before the course joined the site; the files are out-of-auto-save.json,
// out-of-auto-course.json and out-of-auto.html.
defineCourse({
  id: 'out-of-auto',
  title: 'Out of Auto',
  subtitle: 'A field workbook',
  mark: el('span.mark', { innerHTML: MARK }),
  site: SITE_URL,
  update: { title: 'New version', text: 'A fresh version of Out of Auto is ready.', icon: SHUTTER },

  lessons: LESSONS,
  figures: FIGURES,
  prose,
  lesson: {
    // "Lesson 1 of 12": the whole plan, which the home page shows too.
    countComing: true,
    hero: (l) => makeScene({ seed: 30 + l.n, time: l.n % 2 ? 'morning' : 'evening' }),
  },
  save: { store, empty: emptySave },
  text: COURSE,
  textPieces: LESSON_PIECES,

  home: homeView,
  pages: [{ path: '/reference', label: 'Reference', view: referenceView }],
  menu: ['/home', '/reference', '/review', '/settings'],
  // The site's catalog of every course, one folder up.
  catalog: { href: '../' },
  quiz: {
    deck: DECK,
    blurb: 'Flash cards on the ideas in the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
  },
  photos: CREDITS,
  settings: {
    units: { label: 'Distances in', imperial: 'Feet', metric: 'Metres' },
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photographs, and under what licence.'),
  },
});
