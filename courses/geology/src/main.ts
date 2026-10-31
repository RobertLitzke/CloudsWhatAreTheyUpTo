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
  id: 'geology',
  title: 'Geology',
  subtitle: 'Mysteries in the rocks',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('p', {}, 'Each lesson starts from a puzzle: something odd in a cliff or a hand of rock, or a question people argued about for decades. The trunk is geology anywhere; the branches read Seattle, Whidbey Island and the ice age floods with it.'),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 18": the trunk's whole plan.
  lesson: { of: () => 18 },
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
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
