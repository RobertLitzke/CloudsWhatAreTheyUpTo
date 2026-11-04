// Lesson 15, The plant in the cupboard: a year of day length with a
// short-day and a long-day plant and a flash of light at midnight; lettuce
// seeds under red and far-red flashes; and seedlings under a canopy.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { axes, button, COL, figure, frame, guessFirst, pick, slider, toggles, wrapped } from './kit';

const W = 400;

/** Hours from sunrise to sunset on day `d` of the year (0 = 1 January) at `lat` degrees north. */
export function dayLength(lat: number, d: number): number {
  const decl = (23.44 * Math.PI) / 180 * Math.sin((2 * Math.PI * (284 + d + 1)) / 365);
  const phi = (lat * Math.PI) / 180;
  // Sunrise and sunset counted when the sun's top edge meets the horizon, bent up by the air: 0.83° below it.
  const h0 = (-0.833 * Math.PI) / 180;
  const x = (Math.sin(h0) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
  if (x <= -1) return 24;
  if (x >= 1) return 0;
  return (2 * Math.acos(x) * 180) / Math.PI / 15;
}

/** The longest unbroken dark period in a night of `night` hours, with or without a flash at midnight. */
export const longestDark = (night: number, flash: boolean) => (flash ? night / 2 : night);

/** A short-day plant flowers once its longest dark period passes 12.5 hours; a long-day plant once it falls below 10. */
export const SHORT_DAY_NIGHT = 12.5;
export const LONG_DAY_NIGHT = 10;

export function flowering(lat: number, flash: boolean): { shortDay: boolean[]; longDay: boolean[] } {
  const shortDay: boolean[] = [];
  const longDay: boolean[] = [];
  for (let d = 0; d < 365; d++) {
    const dark = longestDark(24 - dayLength(lat, d), flash);
    shortDay.push(dark >= SHORT_DAY_NIGHT);
    longDay.push(dark <= LONG_DAY_NIGHT);
  }
  return { shortDay, longDay };
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** Runs of true days as [start, end] pairs. */
function runs(on: boolean[]): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  on.forEach((v, i) => {
    if (v && start < 0) start = i;
    if (!v && start >= 0) {
      out.push([start, i - 1]);
      start = -1;
    }
  });
  if (start >= 0) out.push([start, on.length - 1]);
  return out;
}

export const photoperiodFigure = figure(['nightbreak'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let lat = 48;
  let flash = false;
  const paint = () => {
    const shown = open();
    const a = axes({ x: 40, y: 20, w: 340, h: 130, xmin: 0, xmax: 365, ymin: 0, ymax: 24, yticks: [0, 6, 12, 18, 24], ylabel: 'hours of daylight', ink: COL.ink, grid: COL.grid });
    const curve = Array.from({ length: 73 }, (_, i) => [i * 5, dayLength(lat, i * 5)] as const);
    const fl = flowering(lat, flash);
    const band = (on: boolean[], y: number, color: string) => runs(on).map(([s, e]) => svg('rect', { x: a.X(s), y, width: Math.max(1, a.X(e + 1) - a.X(s)), height: 10, fill: color, rx: 2 }));
    redraw(g,
      ...a.parts,
      ...MONTHS.map((m, i) => small(a.X(i * 30.4 + 15), 164, m, { anchor: 'middle', soft: true })),
      a.path(curve, COL.light, 2.5),
      small(40, 186, 'Short-day plant in flower', { fill: COL.autumn }),
      ...(shown ? band(fl.shortDay, 190, COL.autumn) : []),
      small(40, 214, 'Long-day plant in flower', { fill: COL.leaf }),
      ...(shown ? band(fl.longDay, 218, COL.leaf) : []),
      label(380, 36, `${lat}° N`, { anchor: 'end', bold: true }),
      flash ? small(380, 52, 'flash of light at midnight', { anchor: 'end', fill: COL.light }) : null,
    );
    if (!open()) return;
    const sd = fl.shortDay.some(Boolean);
    const ld = fl.longDay.filter(Boolean).length;
    f.readout.textContent = flash
      ? `A flash at midnight splits every night in two. ${sd ? 'Even so, the longest nights here are long enough for the short-day plant.' : 'No dark period is ever long enough now, and the short-day plant never flowers,'} while the long-day plant flowers ${ld > 360 ? 'all year' : 'for longer'}, though the days themselves haven't changed.`
      : `At ${lat}° N the short-day plant flowers ${sd ? 'when the nights grow long' : 'never: the nights are never long enough'}, and the long-day plant ${ld ? 'when they are short' : 'never'}. Each is timing the night. A model.`;
    if (flash) t.done();
  };
  const ls = slider('Latitude', 0, 60, 1, lat, (v) => `${v}° N`, (v) => { lat = v; paint(); }, 'light');
  const nb = toggles(['Flash of light at midnight'], [false], (on) => { flash = on[0]; paint(); });
  f.controls.append(ls.node, nb.node);
  const open = guessFirst(t, f, {
    ask: 'A short-day plant flowers in autumn. Give it a one-minute flash of light at midnight every night, and leave the days alone. Does it flower?',
    options: ['Yes, the days are still short', 'No, never', 'Yes, but sooner'],
    answer: 1,
    reveal: 'done',
    sliders: [ls],
    buttons: nb.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Lettuce seeds and the last flash ------------------------------------------------------------------

/** The share of lettuce seeds that sprout after a run of flashes ('R' red, 'F' far-red): only the last one counts. */
export function lettuce(flashes: string): number {
  const last = flashes[flashes.length - 1];
  return last === 'R' ? 0.9 : 0.05;
}

export const lettuceFigure = figure(['last'], (_ctx, t) => {
  const f = frame(W, 170, 3);
  const g = svg('g');
  f.svg.append(g);
  let flashes = '';
  let endedR = false;
  let endedF = false;
  const paint = () => {
    const share = flashes ? lettuce(flashes) : 0.05;
    const seeds: SVGElement[] = [];
    for (let i = 0; i < 20; i++) {
      const x = 30 + (i % 10) * 34;
      const y = 104 + Math.floor(i / 10) * 34;
      const up = i / 20 < share;
      seeds.push(svg('ellipse', { cx: x, cy: y, rx: 6, ry: 4, fill: '#d8c08a', stroke: '#a8822e' }));
      if (up) seeds.push(svg('path', { d: `M${x},${y - 3} q2,-10 6,-14`, stroke: COL.leaf, 'stroke-width': 2, fill: 'none' }), svg('ellipse', { cx: x + 8, cy: y - 18, rx: 4, ry: 2.5, fill: COL.leaf }));
    }
    const chips = [...flashes].map((c, i) => svg('rect', { x: 20 + i * 22, y: 34, width: 18, height: 18, rx: 4, fill: c === 'R' ? COL.red : '#6b1d1d' }));
    redraw(g,
      label(20, 24, 'Flashes so far, in order', { bold: true }),
      ...chips,
      flashes ? null : small(20, 48, 'none yet: seeds kept in the dark', { soft: true }),
      ...seeds,
      label(390, 24, `${Math.round(share * 100)}% sprout`, { anchor: 'end', bold: true }),
    );
    f.readout.textContent = !flashes
      ? 'Damp lettuce seeds in the dark hardly sprout. Give them flashes of red and far-red light in any order.'
      : flashes[flashes.length - 1] === 'R'
        ? `The last flash was red, and most seeds sprout, whatever came before it. Red turns phytochrome to its active form.`
        : `The last flash was far-red, and the seeds stay asleep, whatever came before it. Far-red turns phytochrome back.`;
    if (flashes.length >= 3) {
      if (flashes.endsWith('R')) endedR = true;
      else endedF = true;
    }
    if (endedR && endedF) t.done();
  };
  const red = button('Red flash', () => { flashes = (flashes + 'R').slice(-14); paint(); }, false);
  const far = button('Far-red flash', () => { flashes = (flashes + 'F').slice(-14); paint(); }, false);
  const reset = button('Start again', () => { flashes = ''; paint(); });
  f.controls.append(red, far, reset);
  paint();
  return f.node;
});

// ---- Seedlings under a canopy ---------------------------------------------------------------------------

export const CANOPY = [
  { name: 'Open sky', light: 1, ratio: 1.2 },
  { name: 'Under one layer of leaves', light: 0.2, ratio: 0.5 },
  { name: 'Under a dense canopy', light: 0.03, ratio: 0.15 },
] as const;

/** Stem length (1 = in the open) of a shade-avoiding and a shade-tolerant seedling at a red to far-red ratio. */
export function stretch(ratio: number): { avoider: number; tolerant: number } {
  const shade = Math.max(0, 1 - ratio / 1.2);
  return { avoider: 1 + 2.2 * shade, tolerant: 1 + 0.15 * shade };
}

export const canopyFigure = figure(['stretch'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let at = 0;
  const paint = () => {
    const c = CANOPY[at];
    const s = stretch(c.ratio);
    const ground = 200;
    const seedling = (x: number, h: number, leafSize: number, name: string) => [
      line(x, ground, x, ground - h, COL.leaf, 2.5),
      svg('ellipse', { cx: x - leafSize, cy: ground - h, rx: leafSize, ry: leafSize / 2.4, fill: COL.leaf }),
      svg('ellipse', { cx: x + leafSize, cy: ground - h, rx: leafSize, ry: leafSize / 2.4, fill: COL.leaf }),
      small(x, ground + 14, name, { anchor: 'middle', soft: true }),
    ];
    const leaves: SVGElement[] = [];
    if (at >= 1) for (let i = 0; i < 9; i++) leaves.push(svg('ellipse', { cx: 20 + i * 30, cy: 20 + (i % 2) * 8, rx: 22, ry: 9, fill: COL.leaf, opacity: 0.55 }));
    if (at >= 2) for (let i = 0; i < 9; i++) leaves.push(svg('ellipse', { cx: 34 + i * 30, cy: 34 + (i % 2) * 6, rx: 22, ry: 9, fill: '#3c6e2c', opacity: 0.7 }));
    redraw(g,
      svg('rect', { x: 0, y: 0, width: 280, height: ground, fill: COL.light, opacity: 0.05 + 0.3 * c.light }),
      ...leaves,
      ...seedling(80, 50 * (open() ? s.avoider : 1), 9, 'shade-avoider'),
      ...seedling(200, 50 * (open() ? s.tolerant : 1), 12, 'shade-tolerant'),
      svg('rect', { x: 0, y: ground, width: 280, height: 20, fill: COL.soil, opacity: 0.3 }),
      label(296, 30, c.name, { bold: true }),
      small(296, 60, 'light at the ground', { soft: true }),
      svg('rect', { x: 296, y: 66, width: 90, height: 9, fill: COL.grid, rx: 2 }),
      svg('rect', { x: 296, y: 66, width: 90 * c.light, height: 9, fill: COL.light, rx: 2 }),
      small(386, 88, `${Math.round(c.light * 100)}%`, { anchor: 'end', soft: true }),
      small(296, 110, 'red : far-red', { soft: true }),
      label(296, 130, c.ratio.toFixed(2), { bold: true, fill: COL.red }),
      ...wrapped(296, 156, 'Leaves above soak up red and pass far-red. A model.', 18, { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = at === 0
      ? 'In the open, red and far-red come in about equal amounts, and both seedlings grow short and sturdy.'
      : `Leaves overhead have taken most of the red and let the far-red through. The shade-avoider reads that as a neighbour above it and puts its food into a long stem, ${s.avoider.toFixed(1)} times its length in the open. The shade-tolerant one barely changes.`;
    if (at === 2) t.done();
  };
  const where = pick(CANOPY.map((c) => c.name), 0, (i) => { at = i; paint(); });
  f.controls.append(where.node);
  const open = guessFirst(t, f, {
    ask: 'Two seedlings are moved from the open into deep shade under trees. Which grows the longer stem?',
    options: ['The shade-avoider, a sunflower', 'The shade-tolerant forest herb', 'Neither: both slow down'],
    answer: 0,
    reveal: 'done',
    sliders: [],
    buttons: where.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
