// Branch M2, Lupine on the pumice: patches of prairie lupine spreading across
// bare pumice from a few founders, with caterpillars hitting the edges, and
// other plants following on the soil the lupine enriches.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, legend, player, slider } from './kit';

const W = 400;
export const COLS = 40;
export const ROWS = 18;
export const YEARS = 30;

/** 0 bare pumice, 1 lupine, 2 lupine eaten back (enriched ground), 3 other plants on enriched ground. */
export type Ground = 0 | 1 | 2 | 3;

/**
 * The plain year by year, from three lupine plants in 1981. Lupine spreads
 * to bare neighbours; caterpillars kill lupine at a patch's edge, where it
 * meets bare ground, with chance `eaten`; dead lupine leaves nitrogen behind,
 * where other plants can settle. Seeded. A model.
 */
export function plain(eaten: number): Ground[][] {
  const rng = makeRng(1981);
  let g: Ground[] = Array.from({ length: COLS * ROWS }, () => 0 as Ground);
  for (const [r, c] of [[9, 8], [4, 22], [13, 31]]) g[r * COLS + c] = 1;
  const out = [g.slice()];
  const near = (k: number) => {
    const r = Math.floor(k / COLS);
    const c = k % COLS;
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && a < ROWS && b >= 0 && b < COLS).map(([a, b]) => a * COLS + b);
  };
  for (let y = 1; y <= YEARS; y++) {
    const next = g.slice();
    for (let k = 0; k < g.length; k++) {
      const ns = near(k).map((j) => g[j]);
      if (g[k] === 0) {
        const lupines = ns.filter((v) => v === 1).length;
        if (rng() < 0.3 * lupines || rng() < 0.0015) next[k] = 1;
      } else if (g[k] === 1) {
        const edge = ns.some((v) => v === 0);
        if (rng() < (edge ? eaten : eaten * 0.15) || rng() < 0.03) next[k] = 2;
      } else if (g[k] === 2) {
        if (rng() < 0.12) next[k] = 3;
        else if (rng() < 0.2 * ns.filter((v) => v === 1).length) next[k] = 1;
      }
    }
    g = next;
    out.push(g.slice());
  }
  return out;
}

const COLORS = ['#d7cfbd', '#6f63b8', '#a79b7a', COL.plant];

export const lupineFigure = figure(['edge'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const gEl = svg('g');
  f.svg.append(gEl);
  let eaten = 0.4;
  let year = 0;
  const tried = new Set<string>();
  const size = 9.4;
  const x0 = (W - COLS * size) / 2;
  const paint = () => {
    const run = plain(eaten);
    const y = Math.round(year);
    const now = run[y];
    const count = (v: Ground) => now.filter((x) => x === v).length / now.length;
    redraw(gEl,
      ...now.map((v, i) => svg('rect', { x: x0 + (i % COLS) * size, y: 10 + Math.floor(i / COLS) * size, width: size - 0.5, height: size - 0.5, fill: COLORS[v] })),
      ...legend(x0, 196, [{ text: 'pumice', color: COLORS[0] }, { text: 'lupine', color: COLORS[1] }, { text: 'eaten back', color: COLORS[2] }, { text: 'other plants', color: COLORS[3] }]),
      small(x0, 214, `${1981 + y}`, { bold: true }),
      small(W - x0, 214, 'A model', { anchor: 'end', soft: true }),
    );
    f.readout.textContent = `${1981 + y}: lupine on ${Math.round(count(1) * 100)}% of the plain, other plants on ${Math.round(count(3) * 100)}%, bare pumice ${Math.round(count(0) * 100)}%. ${eaten > 0.3 ? 'Caterpillars at the edges hold the patches back.' : eaten < 0.05 ? 'With nothing eating them, the patches race outward.' : ''}`;
    if (y >= 15) tried.add(eaten < 0.05 ? 'none' : eaten > 0.3 ? 'many' : 'some');
    if (tried.has('none') && tried.has('many')) t.done();
  };
  const ys = slider('Year', 0, YEARS, 1, 0, (v) => String(1981 + v), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 10 });
  const es = slider('Caterpillars at the patch edges', 0, 0.8, 0.05, eaten, (v) => `${Math.round(v * 100)}%`, (v) => { eaten = v; paint(); }, 'heat');
  f.controls.append(play.node, ys.node, es.node);
  paint();
  return f.node;
});
