// Branch M3, How many kinds of fungi? An estimate from the ratio of fungi to
// plants, set against the kinds already named, and how long naming the rest
// would take at today's pace.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { big, COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;

/** Kinds of fungi named so far, roughly. */
export const NAMED = 155_000;
/** Kinds of vascular plants known, roughly. */
export const PLANTS = 380_000;
/** The range of the 2017 estimate by Hawksworth and Lücking. */
export const RANGE: readonly [number, number] = [2_200_000, 3_800_000];

export const estimate = (perPlant: number) => perPlant * PLANTS;

/** Years to name the rest at `perYear` new kinds a year. */
export const yearsLeft = (total: number, perYear: number) => Math.max(0, (total - NAMED) / perYear);

export const howManyFigure = figure(['estimate'], (_ctx, t) => {
  const f = frame(W, 190, 3);
  const g = svg('g');
  f.svg.append(g);
  let ratio = 6;
  let rate = 2500;
  const MAX = 5_000_000;
  const X = (n: number) => 30 + (Math.min(n, MAX) / MAX) * 330;
  const paint = () => {
    const est = estimate(ratio);
    const yrs = yearsLeft(est, rate);
    const parts: SVGElement[] = [
      svg('rect', { x: X(RANGE[0]), y: 24, width: X(RANGE[1]) - X(RANGE[0]), height: 92, fill: COL.spore, opacity: 0.12 }),
      small((X(RANGE[0]) + X(RANGE[1])) / 2, 20, 'the 2017 estimate', { anchor: 'middle', fill: COL.spore, bold: true }),
      svg('rect', { x: 30, y: 40, width: X(NAMED) - 30, height: 22, fill: COL.cap }),
      small(X(NAMED) + 6, 56, `named: about ${big(NAMED)}`, { bold: true }),
      svg('rect', { x: 30, y: 80, width: X(est) - 30, height: 22, fill: COL.hypha }),
      small(est > 3_400_000 ? X(est) - 6 : X(est) + 6, 96, `estimated: ${big(est)}`, { anchor: est > 3_400_000 ? 'end' : undefined, bold: true }),
      ...[0, 1, 2, 3, 4, 5].map((m) => small(X(m * 1_000_000), 132, m ? `${m} million` : '0', { anchor: 'middle', fill: COL.soft })),
      svg('line', { x1: 30, y1: 120, x2: 360, y2: 120, stroke: COL.ink }),
      small(30, 160, `Named so far: ${Math.round((NAMED / est) * 100)}% of the estimate.`, { bold: true }),
      small(30, 178, `At ${big(rate)} new kinds a year, the rest would take about ${big(Math.round(yrs / 10) * 10)} years.`, {}),
    ];
    redraw(g, ...parts);
    if (!open()) return;
    f.readout.textContent = ratio <= 2
      ? 'Even at two fungi for every plant, most fungi would still be unnamed.'
      : ratio >= 9
        ? `Some estimates from soil DNA point to ratios this high, giving ${big(Math.round(est / 100000) * 100000)} kinds or more.`
        : 'Britain has about six kinds of fungi for every kind of plant. Applied to the world, that gives over two million, nearly all still without a name.';
    if (rate >= 6000) t.done();
  };
  const rs = slider('Kinds of fungi for each kind of plant', 1, 12, 0.5, ratio, (v) => `${v}`, (v) => { ratio = v; paint(); }, 'hypha');
  const ps = slider('New kinds named each year', 1000, 10000, 500, rate, (v) => big(v), (v) => { rate = v; paint(); }, 'cap');
  f.controls.append(rs.node, ps.node);
  const open = guessFirst(t, f, {
    ask: 'About how many kinds of fungi have scientists named and described so far?',
    options: ['About 150,000', 'About 15,000', 'About 3 million'],
    answer: 0,
    sliders: [rs, ps],
    after: () => paint(),
  });
  paint();
  return f.node;
});
