// First, so edited course text (Settings) is in place before anything reads it.
import { COURSE } from './course';
import './app/styles/app.css';
import { defineCourse } from 'didactics/app';
import { el } from 'didactics/dom';
import { SITE_URL } from './app/asset';
import { lessonPieces } from './app/course-pieces';
import { DECK } from './app/deck';
import { FIGURES } from './app/figures';
import { prose } from './app/figures/kit';
import { store } from './app/store';
import { creditsView } from './app/views/credits';
import { homeView } from './app/views/home';
import { lessonOptions } from './app/views/lesson';
import { referenceView } from './app/views/reference';
import { LESSONS } from './core/lessons';
import { emptySave } from './core/save';

/** A lit LED on a board, for the update banner: drawn inline so it shows offline. */
const LED =
  '<svg viewBox="0 0 44 44"><path d="M6 34h32" stroke="#c8793a" stroke-width="4" stroke-linecap="round"/>' +
  '<path d="M17 34V24M27 34V24" stroke="#b9bec4" stroke-width="2.4"/>' +
  '<path d="M13 25V17a9 9 0 0 1 18 0v8Z" fill="#ffb21c"/><circle cx="18" cy="15" r="2.5" fill="#fff4cf"/></svg>';

// The whole app (Didactics' app.ts): the top bar and its menu, the lesson
// player, the quiz, Settings, the update banner. The save is "circuitry.save",
// the course's edited text "circuitry.course", and the files
// circuitry-save.json, circuitry-course.json and circuitry.html. What is
// Circuitry's own is passed in: the home page with its tracks, the reference
// page (symbols and glossary included) and Credits.
defineCourse({
  id: 'circuitry',
  title: 'Circuitry',
  subtitle: 'A circuits workbook',
  site: SITE_URL,
  update: { title: 'New revision', text: 'A new version of Circuitry is ready.', icon: LED },

  lessons: LESSONS,
  figures: FIGURES,
  prose,
  lesson: lessonOptions,
  // Circuitry's own save (core/save.ts): metric only, no radio.
  save: { store, empty: emptySave },
  text: COURSE,
  textPieces: lessonPieces(),

  // The board over the lessons by track (core, then pedals and solar), and the way to the reference.
  home: homeView,
  pages: [
    { path: '/reference', label: 'Reference', view: referenceView },
    // Circuitry has no photos, so not Didactics' photo Credits page.
    { path: '/credits', view: creditsView },
  ],
  menu: ['/home', '/reference', '/quiz', '/settings'],
  quiz: {
    deck: DECK,
    blurb: 'Flash cards on the ideas in the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
    // Until a lesson is written the deck is empty; after that Didactics says the cards come as lessons are done.
    empty: DECK.length ? undefined : 'Flash cards arrive with the first written lesson.',
  },
  settings: {
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': type and sources.'),
  },
});
