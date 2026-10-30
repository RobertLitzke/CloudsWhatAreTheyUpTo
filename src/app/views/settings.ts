// Units, name, moving progress between devices, how many photos are saved for
// offline, and the course's text to revise, all of it or one lesson
// (Didactics' settings page, in Dirt's words).

import { courseSection } from 'didactics/course-view';
import { el } from 'didactics/dom';
import { settingsView as kitSettingsView } from 'didactics/settings';
import { emptySave } from '../../core/save';
import { COURSE } from '../../course';
import photos from '../../data/photos.json';
import { asset } from '../asset';
import { lessonPieces } from '../course-pieces';
import { store } from '../store';

export const settingsView = kitSettingsView({
  store,
  empty: emptySave,
  appName: 'Dirt',
  saveFile: 'dirt-save.json',
  units: { label: 'Measure in', imperial: 'Inches and feet', metric: 'Centimetres and metres' },
  offline: { folder: 'photos/', total: photos.length, noun: 'photos' },
  oneFile: { href: asset('dirt.html'), name: 'dirt.html' },
  sections: courseSection({ edits: COURSE, fileName: 'dirt-course.json', pieces: lessonPieces() }),
  about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photos, and under what licence.'),
});
