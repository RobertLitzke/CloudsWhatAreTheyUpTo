// Lesson O3, The heaviest living thing: an aspen clone spreading by root
// suckers, with deer and elk eating the young shoots or fenced out.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, player, slider, toggles } from './kit';

const W = 400;
export const COLS = 36;
export const ROWS = 18;

/** Age of the stem on each square of ground (0 for none), year by year. */
export type Grove = Int16Array;

/**
 * An aspen clone over `years`, from a mature grove in the middle of the
 * ground. Each year a square with no stem next to a living one may send up a
 * sucker from the shared roots; old stems die, more often past 100 years. If
 * `browsed`, deer and elk eat nearly every sucker before it grows out of reach.
 */
export function grove(years: number, browsed: boolean, seed = 5): Grove[] {
  const rng = makeRng(seed);
  let g: Grove = new Int16Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (Math.hypot(c - COLS / 2, (r - ROWS / 2) * 1.6) < 11) g[r * COLS + c] = 20 + Math.floor(rng() * 100);
  }
  const out = [g];
  for (let y = 1; y <= years; y++) {
    const n = new Int16Array(g.length);
    for (let i = 0; i < g.length; i++) {
      const age = g[i];
      if (age > 0) {
        const die = age > 100 ? 0.03 : 0.006;
        n[i] = rng() < die ? 0 : age + 1;
      } else {
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        let near = 0;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && g[rr * COLS + cc] > 0) near++;
        }
        // Inside the clone the roots are already there; at its edge they spread a little each year.
        if (near && rng() < 0.12 * near && !(browsed && rng() < 0.99)) n[i] = 1;
      }
    }
    g = n;
    out.push(g);
  }
  return out;
}

export const stems = (g: Grove) => g.reduce((s, a) => s + (a > 0 ? 1 : 0), 0);
export const young = (g: Grove) => g.reduce((s, a) => s + (a > 0 && a < 30 ? 1 : 0), 0);

export const cloneFigure = figure(['fence'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let year = 0;
  let browsed = true;
  let sawBrowsed = false;
  const paint = () => {
    const shown = open();
    const runs = grove(150, browsed);
    const now = runs[year];
    const cell = 10;
    const x0 = (W - COLS * cell) / 2;
    const parts: SVGElement[] = [];
    for (let i = 0; i < now.length; i++) {
      const a = now[i];
      if (!a) continue;
      const x = x0 + (i % COLS) * cell + cell / 2;
      const y = 40 + Math.floor(i / COLS) * cell + cell / 2;
      const r = a < 10 ? 1.6 : a < 40 ? 2.8 : 4;
      parts.push(svg('circle', { cx: x, cy: y, r, fill: a < 30 ? '#9fcf6a' : a > 110 ? '#c9b26a' : '#e8e2d0', stroke: a < 30 ? COL.leaf : COL.soft, 'stroke-width': 0.5 }));
    }
    redraw(g,
      svg('rect', { x: x0, y: 40, width: COLS * cell, height: ROWS * cell, fill: COL.leaf, opacity: 0.06 }),
      ...parts,
      label(16, 22, `Year ${year}: ${stems(now)} stems, ${young(now)} under 30 years old`, { bold: true }),
      small(16, 230, 'Green: young. Pale: grown. Gold: over 110 years. One root system; a model.', { soft: true }),
    );
    if (!shown) return;
    if (browsed && year >= 100) sawBrowsed = true;
    f.readout.textContent = year === 0
      ? 'A grove of aspen trunks, all one plant joined underground. Play the years.'
      : browsed
        ? `Deer and elk eat almost every sucker the roots send up. Old trunks die and nothing replaces them: ${stems(now)} stems left. The roots live on for a while, but the grove is ageing out.`
        : `Fenced, the roots' suckers grow up in every gap where a trunk falls, and the clone slowly spreads at its edges: ${stems(now)} stems.`;
    if (!browsed && sawBrowsed && year >= 100) t.done();
  };
  const ys = slider('Years', 0, 150, 1, 0, (v) => `${v}`, (v) => { year = v; paint(); }, 'leaf');
  const play = player(ys, ctx, { seconds: 10 });
  const sw = toggles(['Fence out deer and elk'], [false], (on) => { browsed = !on[0]; ys.set(0); });
  f.controls.append(play.node, ys.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'An aspen grove is one plant: every trunk grows from the same roots. If deer eat every new shoot for a century, what happens?',
    options: ['It thins as old trunks die', 'Nothing changes', 'The roots keep up'],
    answer: 0,
    reveal: 'done',
    sliders: [ys],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
