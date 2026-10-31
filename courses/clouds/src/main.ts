// First, so edited course text (Settings) is in place before anything reads it.
import { COURSE } from './course';
import './app/styles/app.css';
import { defineCourse } from 'didactics/app';
import { el } from 'didactics/dom';
import { makeRng } from 'didactics/rng';
import { genus } from './core/clouds';
import { mirrorFor } from './core/photos';
import { buildDeck } from './core/quiz';
import { SHIFTS } from './core/shifts';
import { asset, SITE_URL } from './app/asset';
import { lessonPieces } from './app/course-pieces';
import { FIGURES } from './app/figures';
import { prose } from './app/figures/kit';
import { photoFigure, PHOTOS } from './app/photos';
import { store } from './app/store';
import { emptySave } from './core/save';
import { homeView } from './app/views/home';
import { journalView } from './app/views/journal';
import { seedView } from './app/views/seed';
import { shiftOptions } from './app/views/shift';
import { skyView } from './app/views/sky';

/** A little peach cloud with an up arrow, for the update banner: drawn inline so it shows offline. */
const CLOUD =
  '<svg viewBox="0 0 44 44"><path d="M13 31a7 7 0 0 1-.6-14 9.5 9.5 0 0 1 18.3 1.6A6.3 6.3 0 0 1 31 31Z" fill="#f6b98e" stroke="#2a2547" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M22 28v-9m-4 4 4-4 4 4" fill="none" stroke="#2a2547" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// The app is Didactics' (didactics/app): the top bar and its menu, the lesson
// player, the quiz, Credits, Settings, the update banner. What is Clouds' own
// is passed in: the home page, the sky lab, the seeding game and the journal.
defineCourse({
  id: 'clouds',
  title: 'Clouds',
  subtitle: 'What are they up to?',
  site: SITE_URL,
  splash: { src: asset('poster.webp'), alt: 'Clouds: What are they up to?' },
  update: { title: 'New forecast in', text: 'A fresh version of Clouds is ready.', icon: CLOUD },

  lessons: SHIFTS,
  figures: FIGURES,
  prose,
  lessonPath: '/shift',
  lesson: shiftOptions,
  save: { store, empty: emptySave },
  text: COURSE,
  textPieces: lessonPieces(),

  home: homeView,
  pages: [
    { path: '/sky', label: 'Sky lab', view: skyView },
    { path: '/seed', view: seedView },
    { path: '/journal', label: 'Journal', view: journalView },
    { path: '/journal/:tab', view: journalView },
  ],
  // The pages sit in a menu under the current page's name, so more can join without crowding the bar.
  menu: ['/home', '/sky', '/review', '/journal', '/settings'],
  // The site's catalog of every course, one folder up.
  catalog: { href: '../' },

  quiz: {
    // The same wrong answers every time a card comes up, so a card is a card.
    deck: buildDeck(PHOTOS, makeRng(1931)),
    blurb: 'Flash cards on real photos, on what makes each cloud and what it means, and on the ideas behind the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
    media: (card) => (card.photo ? photoFigure(card.photo, 'A cloud to name', mirrorFor(card.photo, Math.random)) : null),
  },
  photos: {
    photos: PHOTOS,
    name: (p) => genus(p.genus).name,
    intro: el('p', {}, 'Cloud names, heights and classification follow the WMO International Cloud Atlas. The drawn clouds and landscapes are made for this app.'),
    empty: 'No photos have been fetched yet; the lessons use drawings until they are.',
    after: [
      el('h2', {}, 'Type'),
      el('p', {}, 'Oswald by Vernon Adams and Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, both under the SIL Open Font License.'),
      el('p.muted', {}, `Version ${__APP_VERSION__}`),
    ],
  },
  // Before 2026-10-26 each photo was kept in a cache of its own once seen.
  offline: { folder: 'photos/', total: PHOTOS.length, noun: 'photos', retire: ['photos'] },
  settings: {
    units: { label: 'Heights in', imperial: 'Feet', metric: 'Metres' },
    radio: { blurb: 'With the radio on, an old hand at Walla Walla opens each lesson on a typed slip, and puts the questions at the end to you over the air. Off, the lessons are a plain workbook ending in a check.' },
    oneFile: { href: asset('clouds.html'), name: 'clouds.html', offline: { href: asset('clouds-offline.html'), name: 'clouds-offline.html' } },
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photos, and under what licence.'),
  },
});
