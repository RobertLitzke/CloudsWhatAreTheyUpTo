// Branch S3, The prairie under the wheat: prairie remnants of different sizes
// against the species-area rule, losing the kinds they can't keep as the
// years since ploughing pass.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, legend, slider } from './kit';

const W = 400;

/** Native plant kinds in a large stretch of unbroken Palouse prairie (an illustration). */
export const KINDS = 200;
/** Area that holds them all, ha. */
const FULL = 10000;

/** Kinds a patch of `ha` held while it was part of the unbroken prairie: a shallow curve, since neighbours kept topping it up. */
export const before = (ha: number) => KINDS * Math.min(1, (ha / FULL) ** 0.15);
/** Kinds it can keep once it is an island in wheat: a steep curve, as for true islands. */
export const after = (ha: number) => KINDS * Math.min(1, (ha / FULL) ** 0.3);
/** Years to lose about two-thirds of what it will lose: longer for bigger patches. */
export const lag = (ha: number) => 10 + 15 * Math.log10(1 + ha);
/** Kinds left `years` after the land around it was ploughed. */
export const now = (ha: number, years: number) => after(ha) + (before(ha) - after(ha)) * Math.exp(-years / lag(ha));

/** Kinds of remnant, by size, ha. Illustrative, not measured sites. */
export const REMNANTS: readonly [string, number][] = [
  ['roadside strip', 0.1],
  ['cemetery corner', 1],
  ['rocky knob', 10],
  ['butte top', 100],
  ['preserve', 1000],
];

export const palouseFigure = figure(['debt'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let years = 0;
  const paint = () => {
    const a = axes({ x: 44, y: 18, w: 340, h: 150, xmin: -2, xmax: 4, ymin: 2, ymax: 250, ylog: true, xticks: [-2, -1, 0, 1, 2, 3, 4], yticks: [10, 100], xfmt: (v) => String(10 ** v), xlabel: 'size of the remnant, hectares (each step ten times the last)', ylabel: 'native plant kinds', ink: COL.ink, grid: COL.grid });
    const curve = (fn: (ha: number) => number) => Array.from({ length: 61 }, (_, i) => [-2 + i / 10, fn(10 ** (-2 + i / 10))] as [number, number]);
    redraw(g,
      ...a.parts,
      a.path(curve(before), COL.grid, 1.4, { 'stroke-dasharray': '4 3' }),
      a.path(curve(after), COL.model, 2),
      ...REMNANTS.map(([name, ha]): SVGElement[] => [
        svg('circle', { cx: a.X(Math.log10(ha)), cy: a.Y(now(ha, years)), r: 4.5, fill: COL.plant, stroke: '#fff', 'stroke-width': 1 }),
        small(a.X(Math.log10(ha)) + 6, a.Y(now(ha, years)) + 14, name, { soft: true }),
      ]).flat(),
      ...legend(44, 212, [{ text: 'held in unbroken prairie', color: COL.grid, dash: true }, { text: 'can keep as an island', color: COL.model }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    const owed = REMNANTS.reduce((s, [, ha]) => s + now(ha, years) - after(ha), 0);
    f.readout.textContent = years < 1
      ? 'Just ploughed: each remnant still holds the kinds it had as part of the prairie. Move the years on.'
      : `${years} years after ploughing: the small remnants have lost most of what they will lose; the big ones are still losing. Across the five, about ${Math.round(owed)} more losses are still to come.`;
    if (years >= 100) t.done();
  };
  const ys = slider('Years since the land around was ploughed', 0, 150, 5, 0, (v) => String(v), (v) => { years = v; paint(); }, 'soil');
  f.controls.append(ys.node);
  paint();
  return f.node;
});
