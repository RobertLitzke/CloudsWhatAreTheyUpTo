// The signal strip: the path a note takes (sources, filter, amplifier, out),
// each box lit by how much of the note gets that far. A box goes faint where
// the sound is quiet and dark where it dies, and the strip says which. The
// levels are core/reach's estimate from the knobs, not a measurement.

import { el } from 'didactics/dom';
import { reach, DEAD_DB, FAINT_DB, type Stage } from '../core/reach';
import type { Sound } from '../core/params';

export interface Strip {
  el: HTMLElement;
  set(sound: Sound): void;
}

const NAMES: Record<Stage, string> = { osc: 'Sources', filter: 'Filter', amp: 'Amp' };
const WHERE: Record<Stage, string> = {
  osc: 'Nothing is coming out of the sources: the oscillator and noise are both turned down.',
  filter: 'The filter is taking away everything the sources make.',
  amp: 'The amplifier never opens far enough while a note is held.',
};
const FAINT: Record<Stage, string> = {
  osc: 'The sources are turned well down.',
  filter: 'The filter lets only a little through.',
  amp: 'The notes end before the amplifier has opened far.',
};

export function createStrip(): Strip {
  const boxes = (['osc', 'filter', 'amp'] as const).map((id) => ({
    id,
    node: el('span.strip-box', {}, el('span.strip-name', {}, NAMES[id]), el('span.strip-db', {})) as HTMLElement,
  }));
  const say = el('p.strip-say', { role: 'status' });
  const arrow = () => el('span.strip-arrow', { 'aria-hidden': 'true' }, '›');
  const row = el('div.strip-row', {}, boxes.flatMap((b) => [b.node, arrow()]), el('span.strip-name', {}, 'Out'));
  const root = el('div.strip', {}, row, say);
  return {
    el: root,
    set(sound) {
      const r = reach(sound);
      const level: Record<Stage, number> = { osc: r.osc, filter: r.filter, amp: r.amp };
      for (const { id, node } of boxes) {
        const v = level[id];
        node.classList.toggle('faint', v < FAINT_DB && v >= DEAD_DB);
        node.classList.toggle('dark', v < DEAD_DB);
        node.querySelector('.strip-db')!.textContent = v < -60 ? 'silent' : `${Math.round(v)} dB`;
      }
      say.textContent = r.dies ? WHERE[r.dies] : r.fades ? FAINT[r.fades] : 'The sound gets all the way out.';
    },
  };
}
