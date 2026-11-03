// Lesson 1, How many kinds are there?: Erwin's chain of guesses, and a
// meadow sampled square by square.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, button, COL, count, figure, frame, guessFirst, slider, toggles, wrapped } from './kit';

const W = 400;

// ---- Erwin's chain of guesses -------------------------------------------------------

/** Erwin's numbers: beetle kinds in 19 crowns of Luehea seemannii, and tropical tree species. */
export const ERWIN = { beetles: 1200, trees: 50000, specialists: 0.135, beetleShare: 0.4, canopyShare: 2 / 3 };

/** Erwin's total for tropical arthropods from his three guesses. */
export const erwinTotal = (specialists: number, beetleShare: number, canopyShare: number) =>
  (ERWIN.beetles * specialists * ERWIN.trees) / beetleShare / canopyShare;

/** Kinds of living thing named so far, roughly. */
const NAMED = 2.1e6;

export const erwinFigure = figure(['low'], (_ctx, t) => {
  const f = frame(W, 268, 3);
  const g = svg('g');
  f.svg.append(g);
  let s = ERWIN.specialists;
  let b = ERWIN.beetleShare;
  let c = ERWIN.canopyShare;
  // The bar: a log scale from 100,000 to 100 million.
  const lx = (v: number) => 30 + (Math.log10(v / 1e5) / 3) * 340;
  const paint = () => {
    const perTree = ERWIN.beetles * s;
    const canopyBeetles = perTree * ERWIN.trees;
    const canopyAll = canopyBeetles / b;
    const total = canopyAll / c;
    const row = (y: number, op: string, words: string, value: string, color: string = COL.ink) => [
      label(30, y, op, { bold: true, fill: COL.soft }),
      label(52, y, words),
      label(370, y, value, { anchor: 'end', bold: true, fill: color }),
      line(30, y + 7, 370, y + 7, COL.grid, 1),
    ];
    redraw(g,
      ...row(22, '', 'Kinds of beetle in 19 trees of one species', big(ERWIN.beetles)),
      ...row(46, '×', `share found on this tree species only (${pct(s)})`, `${big(perTree)}`, COL.prey),
      ...row(70, '×', 'kinds of tropical tree (about 50,000)', count(canopyBeetles)),
      ...row(94, '÷', `beetles’ share of all arthropods (${pct(b)})`, count(canopyAll), COL.rival),
      ...row(118, '÷', `the canopy’s share of all arthropods (${pct(c)})`, count(total), COL.predator),
      label(52, 146, 'Tropical arthropods, by this chain:', { bold: true }),
      label(370, 146, count(total), { anchor: 'end', bold: true, fill: COL.heat }),
      // The bar.
      svg('rect', { x: 30, y: 170, width: 340, height: 18, fill: COL.grid, rx: 3 }),
      svg('rect', { x: 30, y: 170, width: Math.max(2, lx(Math.min(1e8, total)) - 30), height: 18, fill: COL.heat, rx: 3, opacity: 0.85 }),
      line(lx(NAMED), 164, lx(NAMED), 194, COL.ink, 2),
      small(lx(NAMED), 206, 'every kind of living thing named so far', { anchor: 'middle' }),
      ...[1e5, 1e6, 1e7, 1e8].map((v) => small(lx(v), 222, v >= 1e6 ? `${v / 1e6} million` : '100,000', { anchor: v === 1e5 ? undefined : v === 1e8 ? 'end' : 'middle', soft: true })),
      ...wrapped(30, 244, 'Each slider runs over the values the evidence of the time allowed. The bar is on a scale of tens: each mark is ten times the last.', 78, { soft: true }),
    );
    if (open()) {
      f.readout.textContent = total < 5e6
        ? `${count(total)}: the same 1,200 beetles, a different guess. Later counts in New Guinea and Panama found far fewer beetles tied to one kind of tree, and estimates fell to a few million.`
        : `${count(total)} kinds of tropical arthropod. Move each guess across its range: which one swings the total most?`;
      if (total < 5e6) t.done();
    }
  };
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  const big = (n: number) => Math.round(n).toLocaleString('en-US');
  const s1 = slider('Found on one tree species only', 1, 25, 0.5, s * 100, (v) => `${v}%`, (v) => { s = v / 100; paint(); }, 'prey');
  const s2 = slider('Beetles’ share of arthropods', 20, 50, 1, b * 100, (v) => `${v}%`, (v) => { b = v / 100; paint(); }, 'rival');
  const s3 = slider('Canopy’s share of arthropods', 40, 80, 1, Math.round(c * 100), (v) => `${v}%`, (v) => { c = v / 100; paint(); }, 'predator');
  f.controls.append(s1.node, s2.node, s3.node);
  const open = guessFirst(t, f, {
    ask: 'Each of Erwin’s three guesses could be wrong. Which one, moved across what the evidence allows, can swing the total most?',
    options: ['Beetles found on one tree species only', 'Beetles’ share of all arthropods', 'The canopy’s share of all arthropods'],
    answer: 0,
    reveal: 'done',
    sliders: [s1, s2, s3],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Sampling a meadow ---------------------------------------------------------------

const COLS = 8;
const ROWS = 5;
const KINDS = 90;
const PER_SQUARE = 24;

/** Each square's plants, as kinds numbered from the commonest (0) down. `steep` makes the rare ones rarer. */
export function meadow(steep: boolean, seed = 11): number[][] {
  const rng = makeRng(seed);
  const q = steep ? 0.9 : 0.95;
  const weights = Array.from({ length: KINDS }, (_, i) => q ** i);
  const total = weights.reduce((a, w) => a + w, 0);
  const draw = () => {
    let r = rng() * total;
    for (let i = 0; i < KINDS; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return KINDS - 1;
  };
  return Array.from({ length: COLS * ROWS }, () => Array.from({ length: PER_SQUARE }, draw));
}

/** Kinds found after searching each number of squares, in the order given. */
export function accumulation(squares: number[][], order: number[]): number[] {
  const seen = new Set<number>();
  return [0, ...order.map((k) => {
    for (const p of squares[k]) seen.add(p);
    return seen.size;
  })];
}

const hue = (k: number) => `hsl(${(k * 137.5) % 360} 55% ${k < 8 ? 42 : 52}%)`;

export const samplerFigure = figure(['curve'], (_ctx, t) => {
  const f = frame(W, 330, 3);
  const g = svg('g');
  f.svg.append(g);
  let steep = false;
  let squares = meadow(steep);
  // Squares are searched in a scattered order, as a field worker would pick them.
  const order = Array.from({ length: COLS * ROWS }, (_, i) => i).sort((a, b) => ((a * 17) % 40) - ((b * 17) % 40));
  let searched: number[] = [];
  const sx = 28;
  const sy = 12;
  const cw = 43;
  const ch = 26;
  const searchNext = (n: number) => {
    for (let i = 0; i < n; i++) {
      const next = order.find((k) => !searched.includes(k));
      if (next === undefined) break;
      searched.push(next);
    }
    paint();
  };
  const paint = () => {
    const curve = accumulation(squares, searched);
    const found = curve[curve.length - 1];
    const ax = axes({
      x: 40, y: 172, w: 340, h: 118, xmin: 0, xmax: COLS * ROWS, ymin: 0, ymax: KINDS,
      xticks: [0, 10, 20, 30, 40], yticks: [0, 30, 60, 90], xlabel: 'squares searched', ylabel: 'kinds found', ink: COL.ink, grid: COL.grid,
    });
    const cells: SVGElement[] = [];
    for (let k = 0; k < COLS * ROWS; k++) {
      const x = sx + (k % COLS) * cw;
      const y = sy + Math.floor(k / COLS) * ch;
      const done = searched.includes(k);
      const rect = svg('rect', { x, y, width: cw - 2, height: ch - 2, rx: 2, fill: done ? '#e9efd8' : '#a7c48a', stroke: done ? COL.plant : 'none', 'stroke-width': 1, role: 'button', 'aria-label': `square ${k + 1}`, tabindex: 0 });
      rect.addEventListener('click', () => {
        if (!searched.includes(k)) {
          searched.push(k);
          paint();
        }
      });
      cells.push(rect);
      if (done) {
        const rng = makeRng(k + 1);
        for (const p of squares[k]) cells.push(svg('circle', { cx: x + 3 + rng() * (cw - 8), cy: y + 3 + rng() * (ch - 8), r: 1.8, fill: hue(p) }));
      }
    }
    const pts = curve.map((v, i) => [i, v] as const);
    redraw(g,
      ...cells,
      small(sx, sy + ROWS * ch + 10, 'Tap squares to search them; each dot is a plant, its colour its kind.', { soft: true }),
      ...ax.parts,
      ax.path(pts, COL.plant, 2.2),
      ...ax.dots(pts.slice(1), COL.plant, 2),
      line(ax.X(0), ax.Y(KINDS), ax.X(40), ax.Y(KINDS), COL.soft, 1, { 'stroke-dasharray': '4 3' }),
      note(ax.X(40) - 2, ax.Y(KINDS) + 11, `${KINDS} kinds live here`, { anchor: 'end', soft: true }),
    );
    const n = searched.length;
    const counts = new Map<number, number>();
    for (const k of searched) for (const p of squares[k]) counts.set(p, (counts.get(p) ?? 0) + 1);
    const once = [...counts.values()].filter((v) => v === 1).length;
    const lastFive = n >= 5 ? found - curve[n - 5] : found;
    if (!n) f.readout.textContent = 'A meadow with 90 kinds of plant in it, most of them rare. Search squares and watch how many kinds you have found.';
    else f.readout.textContent = `${n} square${n === 1 ? '' : 's'} searched, ${found} kinds found. ${n >= 5 ? `The last five squares added ${lastFive}.` : ''} ${once} kinds have been seen only once: a sign that more are still hidden.`;
    if (n >= 20) t.done();
  };
  const one = button('Search one square', () => searchNext(1));
  const five = button('Search five', () => searchNext(5));
  const again = button('Start again', () => { searched = []; paint(); });
  const rare = toggles(['Rare kinds rarer'], [false], (on) => {
    steep = on[0];
    squares = meadow(steep);
    searched = [];
    paint();
  });
  const row = document.createElement('div');
  row.className = 'chips';
  row.append(one, five, again);
  f.controls.append(row, rare.node);
  paint();
  return f.node;
});
