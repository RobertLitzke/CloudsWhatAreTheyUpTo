import 'didactics/styles/kit.css';
import './styles/tokens.css';
import { courseFiles } from 'didactics/course';
import { defineCourse } from 'didactics/app';
import { el } from 'didactics/dom';
import { SITE_URL } from './asset';
import { FIGURES } from './figures';
import { prose } from './figures/kit';
import { BRANCHES, LESSONS } from './lessons';
import { PHOTOS } from './photos';

defineCourse({
  id: 'astronomy',
  title: 'Astronomy',
  subtitle: 'How we found out',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('p', {}, 'Everything we know about the stars was worked out by people standing on one small planet, reasoning from points of light. Each lesson starts from a puzzle one of them faced. The trunk runs from the size of the Earth to the age of the universe; the branches go to the giant planets, other suns’ planets, black holes, and the sky over Puget Sound.'),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 22": the trunk's whole plan.
  lesson: { of: () => 22 },
  save: { units: 'metric', fixedUnits: true },
  photos: {
    photos: PHOTOS,
    name: (p) => p.about,
  },
  settings: {
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photographs.'),
  },
  catalog: { href: '../' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
