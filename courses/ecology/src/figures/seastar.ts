// Lesson 7, The sea star experiment: a patch of shore as a grid of space,
// with mussels taking over when the sea stars go; and Connell's barnacles.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, player, slider, toggles, wrapped } from './kit';

const W = 400;
const COLS = 24;
const ROWS = 12;

/** The kinds that take space on the rock: index 1 is the California mussel, the best competitor. */
export const KINDS = [
  { name: 'bare rock', color: '#d9d2c3' },
  { name: 'California mussel', color: '#2b3348' },
  { name: 'goose barnacle', color: '#8c7b63' },
  { name: 'acorn barnacle', color: '#e8e2d2' },
  { name: 'small acorn barnacle', color: '#c9c2ae' },
  { name: 'limpet', color: '#a58a5c' },
  { name: 'chiton', color: '#5e4b3c' },
  { name: 'anemone', color: '#3f8f5a' },
  { name: 'coralline alga', color: '#d58aa8' },
  { name: 'sea palm', color: '#7b6a2a' },
  { name: 'red alga', color: '#a8344a' },
  { name: 'sponge', color: '#d9a441' },
  { name: 'tube worm', color: '#9aa3c7' },
  { name: 'rockweed', color: '#8b7d2e' },
] as const;

export interface Shore {
  stars: boolean;
  /** Mussels overgrow other kinds when they meet them. */
  strongMussels: boolean;
}

/** Kinds that hold on among mussels, or live on them: goose barnacles, anemones, sponges, tube worms. */
const HARDY = new Set([2, 7, 11, 12]);

/** The rock's cells each year from 0 to `years`, from the same start. */
export function shore(s: Shore, years: number, seed = 1963): number[][] {
  const rng = makeRng(seed);
  // A mixed shore to start: some mussel clumps, the rest shared out.
  let grid = Array.from({ length: COLS * ROWS }, () => (rng() < 0.22 ? 1 : rng() < 0.12 ? 0 : 2 + Math.floor(rng() * (KINDS.length - 2))));
  const out = [grid.slice()];
  const near = (k: number) => {
    const x = k % COLS;
    const y = Math.floor(k / COLS);
    return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, b]) => a >= 0 && a < COLS && b >= 0 && b < ROWS).map(([a, b]) => b * COLS + a);
  };
  for (let yr = 1; yr <= years; yr++) {
    const next = grid.slice();
    for (let k = 0; k < grid.length; k++) {
      const here = grid[k];
      const mussels = near(k).filter((j) => grid[j] === 1).length;
      if (here === 1) {
        // Sea stars eat mussels in patches; logs and storms tear a few out.
        if ((s.stars && rng() < 0.42) || rng() < 0.02) next[k] = 0;
      } else if (here === 0) {
        // Bare rock is settled by mussels spreading from next door, or by larvae of any kind.
        if (mussels && rng() < 0.35 * mussels) next[k] = 1;
        else if (rng() < 0.7) next[k] = 2 + Math.floor(rng() * (KINDS.length - 2));
      } else {
        // Others die back now and then; mussels next door grow over them.
        if (s.strongMussels && mussels && rng() < (HARDY.has(here) ? 0.025 : 0.22) * mussels) next[k] = 1;
        else if (rng() < 0.08) next[k] = 0;
      }
    }
    grid = next;
    out.push(grid.slice());
  }
  return out;
}

/** How many kinds are on the rock: those holding space, and the sea star itself. */
export const kindsOn = (cells: readonly number[], stars: boolean) => new Set(cells.filter((c) => c > 0)).size + (stars ? 1 : 0);

const starPath = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return svg('polygon', { points: pts.join(' '), fill: '#d9772f', stroke: '#8a3f17', 'stroke-width': 0.8 });
};

