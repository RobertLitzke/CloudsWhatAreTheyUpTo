// Units, name, the radio, moving progress between devices, and the course's
// text to revise, all of it or one lesson (Didactics' settings page, in
// Clouds' words).

import { courseSection } from 'didactics/course-view';
import { settingsView as kitSettingsView } from 'didactics/settings';
import { COURSE } from '../../course';
import { asset } from '../asset';
import { el } from 'didactics/dom';
import { store } from '../store';
import { emptySave } from '../../core/save';
import { PHOTOS } from '../photos';
import { lessonPieces } from '../course-pieces';

export const settingsView = kitSettingsView({
  store,
  empty: emptySave,
  appName: 'Clouds',
  saveFile: 'clouds-save.json',
  units: { label: 'Heights in', imperial: 'Feet', metric: 'Metres' },
  radio: { blurb: 'With the radio on, an old hand at Walla Walla opens each lesson on a typed slip, and puts the questions at the end to you over the air. Off, the lessons are a plain workbook ending in a check.' },
  oneFile: { href: asset('clouds.html'), name: 'clouds.html', offline: { href: asset('clouds-offline.html'), name: 'clouds-offline.html' } },
  offline: { folder: 'photos/', total: PHOTOS.length, noun: 'photos' },
  sections: courseSection({ edits: COURSE, fileName: 'clouds-course.json', pieces: lessonPieces() }),
  about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photos, and under what licence.'),
});
