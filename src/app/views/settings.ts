// Units, name, and moving progress between devices (Didactics' settings
// page, in this course's words).

import { el } from 'didactics/dom';
import { settingsView as kitSettingsView } from 'didactics/settings';
import { emptySave } from '../../core/save';
import { asset } from '../asset';
import { store } from '../store';

export const settingsView = kitSettingsView({
  store,
  empty: emptySave,
  appName: 'Out of Auto',
  saveFile: 'out-of-auto-save.json',
  units: { label: 'Distances in', imperial: 'Feet', metric: 'Metres' },
  oneFile: { href: asset('out-of-auto.html'), name: 'out-of-auto.html' },
  about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photographs, and under what licence.'),
});
