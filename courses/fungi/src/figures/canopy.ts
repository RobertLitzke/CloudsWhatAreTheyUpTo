// Branch L3, Gardens in the canopy: how the nitrogen-fixing lettuce lichen
// builds up in a Douglas-fir forest as it ages, with and without old trees
// left standing when the forest was cut.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, slider, toggles } from './kit';

const W = 400;
const AGES = 500;

/** Tonnes of nitrogen-fixing lichen per hectare in the canopy of a forest `age` years old. A model. */
export function lichenMass(age: number, kept: boolean): number {
  const mid = kept ? 90 : 170;
  return 1.6 / (1 + Math.exp(-(age - mid) / 28));
}

/** Kilograms of nitrogen added per hectare per year by that lichen. */
export const nitrogenAdded = (tonnes: number) => 2.5 * tonnes;

export const canopyFigure = figure(['old'], (_ctx, t) => {
  const f = frame(W, 210, 3);
  const g = svg('g');
  f.svg.append(g);
  let age = 40;
  let kept = false;
  let sawOld = false;
  let sawKept = false;
  const paint = () => {
    const m = lichenMass(age, kept);
    const n = nitrogenAdded(m);
    // A stand of trees at this age.
    const h = 30 + 120 * (1 - Math.exp(-age / 120));
    const parts: SVGElement[] = [svg('rect', { x: 10, y: 186, width: 170, height: 10, fill: COL.soil, opacity: 0.6 })];
    const trees = kept ? [[40, true], [95, false], [150, true]] as const : [[40, false], [95, false], [150, false]] as const;
    for (const [x, old] of trees) {
      const th = old ? Math.max(h, 150) : h;
      parts.push(line(x, 186, x, 186 - th, '#6b4a2e', old ? 5 : 3), svg('path', { d: `M${x},${186 - th - 6} L${x - 16},${186 - th * 0.45} L${x + 16},${186 - th * 0.45} Z`, fill: '#2f5d3f' }));
      // Lichen clumps in the crown, by mass.
      const clumps = Math.round((old ? 1.6 : m) * 6);
      for (let k = 0; k < clumps; k++) parts.push(svg('ellipse', { cx: x + (k % 2 ? 8 : -8), cy: 186 - th * (0.55 + 0.06 * (k % 6)), rx: 4, ry: 2.6, fill: '#9cc28a' }));
    }
    parts.push(small(95, 206, `a forest ${age} years old`, { anchor: 'middle', bold: true }));
    const ax = axes({ x: 226, y: 24, w: 158, h: 120, xmin: 0, xmax: AGES, ymin: 0, ymax: 1.8, xticks: [0, 250, 500], yticks: [0, 1], xlabel: 'forest age, years', ylabel: 'lettuce lichen, tonnes per hectare', ink: COL.ink, grid: COL.grid });
    const curve = Array.from({ length: 101 }, (_, i) => [i * 5, lichenMass(i * 5, kept)] as [number, number]);
    parts.push(...ax.parts, ax.path(curve, '#6f9f5a', 2.2), ...ax.dots([[age, m]], COL.cap, 4.5), small(226, 186, `Nitrogen added: about ${n.toFixed(1)} kg`, { bold: true }), small(226, 200, 'per hectare each year', {}));
    redraw(g, ...parts);
    if (!open()) return;
    if (!kept && age >= 250) sawOld = true;
    if (kept && age <= 120) sawKept = true;
    f.readout.textContent = m < 0.2
      ? 'A young plantation: the trees grow fast, but almost no lettuce lichen lives in them yet.'
      : m > 1.2
        ? 'An old forest: lichens drape the upper branches, a tonne or more on every hectare, adding nitrogen as they fall and rot.'
        : kept
          ? 'With a few old trees left standing, the lichen spreads from them into the young trees far sooner.'
          : 'The lichen is arriving, slowly. Its pieces travel only a short way, and it needs the steady damp of an older canopy.';
    if (sawOld && sawKept) t.done();
  };
  const as = slider('Forest age', 0, AGES, 5, age, (v) => `${v} years`, (v) => { age = v; paint(); }, 'leaf');
  const kt = toggles(['Old trees left standing when cut'], [false], (v) => { kept = v[0]; paint(); });
  f.controls.append(kt.node, as.node);
  const open = guessFirst(t, f, {
    ask: 'A Douglas-fir forest is clear-cut and replanted. Roughly how old will it be before lettuce lichens are common in it again?',
    options: ['Well over a century', 'About ten years', 'About thirty years'],
    answer: 0,
    sliders: [as],
    buttons: kt.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
