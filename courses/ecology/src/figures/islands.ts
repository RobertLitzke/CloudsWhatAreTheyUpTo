// Lesson 18, Islands that refilled: arrivals against losses on an island
// (MacArthur and Wilson), with species blinking in and out, and Darlington's
// species-area rule on the islands of the West Indies.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, COL, figure, frame, guessFirst, legend, player, slider } from './kit';

const W = 400;

/** Kinds of insect on the mainland that could reach an island. */
export const POOL = 50;

/** Chance per year that each absent kind arrives, falling with distance (km). */
export const arrival = (km: number) => 0.6 * Math.exp(-km / 0.4);
/** Chance per year that each present kind dies out, falling with size (relative). */
export const loss = (size: number) => 0.25 / size;

/** The balance MacArthur and Wilson predicted: where arrivals equal losses. */
export const balance = (km: number, size: number) => (POOL * arrival(km)) / (arrival(km) + loss(size));

/** Species on an island, year by year, starting from an island emptied in year 0. Seeded, so the same each time. */
export function refill(km: number, size: number, years = 40): { count: number[]; present: boolean[][] } {
  const rng = makeRng(1966);
  let on = Array.from({ length: POOL }, () => false);
  const count = [0];
  const present = [on.slice()];
  // Four steps a year.
  for (let s = 1; s <= years * 4; s++) {
    on = on.map((v) => (v ? rng() > loss(size) / 4 : rng() < arrival(km) / 4));
    if (s % 4 === 0) {
      count.push(on.filter(Boolean).length);
      present.push(on.slice());
    }
  }
  return { count, present };
}

