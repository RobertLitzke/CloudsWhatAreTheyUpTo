// Lesson C3, Wheat on the Palouse: wheat every year against wheat after a
// year of bare fallow, across the rainfall of eastern Washington.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, slider } from './kit';

const W = 400;

/** Share of a year's rain still in the soil for a crop sown that autumn. */
const KEEP = 0.6;
/** Share of a fallow year's rain carried over to the next year's crop. */
const CARRY = 0.3;
/** Water (cm) a crop uses before it makes any grain, and grain (t/ha) per cm after that. */
const START = 10;
const PER_CM = 0.2;

/** Grain (tonnes per hectare) from one crop that has `water` cm to use. */
export const grain = (water: number) => Math.max(0, PER_CM * (water - START));

/** Grain over two years from `rain` cm a year: wheat both years, or a bare fallow year then wheat. */
export function twoYears(rain: number): { annual: number; fallow: number } {
  return { annual: 2 * grain(KEEP * rain), fallow: grain((KEEP + CARRY) * rain) };
}

/** The rainfall (cm a year) where the two ways give the same grain. */
export const crossover = START / (2 * KEEP - (KEEP + CARRY));

export const PLACES = [
  { name: 'Ritzville', rain: 29 },
  { name: 'Pullman', rain: 53 },
];

export const fallowFigure = figure(['both'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let rain = 40;
  let sawDry = false;
  let sawWet = false;
  const paint = () => {
    const shown = open();
    const a = axes({ x: 46, y: 30, w: 330, h: 160, xmin: 15, xmax: 65, ymin: 0, ymax: 12, xticks: [20, 30, 40, 50, 60], yticks: [0, 4, 8, 12], xlabel: 'rain, cm a year', ylabel: 'grain over two years, t/ha', ink: COL.ink, grid: COL.grid });
    const xs = Array.from({ length: 51 }, (_, i) => 15 + i);
    const now = twoYears(rain);
    redraw(g,
      ...a.parts,
      a.path(xs.map((r) => [r, twoYears(r).annual] as const), COL.leaf, 2.2),
      a.path(xs.map((r) => [r, twoYears(r).fallow] as const), COL.soil, 2.2, { 'stroke-dasharray': '6 3' }),
      ...PLACES.map((p) => small(a.X(p.rain), 44, p.name, { anchor: 'middle', soft: true })),
      ...PLACES.map((p) => svg('line', { x1: a.X(p.rain), y1: 48, x2: a.X(p.rain), y2: 190, stroke: COL.grid, 'stroke-width': 1 })),
      shown ? svg('line', { x1: a.X(rain), y1: 30, x2: a.X(rain), y2: 190, stroke: COL.water, 'stroke-width': 1.5 }) : null,
      shown ? svg('circle', { cx: a.X(rain), cy: a.Y(now.annual), r: 4, fill: COL.leaf }) : null,
      shown ? svg('circle', { cx: a.X(rain), cy: a.Y(now.fallow), r: 4, fill: COL.soil }) : null,
      ...legend(50, 236, [{ text: 'wheat every year', color: COL.leaf }, { text: 'fallow, then wheat', color: COL.soil }]),
      label(376, 20, 'A model.', { anchor: 'end' }),
    );
    if (!shown) return;
    if (rain < crossover - 2) sawDry = true;
    if (rain > crossover + 5) sawWet = true;
    f.readout.textContent = rain < crossover
      ? `With ${rain} cm of rain, one crop on two years' water (${now.fallow.toFixed(1)} t/ha) beats two crops that each barely clear the water they need before making grain (${now.annual.toFixed(1)} t/ha).`
      : `With ${rain} cm of rain, each year's crop has water to spare, so wheat every year (${now.annual.toFixed(1)} t/ha) beats a fallow year that loses most of a year's rain to evaporation (${now.fallow.toFixed(1)} t/ha).`;
    if (sawDry && sawWet) t.done();
  };
  const rs = slider('Rain', 15, 65, 1, rain, (v) => `${v} cm a year`, (v) => { rain = v; paint(); }, 'water');
  f.controls.append(rs.node);
  const open = guessFirst(t, f, {
    ask: 'In the driest wheat country, a farmer leaves a field bare every other year. Over two years, does that field grow more or less wheat than one cropped every year?',
    options: ['Less: it grows only one crop', 'More', 'Exactly the same'],
    answer: 1,
    reveal: 'done',
    sliders: [rs],
    after: () => paint(),
  });
  paint();
  return f.node;
});
