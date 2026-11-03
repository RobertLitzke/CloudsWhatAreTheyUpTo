import 'didactics/styles/kit.css';
import './game/styles/app.css';
import './styles/tokens.css';
import { courseFiles } from 'didactics/course';
import { defineCourse } from 'didactics/app';
import { el } from 'didactics/dom';
import type { View } from 'didactics/router';
import encyclopedia from 'virtual:didactics/encyclopedia';
import { SITE_URL } from './asset';
import { FIGURES } from './figures';
import { prose } from './figures/kit';
import { arcadeView } from './game/views/arcade';
import { freeplayView } from './game/views/freeplay';
import { homeView } from './game/views/home';
import { learnView } from './game/views/learn';
import { practiceView, roundView } from './game/views/round';
import { settingsView } from './game/views/settings';
import { BRANCHES, LESSONS } from './lessons';

/** One of PatchMatch's pages, in a .pm box of its own so its styles stay inside it. */
const pm = (view: View): View => (root, ctx) => {
  const box = el('div.pm.pm-page');
  root.replaceChildren(box);
  return view(box, ctx);
};

defineCourse({
  id: 'synthesizers',
  title: 'Synthesizers',
  subtitle: 'How a sound is built',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('div', {},
    el('p', {}, 'A synthesizer builds a sound from a few simple parts: something that wobbles, something that takes away, something that shapes each note in time. Each lesson opens on a puzzle from the history of sound (why a clarinet and a flute differ on the same note, how a throat makes vowels, why a bell with its start cut off sounds like a flute) and works it out on a live synth you play as you read. Headphones help.'),
    el('p', {}, 'Beside the lessons are the ', el('a', { href: '#/lab' }, 'Synth lab'), ', the whole synth to play with a keyboard, and ', el('a', { href: '#/ear' }, 'PatchMatch'), ', a game of matching a sound by ear in as few turns of the knobs as you can.')),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 17": the trunk's whole plan.
  lesson: { of: () => 17 },
  pages: [
    { path: '/lab', label: 'Synth lab', view: pm(freeplayView) },
    { path: '/ear', label: 'PatchMatch', view: pm(homeView) },
    { path: '/ear/stages', view: pm(learnView) },
    { path: '/ear/practice/:stage', view: pm(practiceView) },
    { path: '/ear/round/:key', view: pm(roundView) },
    { path: '/ear/round/:key/:puzzle', view: pm(roundView) },
    { path: '/ear/arcade', view: pm(arcadeView) },
    { path: '/ear/settings', view: pm(settingsView) },
  ],
  menu: ['/home', '/lab', '/ear', '/review', '/encyclopedia', '/settings'],
  catalog: { href: '../' },
  encyclopedia: { data: encyclopedia, course: 'synthesizers' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
