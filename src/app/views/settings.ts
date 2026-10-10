import { peekEngine } from '../../audio/engine';
import { MINT_VERSION } from '../../core/gen';
import { PD_ONLY, RIFFS } from '../../core/riffs';
import { emptySave } from '../../core/storage';
import { el } from '../dom';
import type { View } from '../router';
import { exportSave, getSave, importSave, setSave, updateSave } from '../store';
import { page, toast } from '../ui';

export const settingsView: View = (root) => {
  const save = getSave();

  const volume = el('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(save.volume), 'aria-label': 'Volume' }) as HTMLInputElement;
  volume.addEventListener('input', () => {
    const v = Number(volume.value);
    updateSave((s) => ({ ...s, volume: v }));
    peekEngine()?.setVolume(v);
  });

  const haptics = el('input', { type: 'checkbox', checked: save.haptics }) as HTMLInputElement;
  haptics.addEventListener('change', () => updateSave((s) => ({ ...s, haptics: haptics.checked })));

  const unlock = el('input', { type: 'checkbox', checked: save.unlockAll }) as HTMLInputElement;
  unlock.addEventListener('change', () => updateSave((s) => ({ ...s, unlockAll: unlock.checked })));

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportSave()], { type: 'application/json' }));
    const a = el('a', { href: url, download: 'patchmatch-progress.json' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const file = el('input', { type: 'file', accept: 'application/json,.json', hidden: true }) as HTMLInputElement;
  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    if (!confirm('Replace all progress in this browser with the contents of that file?')) return;
    toast(importSave(await chosen.text()) ? 'Progress imported' : 'That file is not a PatchMatch export');
    file.value = '';
  });

  const reset = () => {
    if (!confirm('Erase all progress, saved keys, statistics and arcade scores in this browser?')) return;
    setSave(emptySave());
    toast('Progress erased');
  };

  root.replaceChildren(
    page(
      el('h1', {}, 'Settings'),
      el('section', {}, el('h2', {}, 'Sound'), el('label.row', {}, el('span', {}, 'Volume'), volume)),
      el(
        'section',
        {},
        el('h2', {}, 'Feel'),
        el('label.row', {}, haptics, el('span', {}, 'Buzz on each knob click')),
        el('p.note', { style: 'margin-top: 6px' }, 'A short vibration for every detent, on phones that can. It does nothing on a computer or an iPhone.'),
      ),
      el(
        'section',
        {},
        el('h2', {}, 'Stages'),
        el('label.row', {}, unlock, el('span', {}, 'Unlock every stage')),
        el('p.note', { style: 'margin-top: 6px' }, 'For people who already know their way around a synth. Rounds played this way still count.'),
      ),
      el(
        'section',
        {},
        el('h2', {}, 'Progress'),
        el('p.note', {}, 'Progress, saved keys and statistics are kept in this browser only. Export them to move to another device or to keep a backup.'),
        el(
          'div.row',
          {},
          el('button.btn', { type: 'button', onclick: download }, 'Export'),
          el('button.btn', { type: 'button', onclick: () => file.click() }, 'Import'),
          el('button.btn', { type: 'button', onclick: reset }, 'Erase'),
          file,
        ),
      ),
      el(
        'section',
        {},
        el('h2', {}, 'About'),
        el(
          'p.note',
          {},
          `PatchMatch ${__APP_VERSION__}. New rounds use key version ${MINT_VERSION}. `,
          PD_ONLY ? `This copy carries the ${RIFFS.length} public-domain riffs only.` : `This copy carries ${RIFFS.length} riffs.`,
        ),
      ),
    ),
  );
};
