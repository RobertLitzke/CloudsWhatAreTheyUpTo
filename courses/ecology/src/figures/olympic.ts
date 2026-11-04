// Branch T3, The otters came back: sea otters spreading along the outer
// coast of Washington from where they were released, with urchins thinning
// and kelp growing where they arrive.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, legend, player, slider } from './kit';

const W = 400;

/** Stretches of coast, from Cape Flattery (0) south to Point Grenville (last). */
export const STRETCHES = 12;
/** Where otters were released in 1969 and 1970: near La Push and at Point Grenville. */
const RELEASED = [6, 11];
/** Otters a stretch can hold. */
const ROOM = 250;

/** Counts of sea otters in Washington: the release, and surveys. */
export const COUNTS: readonly [number, number][] = [
  [1970, 59],
  [1977, 19],
  [1989, 208],
  [2017, 2058],
];

export const FIRST = 1977;
export const LAST = 2022;

/**
 * Otters in each stretch, year by year from the 19 counted in 1977. Each
 * stretch grows by the logistic rule toward the otters it can hold, and a
 * share wanders to the stretches either side. A model.
 */
export function otters(years = LAST - FIRST): number[][] {
  let n: number[] = Array.from({ length: STRETCHES }, (_, i) => (i === RELEASED[0] ? 10 : i === RELEASED[1] ? 9 : 0));
  const out = [n.slice()];
  for (let y = 1; y <= years; y++) {
    n = n.map((v, i) => {
      const left = n[i - 1] ?? v;
      const right = n[i + 1] ?? v;
      return v + 0.17 * v * (1 - v / ROOM) + 0.1 * (left + right - 2 * v);
    });
    out.push(n.slice());
  }
  return out;
}

/** Urchins per square metre and kelp canopy (% of the most) in a stretch with `n` otters. */
export const urchinsFor = (n: number) => 30 / (1 + n / 25);
export const kelpFor = (n: number) => 100 / (1 + urchinsFor(n) / 6);

export const coastFigure = figure(['spread'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  const run = otters();
  let year = FIRST;
  const paint = () => {
    const i = Math.round(year) - FIRST;
    const now = run[i];
    const total = now.reduce((a, b) => a + b, 0);
    const rows = now.map((n, k) => {
      const y = 22 + k * 15;
      const kelp = kelpFor(n);
      const urchins = urchinsFor(n);
      return [
        svg('rect', { x: 86, y, width: kelp * 0.8, height: 11, fill: COL.plant, opacity: 0.8, rx: 2 }),
        ...Array.from({ length: Math.min(8, Math.round(urchins / 4)) }, (_, j) => svg('circle', { cx: 90 + j * 8, cy: y + 5.5, r: 2.4, fill: COL.rose })),
        n >= 2 ? svg('circle', { cx: 74, cy: y + 5.5, r: 1.5 + Math.sqrt(n) * 0.3, fill: COL.predator }) : null,
      ];
    }).flat();
    const a = axes({ x: 196, y: 22, w: 190, h: 150, xmin: 1970, xmax: LAST, ymin: 0, ymax: 3000, xticks: [1970, 1990, 2010], yticks: [0, 1000, 2000, 3000], yfmt: (v) => v.toLocaleString('en-US'), xlabel: 'year', ylabel: 'sea otters in Washington', ink: COL.ink, grid: COL.grid });
    redraw(g,
      svg('rect', { x: 4, y: 18, width: 60, height: STRETCHES * 15 + 2, fill: '#e2d6b8' }),
      small(34, 14, 'land', { anchor: 'middle', soft: true }),
      small(8, 22 + 8, 'C. Flattery'),
      small(8, 22 + 6 * 15 + 8, 'La Push'),
      small(8, 22 + 11 * 15 + 8, 'Pt Grenville'),
      ...rows,
      ...a.parts,
      a.path(run.slice(0, i + 1).map((n, k) => [FIRST + k, n.reduce((p, q) => p + q, 0)] as [number, number]), COL.predator, 2),
      ...a.dots(COUNTS.map((c) => [c[0], c[1]] as [number, number]), COL.data, 3.2),
      ...legend(10, 226, [{ text: 'otters', color: COL.predator, dot: true }, { text: 'urchins', color: COL.rose, dot: true }, { text: 'kelp', color: COL.plant }, { text: 'counted', color: COL.data, dot: true }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    const reached = now.filter((n) => n >= 20).length;
    f.readout.textContent = `${Math.round(year)}: about ${Math.round(total).toLocaleString('en-US')} otters, settled along ${reached} of ${STRETCHES} stretches of coast. ${reached ? 'Where they live, urchins are few and kelp grows thick; elsewhere urchins still graze it short.' : 'Too few yet to change anything.'}`;
    if (year >= 2015) t.done();
  };
  const ys = slider('Year', FIRST, LAST, 1, FIRST, (v) => String(v), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 10 });
  f.controls.append(play.node, ys.node);
  paint();
  return f.node;
});
