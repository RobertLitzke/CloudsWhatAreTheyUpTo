// Lesson 14, How big is one fungus?: the pairing test in a dish (a still), and
// a map of samples from a forest, grouped into individuals by how many genetic
// markers are compared.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider, wrapped } from './kit';

const W = 400;

// ---- The pairing test (still) ------------------------------------------------------------------------

export const pairingStill = () => {
  const s = still(W, 170);
  const parts: SVGElement[] = [];
  const dish = (cx: number, same: boolean) => {
    parts.push(svg('circle', { cx, cy: 86, r: 62, fill: '#f4eedb', stroke: '#b9b2a2', 'stroke-width': 2 }));
    const colA = '#e9dcc0';
    const colB = same ? colA : '#ddd0b4';
    parts.push(svg('circle', { cx: cx - 26, cy: 86, r: 30, fill: colA, stroke: COL.hypha, 'stroke-width': 1 }));
    parts.push(svg('circle', { cx: cx + 26, cy: 86, r: 30, fill: colB, stroke: COL.hypha, 'stroke-width': 1 }));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      parts.push(line(cx - 26, 86, cx - 26 + 28 * Math.cos(a), 86 + 28 * Math.sin(a), COL.hypha, 0.8));
      parts.push(line(cx + 26, 86, cx + 26 + 28 * Math.cos(a), 86 + 28 * Math.sin(a), COL.hypha, 0.8));
    }
    if (same) {
      parts.push(svg('ellipse', { cx, cy: 86, rx: 10, ry: 20, fill: colA }));
    } else {
      parts.push(line(cx, 60, cx, 112, '#5b3d22', 4));
    }
  };
  dish(100, true);
  dish(300, false);
  parts.push(
    label(100, 14, 'Same individual', { anchor: 'middle', bold: true }),
    label(300, 14, 'Different individuals', { anchor: 'middle', bold: true }),
    small(100, 164, 'the threads meet and fuse', { anchor: 'middle', soft: true }),
    small(300, 164, 'a dark line where they meet', { anchor: 'middle', soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- The forest map -----------------------------------------------------------------------------------

/** Five individuals and their versions at eight genetic markers. A is the giant. */
export const GENOTYPES: Record<string, readonly number[]> = {
  A: [1, 1, 1, 1, 1, 1, 1, 1],
  B: [1, 2, 1, 1, 2, 1, 1, 2],
  C: [1, 1, 2, 1, 1, 1, 2, 1],
  D: [2, 1, 1, 1, 1, 2, 1, 1],
  E: [1, 1, 1, 2, 1, 1, 1, 1],
};

/** Where each individual is: which one, if any, a sample at grid cell (i, j) of a 10 by 8 grid finds. */
export function owner(i: number, j: number): string | null {
  const dx = (i - 4.6) / 3.6;
  const dy = (j - 3.8) / 2.6;
  if (dx * dx + dy * dy < 1) return 'A';
  if (i <= 1 && j <= 2) return 'B';
  if (i >= 8 && j <= 1) return 'C';
  if (i >= 8 && j >= 6) return 'D';
  if (i <= 1 && j >= 6) return 'E';
  return null;
}

export interface Sample { i: number; j: number; who: string }

export const SAMPLES: readonly Sample[] = (() => {
  const out: Sample[] = [];
  for (let j = 0; j < 8; j++) for (let i = 0; i < 10; i++) {
    const who = owner(i, j);
    if (who && (i * 7 + j * 3) % 5 !== 0) out.push({ i, j, who });
  }
  return out;
})();

/** Group the samples by identical genotype over the first `n` markers; returns a group key per sample. */
export function groups(n: number): string[] {
  return SAMPLES.map((s) => GENOTYPES[s.who].slice(0, n).join(''));
}

const PALETTE = ['#a8643a', '#3f9a9a', '#7a4e8a', '#c98a2e', '#5f8f4a'];

export const mapFigure = figure(['markers'], (_ctx, t) => {
  const f = frame(W, 196, 3);
  const g = svg('g');
  f.svg.append(g);
  let n = 1;
  let sawOne = false;
  const cell = 21;
  const x0 = 16;
  const y0 = 22;
  const paint = () => {
    const keys = groups(n);
    const order = [...new Set(keys)].sort((a, b) => keys.filter((k) => k === b).length - keys.filter((k) => k === a).length);
    const colour = (k: string) => PALETTE[order.indexOf(k) % PALETTE.length];
    const giant = keys.filter((k) => k === order[0]).length;
    const truth = SAMPLES.filter((s) => s.who === 'A').length;
    const parts: SVGElement[] = [
      svg('rect', { x: x0 - 6, y: y0 - 6, width: cell * 10 + 2, height: cell * 8 + 2, fill: '#e8e1cc', rx: 4 }),
    ];
    SAMPLES.forEach((s, k) => parts.push(svg('circle', { cx: x0 + s.i * cell + 4, cy: y0 + s.j * cell + 4, r: 6.5, fill: colour(keys[k]) })));
    parts.push(
      line(x0, 190, x0 + cell * 5, 190, COL.ink, 1.5),
      small(x0 + cell * 2.5, 186, '300 m', { anchor: 'middle' }),
      label(250, 30, `Markers compared: ${n}`, { bold: true }),
      label(250, 54, `Individuals seen: ${order.length}`, { bold: true }),
      small(250, 76, `Largest: ${giant} samples`),
      ...wrapped(250, 100, 'Each dot is a sample of fungus from a root or stump. Dots of one colour match at every marker compared.', 26, { soft: true }, 11),
    );
    redraw(g, ...parts);
    if (!open()) return;
    if (n >= 5) sawOne = true;
    f.readout.textContent = n === 1
      ? `Compared at one marker, ${giant} samples look alike. But many unrelated fungi share a version of any one gene, so this proves little.`
      : giant > truth
        ? `With ${n} markers some neighbours split off, but the largest group still holds samples from more than one fungus. Compare more.`
        : `With ${n} markers every neighbour has split off, and ${giant} samples still match at every one: a single fungus spread across the middle of the forest.`;
    if (sawOne) t.done();
  };
  const ms = slider('Markers compared', 1, 8, 1, n, (v) => `${v}`, (v) => { n = v; paint(); }, 'hypha');
  f.controls.append(ms.node);
  const open = guessFirst(t, f, {
    ask: 'Fungus samples from all over a forest have the same version of one gene. Are they one individual?',
    options: ['Not necessarily', 'Yes, certainly'],
    answer: 0,
    sliders: [ms],
    after: () => paint(),
  });
  paint();
  return f.node;
});