export const poolFigure = figure(['fewer'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  const s: Shore = { stars: true, strongMussels: true };
  let year = 0;
  const cw = 15;
  const ox = 20;
  const oy = 14;
  const paint = () => {
    const runs = shore(s, 15);
    const cells = runs[year];
    const n = kindsOn(cells, s.stars);
    const cover = cells.filter((c) => c === 1).length / cells.length;
    const rects = cells.map((c, k) => svg('rect', { x: ox + (k % COLS) * cw, y: oy + Math.floor(k / COLS) * cw, width: cw - 1, height: cw - 1, fill: KINDS[c].color, rx: 2 }));
    const stars = s.stars ? [starPath(ox + 4.5 * cw, oy + 3 * cw, 11), starPath(ox + 15 * cw, oy + 8.5 * cw, 12), starPath(ox + 20.5 * cw, oy + 2.5 * cw, 10)] : [];
    redraw(g,
      ...rects, ...stars,
      label(ox, 214, `Year ${year}`, { bold: true }),
      label(ox + 70, 214, `${n} kinds`, { bold: true, fill: n <= 9 ? COL.bad : COL.good }),
      label(ox + 150, 214, `mussels cover ${Math.round(cover * 100)}%`, { fill: KINDS[1].color }),
      small(ox, 230, s.stars ? 'Orange: ochre sea stars, which eat mussels.' : 'The sea stars have been thrown out.', { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = year === 0
      ? `A stretch of rock with ${n} kinds on it${s.stars ? ', sea stars included' : ''}. Press Play.`
      : !s.stars && n <= 9 && s.strongMussels
        ? `Year ${year}: mussels have spread over ${Math.round(cover * 100)}% of the rock, smothering barnacles, algae and anemones. Without the sea stars, ${n} kinds are left.`
        : !s.stars && !s.strongMussels
          ? `Year ${year}: with mussels that can’t overgrow their neighbours, losing the sea stars changes little: ${n} kinds.`
          : `Year ${year}: ${n} kinds. ${s.stars ? 'The sea stars keep opening gaps in the mussel beds, and other kinds settle in them.' : 'The mussels are spreading.'}`;
    if (!s.stars && s.strongMussels && year >= 8 && n <= 9) t.done();
  };
  const years = slider('Year', 0, 15, 1, 0, (v) => `${v}`, (v) => { year = v; paint(); }, 'sea');
  const play = player(years, ctx, { seconds: 8 });
  const sw = toggles(['Throw out the sea stars', 'Mussels can’t overgrow others'], [false, false], (on) => {
    s.stars = !on[0];
    s.strongMussels = !on[1];
    years.set(0);
  });
  f.controls.append(sw.node, play.node, years.node);
  const open = guessFirst(t, f, {
    ask: 'Pry every sea star off this rock and keep them off. After ten years, will the rock hold more kinds or fewer?',
    options: ['More: their prey are spared', 'Fewer', 'About the same'],
    answer: 1,
    reveal: 'done',
    sliders: [years],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Connell's barnacles ---------------------------------------------------------------------

export const barnacleStill = () => {
  const s = still(W, 230);
  // The rock face slopes from top left to bottom right; the bands lie along its surface.
  const x0 = 20;
  const y0 = 20;
  const x1 = 220;
  const y1 = 215;
  const at = (f: number): [number, number] => [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
  // Outward from the rock face, at right angles to it.
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = (y1 - y0) / len;
  const ny = -(x1 - x0) / len;
  const band = (f0: number, f1: number, fill: string, lift = 0, extra: Record<string, string | number> = {}) => {
    const [ax, ay] = at(f0);
    const [bx, by] = at(f1);
    const p = (x: number, y: number, d: number) => `${(x + nx * d).toFixed(1)},${(y + ny * d).toFixed(1)}`;
    return svg('polygon', { points: [p(ax, ay, lift), p(bx, by, lift), p(bx, by, lift + 7), p(ax, ay, lift + 7)].join(' '), fill, ...extra });
  };
  const high = 66;
  const low = 150;
  s.svg.append(
    svg('rect', { width: W, height: 230, fill: COL.paper }),
    svg('rect', { x: 0, y: low, width: 236, height: 80, fill: COL.water, opacity: 0.15 }),
    svg('polygon', { points: `${x0},${y0} ${x1},${y1} ${x0},${y1}`, fill: COL.rock }),
    line(0, high, 236, high, COL.water, 1, { 'stroke-dasharray': '5 4' }), small(4, high - 4, 'high tide', { fill: COL.water }),
    line(0, low, 236, low, COL.water, 1, { 'stroke-dasharray': '5 4' }), small(4, low - 4, 'low tide', { fill: COL.water }),
    band(0.14, 0.4, '#f3ead2', 0, { stroke: '#8a6d2b', 'stroke-width': 0.8 }),
    band(0.4, 0.68, '#7d8aa3', 0),
    band(0.4, 0.6, 'none', 10, { stroke: '#c98a2e', 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }),
    label(250, 40, 'Chthamalus', { bold: true, fill: '#8a6d2b' }),
    ...wrapped(250, 54, 'Small barnacle, high on the rock. Its upper edge is set by drying out at low tide.', 28, { soft: true }),
    label(250, 116, 'Balanus', { bold: true, fill: '#4b5a78' }),
    ...wrapped(250, 130, 'Bigger and faster-growing, lower down. It crowds Chthamalus out, and can’t stand the drying higher up.', 28, { soft: true }),
    line(250, 196, 266, 196, '#c98a2e', 1.6, { 'stroke-dasharray': '3 3' }),
    ...wrapped(270, 200, 'Where Chthamalus lived once Balanus was scraped away', 24, { fill: '#8a6d2b' }),
  );
  return { node: s.node };
};
