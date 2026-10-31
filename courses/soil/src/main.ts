// First, so edited course text (Settings) is in place before anything reads it.
import './course';
import './app/styles/app.css';
import { defineCourse } from 'didactics/app';
import { el } from 'didactics/dom';
import photos from './data/photos.json';
import { COURSE } from './course';
import { LESSONS } from './core/lessons';
import { SUBJECTS } from './core/photos';
import { emptySave } from './core/save';
import { SITE_URL } from './app/asset';
import { DECK } from './app/deck';
import { lessonPieces } from './app/course-pieces';
import { FIGURES } from './app/figures';
import { prose } from './app/figures/kit';
import { PHOTOS } from './app/picture';
import { makeGarden } from './app/scene/garden';
import { store } from './app/store';
import { homeView } from './app/views/home';
import { referenceView } from './app/views/reference';

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

// The whole app (Didactics' app.ts): the save is "dirt.save", the course's
// edited text "dirt.course", and the files dirt-save.json, dirt-course.json
// and dirt.html.
defineCourse({
  id: 'dirt',
  title: 'Dirt',
  subtitle: 'A soil workbook',
  mark: el('span.mark', { innerHTML: MARK }),
  lessons: LESSONS,
  figures: FIGURES,
  prose,
  // Each lesson opens under Dirt's garden.
  lesson: { hero: (l) => makeGarden({ seed: 30 + l.n, time: l.n % 2 ? 'morning' : 'noon' }) },
  // Dirt's own save (core/save.ts): in inches and feet to start.
  save: { store, empty: emptySave },
  // The garden in the morning over the lesson board, and the way to the reference.
  home: homeView,
  // The glossary is a section of the reference page.
  pages: [{ path: '/reference', label: 'Reference', view: referenceView }],
  menu: ['/home', '/reference', '/quiz', '/settings'],
  // The site's catalog of every course, one folder up.
  catalog: { href: '../' },
  quiz: {
    deck: DECK,
    blurb: 'Flash cards on the ideas in the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
  },
  photos: {
    photos: PHOTOS,
    name: (p) => SUBJECTS[p.subject],
    intro: el('p', {}, 'Particle sizes and texture classes follow the USDA Soil Survey Manual. The drawings of the garden and the soils are made for this app.'),
    empty: 'No photos have been fetched yet; drawings stand in for them until they are.',
    after: [
      el('h2', {}, 'Type'),
      el('p', {}, 'Fraunces by Undercase Type, Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, and Kalam by the Indian Type Foundry, all under the SIL Open Font License.'),
      el('p.muted', {}, `Version ${__APP_VERSION__}`),
    ],
  },
  text: COURSE,
  textPieces: lessonPieces(),
  settings: {
    units: { label: 'Measure in', imperial: 'Inches and feet', metric: 'Centimetres and metres' },
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photos, and under what licence.'),
  },
  site: SITE_URL,
  update: { title: 'Fresh growth', text: 'A new version of Dirt is ready.', icon: SPROUT },
  // Earlier versions kept each photo once seen, in a cache of their own; the
  // service worker now downloads them all, so that cache goes once it has.
  offline: { folder: 'photos/', total: photos.length, noun: 'photos', retire: ['photos'] },
});
