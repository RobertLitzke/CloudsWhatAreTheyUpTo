// Units, name, and moving progress between devices (lesson-kit's settings
// page, in Dirt's words).

import { el } from 'lesson-kit/dom';
import { settingsView as kitSettingsView } from 'lesson-kit/settings';
import { emptySave } from '../../core/save';
import { asset } from '../asset';
import { store } from '../store';

export const settingsView = kitSettingsView({
  store,
  empty: emptySave,
  appName: 'Dirt',
  saveFile: 'dirt-save.json',
  units: { label: 'Measure in', imperial: 'Inches and feet', metric: 'Centimetres and metres' },
  oneFile: { href: asset('dirt.html'), name: 'dirt.html' },
  about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photos, and under what licence.'),
});
