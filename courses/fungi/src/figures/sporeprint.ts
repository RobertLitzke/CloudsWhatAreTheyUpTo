// Branch M1, A spore print and a microscope: spore prints of four colours,
// and measuring spores to tell two lookalike mushrooms apart.

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;

/** Two lookalike species: mean spore length and spread, in micrometres. */
export const LOOKALIKES = [
  { name: 'Species A', mean: 8.2, sd: 0.8 },
  { name: 'Species B', mean: 8.7, sd: 0.8 },
] as const;

const rnd = (i: number, salt: number) => {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** The first `n` spores measured from the unknown mushroom (really species B), in micrometres. */
export function measured(n: number): number[] {
  const b = LOOKALIKES[1];
  return Array.from({ length: n }, (_, i) => {
    const u = Math.max(1e-6, rnd(i, 9));
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd(i, 109));
    return Math.round((b.mean + b.sd * z) * 10) / 10;
  });
}

/** Mean of the spores measured and the half-width of a rough 95% range for that mean. */
export function meanRange(xs: number[]): { mean: number; half: number } {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { mean, half: (2 * 0.8) / Math.sqrt(xs.length) };
}

/** Which species the measured mean points to, or null while the range still covers both. */
export function verdict(xs: number[]): number | null {
  if (!xs.length) return null;
  const { mean, half } = meanRange(xs);
  const fits = LOOKALIKES.map((s) => Math.abs(s.mean - mean) <= half);
  return fits[0] === fits[1] ? null : fits[0] ? 0 : 1;
}

export const sporeSizeFigure = figure(['measured'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let n = 1;
  const paint = () => {
    const xs = measured(n);
    const ax = axes({ x: 30, y: 20, w: 350, h: 120, xmin: 5, xmax: 13, ymin: 0, ymax: 1, xticks: [5, 7, 9, 11, 13], yticks: [], xlabel: 'spore length, micrometres', ink: COL.ink, grid: COL.grid });
    const parts: SVGElement[] = [...ax.parts];
    LOOKALIKES.forEach((s, i) => {
      const y = 30 + i * 18;
      parts.push(
        svg('rect', { x: ax.X(s.mean - 2 * s.sd), y: y - 5, width: ax.X(s.mean + 2 * s.sd) - ax.X(s.mean - 2 * s.sd), height: 10, fill: i ? COL.spore : COL.food, opacity: 0.35, rx: 3 }),
        line(ax.X(s.mean), y - 7, ax.X(s.mean), y + 7, i ? COL.spore : COL.food, 2),
        small(ax.X(s.mean - 2 * s.sd) - 4, y + 4, s.name, { anchor: 'end', fill: i ? COL.spore : COL.food, bold: true }),
      );
    });
    // Each spore as a dot, stacked where lengths repeat.
    const stack = new Map<number, number>();
    for (const x of xs) {
      const k = Math.round(x * 5) / 5;
      const h = stack.get(k) ?? 0;
      stack.set(k, h + 1);
      parts.push(svg('ellipse', { cx: ax.X(k), cy: 132 - h * 7, rx: 3.6, ry: 2.4, fill: COL.cap }));
    }
    if (xs.length) {
      const { mean, half } = meanRange(xs);
      parts.push(
        svg('rect', { x: ax.X(mean - half), y: 72, width: ax.X(mean + half) - ax.X(mean - half), height: 10, fill: COL.ink, opacity: 0.18, rx: 3 }),
        line(ax.X(mean), 68, ax.X(mean), 86, COL.ink, 2),
        small(ax.X(mean), 64, `mean ${mean.toFixed(1)}`, { anchor: 'middle', bold: true }),
      );
    }
    const v = verdict(xs);
    parts.push(small(380, 196, v === null ? `${n} spores measured: could be either` : `${n} spores measured: ${LOOKALIKES[v].name}`, { anchor: 'end', bold: true }));
    redraw(g, ...parts);
    if (!open()) return;
    f.readout.textContent = n < 4
      ? 'One spore, or a few, could belong to either species: their sizes overlap. The grey bar is how far the true mean could be from the mean measured so far.'
      : v === null
        ? 'The range for the mean is narrowing, but it still overlaps both species.'
        : `With ${n} spores the mean is pinned down closely enough to rule out species A, even though single spores of the two overlap.`;
    if (n >= 20) t.done();
  };
  const ns = slider('Spores measured', 1, 40, 1, n, (v) => `${v}`, (v) => { n = v; paint(); }, 'spore');
  f.controls.append(ns.node);
  const open = guessFirst(t, f, {
    ask: 'Two lookalike mushrooms differ slightly in spore size. How many spores should you measure to tell which one you have?',
    options: ['Twenty or more', 'One good one', 'Every spore on the slide'],
    answer: 0,
    sliders: [ns],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Spore prints (still) ----------------------------------------------------------------

export const printsStill = () => {
  const s = still(W, 206);
  const parts: SVGElement[] = [
    svg('rect', { x: 10, y: 10, width: 190, height: 172, fill: '#fbf8f1', stroke: '#c9c1b2' }),
    svg('rect', { x: 200, y: 10, width: 190, height: 172, fill: '#1f1b19' }),
  ];
  const prints = [
    { x: 105, y: 48, colour: '#e9d9e0', gills: true, text: 'pink', paper: 0 },
    { x: 105, y: 124, colour: '#8a5a2b', gills: true, text: 'rusty brown', paper: 0 },
    { x: 295, y: 48, colour: '#f3efe6', gills: true, text: 'white, seen on black', paper: 1 },
    { x: 295, y: 124, colour: '#6b6a3a', gills: false, text: 'olive brown, from pores', paper: 1 },
  ];
  for (const p of prints) {
    const r = 26;
    if (p.gills) {
      for (let k = 0; k < 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        const r0 = k % 2 ? r * 0.55 : r * 0.25;
        parts.push(line(p.x + r0 * Math.cos(a), p.y + r0 * Math.sin(a), p.x + r * Math.cos(a), p.y + r * Math.sin(a), p.colour, 2.2));
      }
    } else {
      for (let k = 0; k < 140; k++) {
        const rr = r * Math.sqrt((k + 0.5) / 140);
        const a = k * 2.39996;
        parts.push(svg('circle', { cx: p.x + rr * Math.cos(a), cy: p.y + rr * Math.sin(a), r: 1.6, fill: p.colour }));
      }
    }
    parts.push(svg('circle', { cx: p.x, cy: p.y, r: 4, fill: p.paper ? '#1f1b19' : '#fbf8f1' }));
    parts.push(small(p.x, p.y + r + 12, p.text, { anchor: 'middle', fill: p.paper ? '#f1e9dc' : COL.ink }));
  }
  parts.push(small(105, 198, 'white paper', { anchor: 'middle', fill: COL.soft }), small(295, 198, 'black paper', { anchor: 'middle', fill: COL.soft }));
  s.svg.append(...parts);
  return { node: s.node };
};
