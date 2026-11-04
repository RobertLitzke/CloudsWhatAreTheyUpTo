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
import type { GeoLesson } from './lessons';
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

// Previews of figures not yet in any lesson, reached only by link
// (#/preview/globe-preview), with a save of their own so nothing done there
// touches the course's progress.
const preview = courseStore('geology-preview', { units: 'imperial' });

defineCourse({
  release: course.release as CourseRelease,
  id: 'geology',
  title: 'Geology',
  subtitle: 'Mysteries in the rocks',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  hero: makeBanner,
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('p', {}, 'Each lesson starts from a puzzle: something odd in a cliff or a hand of rock, or a question people argued about for decades. The trunk is geology anywhere. Some branches read Seattle, Whidbey Island and the ice age floods with it; others go further, to the Moon, into fossils and down to the core.'),
  figures: FIGURES,
  prose,
  pages: [{
    path: '/preview/:id',
    fullScreen: true,
    view: lessonView({ lessons: [globePreview as unknown as GeoLesson], figures: { ...FIGURES, ...GLOBE_PREVIEW }, store: preview.store, prose, home: '/home' }),
  }],
  // "Lesson 3 of 19": the trunk's whole plan.
  lesson: { of: () => 20 },
  save: { units: 'imperial' },
  photos: {
    photos: PHOTOS,
    name: (p) => p.about,
    after: el('p', {},
      'The maps’ heights come from ',
      el('a', { href: 'https://registry.opendata.aws/terrain-tiles/' }, 'Terrain Tiles on AWS'),
      ', made by Mapzen from USGS 3DEP and SRTM (public domain) and national surveys. For Britain: contains OS data © Crown copyright and database right. For France: produced using Copernicus data and information funded by the European Union, EU-DEM layers.'),
  },
  settings: {
    units: { label: 'Distances in', imperial: 'Feet and miles', metric: 'Metres and kilometres' },
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photographs, and where the maps’ heights come from.'),
  },
  catalog: { href: '../' },
  offline: { noun: 'photos and maps' },
  encyclopedia: { data: encyclopedia, course: 'geology' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
