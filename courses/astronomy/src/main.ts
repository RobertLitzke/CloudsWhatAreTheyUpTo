import 'didactics/styles/kit.css';
import './styles/tokens.css';
import { courseFiles } from 'didactics/course';
import { courseStore, defineCourse } from 'didactics/app';
import { lessonView } from 'didactics/lesson';
import { el } from 'didactics/dom';
import encyclopedia from 'virtual:didactics/encyclopedia';
import { SITE_URL } from './asset';
import { FIGURES } from './figures';
import { prose } from './figures/kit';
import { BRANCHES, LESSONS } from './lessons';
import { PHOTOS } from './photos';
import { makeBanner } from './banner';
import { GLOBE_PREVIEW } from './figures/globe-preview';
import globePreview from './previews/globe.json';
import type { AstroLesson } from './lessons';
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

// Previews of figures not yet in any lesson, reached only by link
// (#/preview/globe-preview), with a save of their own so nothing done there
// touches the course's progress.
const preview = courseStore('astronomy-preview', { units: 'metric', fixedUnits: true });

defineCourse({
  release: course.release as CourseRelease,
  id: 'astronomy',
  title: 'Astronomy',
  subtitle: 'How we found out',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  hero: makeBanner,
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('p', {}, 'Everything we know about the stars was worked out by people standing on one small planet, reasoning from points of light. Each lesson starts from a puzzle one of them faced. The trunk runs from the size of the Earth to the age of the universe; the branches go to the giant planets, other suns’ planets, black holes, and the sky over Puget Sound.'),
  figures: FIGURES,
  prose,
  pages: [{
    path: '/preview/:id',
    fullScreen: true,
    view: lessonView({ lessons: [globePreview as unknown as AstroLesson], figures: { ...FIGURES, ...GLOBE_PREVIEW }, store: preview.store, prose, home: '/home' }),
  }],
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
  offline: { noun: 'photos' },
  encyclopedia: { data: encyclopedia, course: 'astronomy' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
