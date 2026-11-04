// Branch N3, Farmers in the forest: a leafcutter ants' fungus garden, fed
// with leaves, attacked by a weed fungus, defended by bacteria on the ants.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, legend, slider, toggles } from './kit';

const W = 400;

export interface Garden {
  /** Leaves brought in, relative to what keeps a garden steady. */
  leaves: number;
  /** How often weed-fungus spores land in the garden. */
  spores: number;
  /** The ants carry the bacteria whose chemicals kill the weed. */
  bacteria: boolean;
}

export const DAYS = 120;

/**
 * The garden (share of the chamber the crop fungus fills) and the weed fungus
 * (share it has taken), day by day. The crop grows on the leaves; the weed
 * grows by feeding on the crop; the ants weed some out every day, and the
 * bacteria kill much more. A model.
 */
export function garden(o: Garden): { crop: number[]; weed: number[] } {
  let crop = 0.6;
  let weed = 0;
  const cropOut = [crop];
  const weedOut = [weed];
  const killed = o.bacteria ? 0.5 : 0.03;
  for (let d = 1; d <= DAYS; d++) {
    const grow = 0.12 * o.leaves * crop * (1 - crop - weed);
    const eaten = 0.6 * weed * crop;
    crop = Math.max(0, crop + grow - eaten - 0.02 * crop);
    weed = Math.max(0, Math.min(1, weed + eaten + 0.003 * o.spores * crop - killed * weed));
    cropOut.push(crop);
    weedOut.push(weed);
  }
  return { crop: cropOut, weed: weedOut };
}

export const gardenFigure = figure(['fails'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const o: Garden = { leaves: 1, spores: 1, bacteria: true };
  const paint = () => {
    const run = garden(o);
    const a = axes({ x: 40, y: 20, w: 346, h: 150, xmin: 0, xmax: DAYS, ymin: 0, ymax: 100, xticks: [0, 30, 60, 90, 120], yticks: [0, 50, 100], xlabel: 'days', ylabel: 'share of the garden chamber, %', ink: COL.ink, grid: COL.grid });
    redraw(g,
      ...a.parts,
      a.path(run.crop.map((v, i) => [i, v * 100] as [number, number]), COL.lichen, 2.4),
      a.path(run.weed.map((v, i) => [i, v * 100] as [number, number]), COL.bad, 2),
      ...legend(40, 212, [{ text: 'the ants’ fungus', color: COL.lichen }, { text: 'weed fungus', color: COL.bad }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    const crop = run.crop[DAYS];
    const weed = run.weed[DAYS];
    const failed = crop < 0.1;
    f.readout.textContent = failed
      ? `The garden has failed: the weed fungus ate the ants' fungus, peaking at ${Math.round(Math.max(...run.weed) * 100)}% of the chamber, and the colony's food is gone.${o.bacteria ? '' : ' Without the bacteria, the ants can’t weed fast enough.'}`
      : `After ${DAYS} days the ants' fungus fills ${Math.round(crop * 100)}% of the chamber${weed > 0.02 ? ` and the weed ${Math.round(weed * 100)}%` : ', with the weed kept out'}.${o.leaves < 0.5 ? ' With few leaves the garden shrinks.' : ''}`;
    if (!o.bacteria && failed) t.done();
  };
  const ls = slider('Leaves brought in', 0.2, 2, 0.1, o.leaves, (v) => `${v.toFixed(1)}×`, (v) => { o.leaves = v; paint(); }, 'plant');
  const ss = slider('Weed spores landing', 0, 5, 0.5, o.spores, (v) => `${v.toFixed(1)}×`, (v) => { o.spores = v; paint(); }, 'bad');
  const sw = toggles(['Bacteria on the ants'], [true], (on) => { o.bacteria = on[0]; paint(); });
  f.controls.append(ls.node, ss.node, sw.node);
  paint();
  return f.node;
});
