// Units, name, and moving progress between devices.

import { el } from '../dom';
import type { View } from '../router';
import { exportSave, getSave, importSave, setSave, updateSave } from '../store';
import { emptySave } from '../../core/save';
import { segmented, toast } from '../ui';

export const settingsView: View = (root) => {
  const save = getSave();
  const name = el('input', { type: 'text', maxLength: 40, value: save.name, placeholder: 'Your name' }) as HTMLInputElement;
  name.addEventListener('change', () => updateSave((s) => ({ ...s, name: name.value.trim() })));

  const file = el('input', { type: 'file', accept: 'application/json,.json', hidden: true }) as HTMLInputElement;
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    toast(importSave(await f.text()) ? 'Progress loaded.' : 'That file is not a Clouds save.');
    file.value = '';
  });

  const download = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'clouds-save.json' }) as HTMLAnchorElement;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  root.append(
    el(
      'div.page.settings',
      {},
      el('h1', {}, 'Settings'),
      el('label.field', {}, el('span', {}, 'Name on the logbook'), name),
      el(
        'div.field',
        {},
        el('span', {}, 'Heights in'),
        segmented(
          [
            { value: 'imperial', label: 'Feet' },
            { value: 'metric', label: 'Metres' },
          ] as const,
          save.units,
          (units) => updateSave((s) => ({ ...s, units })),
        ),
      ),
      el('h2', {}, 'Progress'),
      el('p.muted', {}, 'Progress lives in this browser. Save it to a file to move it to another device.'),
      el(
        'div.row',
        {},
        el('button.btn', { type: 'button', onclick: download }, 'Save to file'),
        el('button.btn.btn-ghost', { type: 'button', onclick: () => file.click() }, 'Load from file'),
        file,
      ),
      el('h2', {}, 'About'),
      el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photos, and under what licence.'),
      el(
        'button.btn.btn-danger',
        {
          type: 'button',
          onclick: () => {
            if (!confirm('Erase all progress?')) return;
            setSave(emptySave());
            toast('Progress erased.');
          },
        },
        'Erase progress',
      ),
    ),
  );
};
