// Lesson C4, Every Red Delicious is one tree: lining up the cambium of a graft
// (cross-section), and a hundred trees grown from one apple's seeds against a
// hundred grafted ones.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { button, COL, figure, frame, guessFirst, slider, toggles } from './kit';

const W = 400;

// ---- Lining up a graft -------------------------------------------------------------------------------

export const ROOT_R = 26;
export const SCION_R = 13;

/** Share of the scion's cambium that lies against the rootstock's, with the scion's centre `off` (mm) from the rootstock's. */
export function contact(off: number, tol = 1.2): number {
  let n = 0;
  for (let k = 0; k < 360; k++) {
    const a = (k * Math.PI) / 180;
    const x = off + Math.cos(a) * SCION_R;
    const y = Math.sin(a) * SCION_R;
    if (Math.abs(Math.hypot(x, y) - ROOT_R) <= tol) n++;
  }
  return n / 360;
}

export const takes = (off: number) => contact(off) >= 0.05;

export const graftFigure = figure(['take'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let off = 0;
  const paint = () => {
    const shown = open();
    const cx = 120;
    const cy = 100;
    const k = 2.8;
    const c = contact(off);
    const ok = takes(off);
    const ring = (x: number, r: number, wood: string) => [
      svg('circle', { cx: x, cy, r: (r + 3) * k, fill: '#8a6a4a' }),
      svg('circle', { cx: x, cy, r: r * k, fill: COL.leaf, opacity: 0.85 }),
      svg('circle', { cx: x, cy, r: (r - 0.8) * k, fill: wood }),
    ];
    redraw(g,
      ...ring(cx, ROOT_R, '#e8d6a8'),
      svg('g', { opacity: 0.88 }, ...ring(cx + off * k, SCION_R, '#f2e4bc')),
      ok && shown ? svg('circle', { cx: cx + (off + SCION_R) * k, cy, r: 9, fill: 'none', stroke: COL.good, 'stroke-width': 3 }) : null,
      label(250, 40, 'Cut ends, from above', { bold: true }),
      small(250, 60, 'Big: the rootstock', { soft: true }),
      small(250, 76, 'Small: the scion, from the', { soft: true }),
      small(250, 90, 'tree to be copied', { soft: true }),
      small(250, 112, 'Green ring: cambium', { fill: COL.leaf, bold: true }),
      small(250, 140, `Cambium touching: ${Math.round(c * 100)}%`, { fill: ok ? COL.good : COL.bad, bold: true }),
      line(cx - (ROOT_R + 3) * k, 210, cx + (ROOT_R + 3) * k, 210, COL.soft, 0.6),
      small(cx, 206, 'about 2 cm across', { anchor: 'middle', soft: true }),
    );
    if (!shown) return;
    f.readout.textContent = ok
      ? 'The scion’s cambium meets the rootstock’s along one side. Cambium is the only layer still dividing (lesson 16), so there the two grow new cells into each other, join up their xylem and phloem, and the graft takes.'
      : 'The scion’s cambium is sitting on the rootstock’s dead wood or bark, where nothing grows. The cut will callus over but never join, and the scion will die.';
    if (ok) t.done();
  };
  const os = slider('Move the scion', 0, 16, 0.5, off, (v) => `${v} mm from centre`, (v) => { off = v; paint(); }, 'leaf');
  f.controls.append(os.node);
  const open = guessFirst(t, f, {
    ask: 'A grafter joins a thin twig, the scion, onto a thicker rootstock. Where on the cut should the scion go?',
    options: ['In the middle, wood on wood', 'At one side, bark edge to bark edge', 'Anywhere, if tied tight'],
    answer: 1,
    reveal: 'done',
    sliders: [os],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Seeds or grafts ---------------------------------------------------------------------------------

/** The parent apple's score for size and taste, out of 10. */
export const PARENT = 8;

/** Scores of `n` trees grown from one apple's seeds: each a new mix of two parents' genes, most of them worse. */
export function seedlings(n: number, seed: number): number[] {
  const rng = makeRng(seed);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  return Array.from({ length: n }, () => Math.min(10, Math.max(0, 4.5 + 1.6 * normal())));
}

export const seedFigure = figure(['graft'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let seed = 1;
  let grafted = false;
  const paint = () => {
    const shown = open();
    const trees = grafted && shown ? new Array(100).fill(PARENT) : seedlings(100, seed);
    const bins = new Array(11).fill(0);
    for (const s of trees) bins[Math.round(s)]++;
    const good = trees.filter((s) => s >= PARENT - 0.5).length;
    const peak = Math.max(...bins);
    const X = (i: number) => 40 + i * 32;
    redraw(g,
      ...bins.map((b, i) => svg('rect', { x: X(i) - 12, y: 170 - (b / peak) * 120, width: 24, height: (b / peak) * 120, fill: i >= PARENT ? COL.red : COL.leaf, opacity: 0.8 })),
      ...bins.map((b, i) => (b ? small(X(i), 164 - (b / peak) * 120, `${b}`, { anchor: 'middle', soft: true }) : null)).filter((x): x is SVGElement => !!x),
      line(30, 170, 380, 170, COL.ink, 1),
      ...[0, 2, 4, 6, 8, 10].map((i) => small(X(i), 186, `${i}`, { anchor: 'middle', soft: true })),
      small(380, 202, 'apple size and taste, out of 10', { anchor: 'end' }),
      small(X(PARENT), 40, 'the parent', { anchor: 'middle', fill: COL.red, bold: true }),
      label(14, 22, grafted && shown ? '100 grafted trees' : '100 trees from seed', { bold: true }),
      small(14, 214, 'A model.', { soft: true }),
    );
    if (!shown) return;
    f.readout.textContent = grafted
      ? 'Grafted, every tree carries the parent’s own genes, so every tree gives the same apple. All the Red Delicious trees in the world are copies of one tree like this.'
      : `${good} of 100 trees from seed give an apple as good as the parent; most give small, sour fruit fit for cider. Each seed is a new mix of the parent’s genes and an unknown pollen parent’s.`;
    if (grafted) t.done();
  };
  const sw = toggles(['Graft instead'], [false], (on) => { grafted = on[0]; paint(); });
  const again = button('Another 100 seeds', () => { seed += 1; paint(); });
  f.controls.append(sw.node, again);
  const open = guessFirst(t, f, {
    ask: 'You plant a hundred seeds from a good apple and wait ten years for them to fruit. How many trees give an apple as good as the one you started with?',
    options: ['Most of them', 'About half', 'Hardly any'],
    answer: 2,
    reveal: 'done',
    sliders: [],
    buttons: [...sw.buttons, again],
    after: () => paint(),
  });
  paint();
  return f.node;
});
