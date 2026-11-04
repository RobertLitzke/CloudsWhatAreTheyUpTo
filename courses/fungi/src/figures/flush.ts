// Branch N1, The autumn flush: a Northwest autumn day by day, soil water and
// temperature, and the mushrooms that come up once the soil is soaked and
// stop with a hard frost.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, slider, toggles } from './kit';

const W = 400;
/** Day 0 is 1 September; the run ends on 31 December. */
const DAYS = 122;
const MONTHS = [[0, 'Sep'], [30, 'Oct'], [61, 'Nov'], [91, 'Dec']] as const;

export interface Autumn { soil: number[]; temp: number[]; mushrooms: number[]; frost: number | null }

/**
 * A model autumn. Soil water (0 to 1) starts dry after the summer, jumps with
 * each rain from `firstRain` on (a rain every few days after that), and dries
 * slowly between. Mushrooms appear ten days after the soil has stayed wet,
 * while it is between 3 and 16 °C, and none after a hard frost.
 */
export function autumn(firstRain: number, earlyFrost: boolean): Autumn {
  const soil: number[] = [];
  const temp: number[] = [];
  const mushrooms: number[] = [];
  let w = 0.15;
  let wetDays = 0;
  const frost = earlyFrost ? 62 : 100;
  for (let d = 0; d < DAYS; d++) {
    const rain = d === firstRain ? 0.6 : d > firstRain && (d - firstRain) % 4 === 0 ? 0.25 : 0;
    w = Math.min(1, w * 0.97 + rain);
    soil.push(w);
    const tc = 17 - 0.14 * d - (d >= frost ? 4 : 0);
    temp.push(tc);
    wetDays = w > 0.45 ? wetDays + 1 : 0;
    const ok = wetDays >= 10 && tc > 3 && tc < 16 && d < frost;
    const prev = mushrooms[d - 1] ?? 0;
    mushrooms.push(ok ? Math.min(1, prev + 0.12) : Math.max(0, prev - 0.25));
  }
  return { soil, temp, mushrooms, frost };
}

export const flushFigure = figure(['season'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let first = 40;
  let frostEarly = false;
  let sawLate = false;
  let sawEarly = false;
  const paint = () => {
    const a = autumn(first, frostEarly);
    const ax = axes({ x: 40, y: 22, w: 344, h: 140, xmin: 0, xmax: DAYS, ymin: 0, ymax: 1.25, xticks: MONTHS.map((m) => m[0]), xfmt: (v) => MONTHS.find((m) => m[0] === v)?.[1] ?? '', yticks: [], ink: COL.ink, grid: COL.grid });
    const tScale = (c: number) => Math.max(0, Math.min(1, (c + 4) / 24));
    const season = a.mushrooms.filter((m) => m > 0.05).length;
    const parts: SVGElement[] = [...ax.parts];
    a.mushrooms.forEach((m, d) => { if (m > 0.02) parts.push(svg('rect', { x: ax.X(d), y: ax.Y(m * 0.9), width: ax.X(1) - ax.X(0) + 0.3, height: ax.Y(0) - ax.Y(m * 0.9), fill: COL.cap, opacity: 0.85 })); });
    parts.push(
      ax.path(a.soil.map((v, d) => [d, v]), COL.water, 2),
      ax.path(a.temp.map((c, d) => [d, tScale(c)]), COL.toxin, 1.8, { 'stroke-dasharray': '4 3' }),
      line(ax.X(first), 18, ax.X(first), 162, COL.water, 1, { 'stroke-dasharray': '2 3' }),
      small(ax.X(first) + 3, 16, 'first soaking rain', { fill: COL.water, bold: true }),
      ...(a.frost !== null && a.frost < DAYS ? [small(ax.X(a.frost) - 3, 16, 'hard frost', { anchor: 'end', fill: COL.toxin, bold: true }), line(ax.X(a.frost), 18, ax.X(a.frost), 162, COL.toxin, 1, { 'stroke-dasharray': '2 3' })] : []),
      ...legend(40, 200, [
        { text: 'soil water', color: COL.water },
        { text: 'temperature', color: COL.toxin, dash: true },
        { text: 'mushrooms', color: COL.cap },
      ]),
      small(384, 214, `${season} days with mushrooms`, { anchor: 'end', bold: true }),
    );
    redraw(g, ...parts);
    if (!open()) return;
    if (first >= 60) sawLate = true;
    if (frostEarly) sawEarly = true;
    f.readout.textContent = season === 0
      ? 'No mushrooms at all: by the time the soil was wet for long enough, it was too cold.'
      : first >= 55
        ? `A late first rain: the mycelium waits, and by the time the soil is soaked, frost is near. Only ${season} days of mushrooms.`
        : frostEarly
          ? `An early hard frost ends the season in a night, whatever the soil water. ${season} days of mushrooms.`
          : `About ten days after the soil is soaked, the mushrooms come up, and they keep coming until it turns cold: ${season} days.`;
    if (sawLate && sawEarly) t.done();
  };
  const fr = slider('First soaking rain', 5, 90, 1, first, (v) => { const m = [...MONTHS].reverse().find((x) => v >= x[0])!; return `${v - m[0] + 1} ${m[1]}`; }, (v) => { first = v; paint(); }, 'water');
  const fz = toggles(['Early hard frost'], [false], (v) => { frostEarly = v[0]; paint(); });
  f.controls.append(fz.node, fr.node);
  const open = guessFirst(t, f, {
    ask: 'After a dry Northwest summer, the first big autumn rain soaks the forest. When do the mushrooms come up?',
    options: ['About a week or two later', 'The next morning', 'Not until spring'],
    answer: 0,
    sliders: [fr],
    buttons: fz.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