export const islandFigure = figure(['farther'], (ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let km = 0.1;
  let size = 1;
  let year = 0;
  const paint = () => {
    const run = refill(km, size);
    const y = Math.round(year);
    const now = run.present[y];
    // The island: a dot per kind present, in a fixed grid so a kind keeps its place.
    const r = 30 + 18 * Math.sqrt(size);
    const dots = now.map((on, i) => {
      const a = (i / POOL) * Math.PI * 2 * 3;
      const d = (0.25 + 0.7 * ((i * 7) % POOL) / POOL) * (r - 6);
      return on ? svg('circle', { cx: 70 + Math.cos(a) * d, cy: 96 + Math.sin(a) * d * 0.7, r: 2.6, fill: COL.prey }) : null;
    });
    const a = axes({ x: 186, y: 20, w: 200, h: 150, xmin: 0, xmax: 40, ymin: 0, ymax: POOL, xticks: [0, 10, 20, 30, 40], yticks: [0, 25, 50], xlabel: 'years after the island was emptied', ylabel: 'kinds on the island', ink: COL.ink, grid: COL.grid });
    const eq = balance(km, size);
    // Turnover: kinds present now that were absent ten years ago.
    const before = run.present[Math.max(0, y - 10)];
    const newcomers = y >= 20 ? now.filter((v, i) => v && !before[i]).length : 0;
    redraw(g,
      svg('rect', { x: 0, y: 190, width: 180, height: 18, fill: COL.plant, opacity: 0.5 }),
      small(90, 203, 'mainland', { anchor: 'middle' }),
      svg('rect', { x: 0, y: 10, width: 180, height: 180, fill: COL.water, opacity: 0.18 }),
      svg('ellipse', { cx: 70, cy: 96, rx: r, ry: r * 0.7, fill: '#d9e8c4', stroke: COL.plant, 'stroke-width': 1.2 }),
      ...dots,
      line(70, 96 + r * 0.7, 70, 190, COL.soft, 1, { 'stroke-dasharray': '3 3' }),
      small(76, 96 + r * 0.7 + 14, `${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'} offshore`, { soft: true }),
      ...a.parts,
      line(a.X(0), a.Y(eq), a.X(40), a.Y(eq), COL.model, 1.4, { 'stroke-dasharray': '5 3' }),
      a.path(run.count.slice(0, y + 1).map((c, i) => [i, c]), COL.prey, 2.2),
      ...legend(186, 244, [{ text: 'kinds present', color: COL.prey }, { text: 'arrivals = losses', color: COL.model, dash: true }]),
      small(392, 230, 'A model', { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = y < 2
      ? 'An island just emptied of every insect. Press Play.'
      : `Year ${y}: ${run.count[y]} kinds, near the ${Math.round(eq)} where arrivals balance losses.${y >= 20 ? ` ${newcomers} of them were not here ten years ago: the count holds while the list changes.` : ''}`;
    if (km >= 0.4 && y >= 30) t.done();
  };
  const ys = slider('Year', 0, 40, 1, 0, (v) => String(v), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 10 });
  const dist = slider('Distance from the mainland', 0.02, 1, 0.02, km, (v) => (v < 1 ? `${Math.round(v * 1000)} m` : '1 km'), (v) => { km = v; paint(); }, 'water');
  const big = slider('Island size', 0.5, 4, 0.1, size, (v) => `${v.toFixed(1)}×`, (v) => { size = v; paint(); }, 'plant');
  f.controls.append(play.node, ys.node, dist.node, big.node);
  const open = guessFirst(t, f, {
    ask: 'Move an island of the same size farther from the mainland. Once it settles, how many kinds will it hold?',
    options: ['Fewer: fewer arrive', 'The same: it is the same size', 'More: fewer competitors arrive'],
    answer: 0,
    sliders: [ys, dist, big],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Species and area ------------------------------------------------------------------------

/** Kinds of amphibians and reptiles on islands of the West Indies against area (km²), Darlington's counts as MacArthur and Wilson reprinted them (1967). */
export const DARLINGTON: readonly { name: string; area: number; kinds: number }[] = [
  { name: 'Redonda', area: 1.6, kinds: 3 },
  { name: 'Saba', area: 13, kinds: 5 },
  { name: 'Montserrat', area: 102, kinds: 9 },
  { name: 'Puerto Rico', area: 8900, kinds: 40 },
  { name: 'Jamaica', area: 11000, kinds: 39 },
  { name: 'Hispaniola', area: 76000, kinds: 84 },
  { name: 'Cuba', area: 110000, kinds: 76 },
];

/** The species-area rule, S = c·A^z, with c chosen so the line passes through the middle of the points. */
export function fitLine(z: number): (area: number) => number {
  const lx = DARLINGTON.map((d) => Math.log10(d.area));
  const ly = DARLINGTON.map((d) => Math.log10(d.kinds));
  const mx = lx.reduce((a, b) => a + b, 0) / lx.length;
  const my = ly.reduce((a, b) => a + b, 0) / ly.length;
  return (area) => 10 ** (my + z * (Math.log10(area) - mx));
}

/** How far the line misses the points, on the ratio scale. */
export const misfit = (z: number) => {
  const s = fitLine(z);
  return Math.sqrt(DARLINGTON.reduce((n, d) => n + Math.log10(s(d.area) / d.kinds) ** 2, 0) / DARLINGTON.length);
};

export const areaFigure = figure(['fit'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let z = 0.1;
  const paint = () => {
    const a = axes({ x: 44, y: 18, w: 340, h: 170, xmin: 0, xmax: 6, ymin: 1, ymax: 200, ylog: true, xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [1, 10, 100], xfmt: (v) => (v < 3 ? String(10 ** v) : `10${'⁰¹²³⁴⁵⁶'[v]}`), xlabel: 'island area, km² (each step ten times the last)', ylabel: 'kinds of amphibians and reptiles', ink: COL.ink, grid: COL.grid });
    const s = fitLine(z);
    const pts = Array.from({ length: 31 }, (_, i) => [i / 5, s(10 ** (i / 5))] as [number, number]);
    redraw(g,
      ...a.parts,
      a.path(pts, COL.model, 2),
      ...a.dots(DARLINGTON.map((d) => [Math.log10(d.area), d.kinds] as [number, number]), COL.data, 3.2),
      ...DARLINGTON.filter((d) => ['Redonda', 'Montserrat', 'Jamaica', 'Cuba'].includes(d.name)).map((d) => small(a.X(Math.log10(d.area)) + 6, a.Y(d.kinds) + 12, d.name, { soft: true })),
    );
    const times = 10 ** z;
    const good = misfit(z) < 0.12;
    f.readout.textContent = `With z = ${z.toFixed(2)}, every tenfold increase in area multiplies the kinds by ${times.toFixed(2)}. ${good ? 'The line runs through the islands: about double the kinds for ten times the area.' : misfit(z) < 0.2 ? 'Close. Fit the line to the dots.' : 'The line misses the dots. Tilt it.'}`;
    if (good) t.done();
  };
  const s = slider('Steepness z', 0, 0.6, 0.01, z, (v) => v.toFixed(2), (v) => { z = v; paint(); }, 'model');
  f.controls.append(s.node);
  paint();
  return f.node;
});
