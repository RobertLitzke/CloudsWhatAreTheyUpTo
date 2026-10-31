// Units, name, moving progress between devices, and the course's text to
// download, one lesson or all of it (Didactics' settings page, in this
// course's words).

import { courseSection } from 'didactics/course-view';
import { el } from 'didactics/dom';
import { settingsView as kitSettingsView } from 'didactics/settings';
import { emptySave } from '../../core/save';
import { COURSE, LESSON_PIECES } from '../../course';
import { asset } from '../asset';
import { store } from '../store';

export const settingsView = kitSettingsView({
  store,
  empty: emptySave,
  appName: 'Out of Auto',
  saveFile: 'out-of-auto-save.json',
  units: { label: 'Distances in', imperial: 'Feet', metric: 'Metres' },
  oneFile: { href: asset('out-of-auto.html'), name: 'out-of-auto.html' },
  sections: courseSection({ edits: COURSE, fileName: 'out-of-auto-course.json', pieces: LESSON_PIECES }),
  about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photographs, and under what licence.'),
});
