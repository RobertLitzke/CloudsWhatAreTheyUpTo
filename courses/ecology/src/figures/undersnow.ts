// Branch M1, Survivors under the snow: the blast zone north of Mount St
// Helens as a grid, with late snow sheltering some ground. What survives
// depends on the season, and recovery spreads out from the survivors.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, legend, player, slider } from './kit';

const W = 400;
export const COLS = 36;
export const ROWS = 18;
/** Kilometres per cell. */
const KM = 1;

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Share of north-facing high ground still under snow, by month. */
const SNOW = [1, 1, 1, 0.95, 0.8, 0.45, 0.1, 0, 0, 0.1, 0.5, 0.9];

export type Zone = 'flow' | 'removed' | 'down' | 'scorched' | 'forest';

export interface Cell { zone: Zone; north: boolean; high: number }

/** The grid: crater at the bottom middle, zones by distance north, each cell north-facing or not, and how high it is (0 to 1). Seeded. */
export const CELLS: readonly Cell[] = (() => {
  const rng = makeRng(1980);
  const out: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dx = (c - COLS / 2 + 0.5) * KM;
      const dy = (ROWS - r - 0.5) * KM;
      const d = Math.hypot(dx, dy * 1.2);
      const ahead = dy < 9 && Math.abs(dx) < 1.5 + dy * 0.45;
      const zone: Zone = ahead ? 'flow' : d < 11 ? 'removed' : d < 18 ? 'down' : d < 21 ? 'scorched' : 'forest';
      out.push({ zone, north: rng() < 0.45, high: Math.max(0, 1 - d / 26) * 0.7 + rng() * 0.3 });
    }
  }
  return out;
})();

/** Chance that a cell's plants and burrowing animals came through, for an eruption in month `m` (0 = January). */
export function survives(cell: Cell, m: number): number {
  if (cell.zone === 'forest') return 1;
  if (cell.zone === 'flow') return 0;
  const snowed = cell.north || cell.high > 0.6 ? SNOW[m] * (0.6 + 0.4 * cell.high) : SNOW[m] * 0.3;
  const bare = cell.zone === 'removed' ? 0.03 : cell.zone === 'down' ? 0.12 : 0.4;
  return snowed * 0.45 + (1 - snowed) * bare;
}

/**
 * Plant cover (0 to 1) in each cell, `years` after an eruption in month `m`.
 * Survivors regrow where they are; elsewhere seeds arrive slowly from
 * survivors and from the standing forest beyond. Seeded. A model.
 */
export function cover(m: number, years: number): number[] {
  const rng = makeRng(518);
  let now: number[] = CELLS.map((c) => (rng() < survives(c, m) ? (c.zone === 'forest' ? 1 : 0.15) : 0));
  for (let y = 0; y < years; y++) {
    now = now.map((v, i) => {
      if (CELLS[i].zone === 'forest') return 1;
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      const near = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && a < ROWS && b >= 0 && b < COLS).map(([a, b]) => now[a * COLS + b]);
      const seeds = near.reduce((s, x) => s + x, 0) / 4;
      const grow = v > 0 ? 0.25 * v * (1 - v) : 0;
      const arrive = (CELLS[i].zone === 'flow' ? 0.02 : 0.06) * seeds;
      return Math.min(1, v + grow + arrive);
    });
  }
  return now;
}

const ZONE_NAME: Record<Zone, string> = { flow: 'pumice and flows', removed: 'trees blown away', down: 'trees flattened', scorched: 'trees killed standing', forest: 'forest' };

export const snowFigure = figure(['season'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let month = 4;
  let years = 0;
  const tried = new Set<number>();
  const size = 10.4;
  const x0 = (W - COLS * size) / 2;
  const paint = () => {
    const cov = cover(month, Math.round(years));
    const cells = CELLS.map((cell, i) => {
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      const v = cov[i];
      const fill = cell.zone === 'forest' ? '#2f5f2c' : v > 0.05 ? COL.plant : cell.zone === 'flow' ? '#cfc6b4' : '#9a8e7c';
      return svg('rect', { x: x0 + c * size, y: 14 + r * size, width: size - 0.6, height: size - 0.6, fill, opacity: cell.zone === 'forest' ? 0.75 : v > 0.05 ? 0.3 + 0.7 * v : 1 });
    });
    const blast = CELLS.map((c, i) => [c, i] as const).filter(([c]) => c.zone !== 'forest');
    const alive = blast.filter(([, i]) => cov[i] > 0.05).length / blast.length;
    redraw(g,
      ...cells,
      svg('path', { d: `M ${W / 2 - 14} ${14 + ROWS * size} L ${W / 2} ${4 + ROWS * size} L ${W / 2 + 14} ${14 + ROWS * size} Z`, fill: COL.rock }),
      small(W / 2, 14 + ROWS * size + 12, 'crater', { anchor: 'middle', soft: true }),
      small(x0, 10, 'north ↑', { soft: true }),
      ...legend(x0, 230, [{ text: 'forest', color: '#2f5f2c' }, { text: 'living plants', color: COL.plant }, { text: 'bare ash and logs', color: '#9a8e7c' }, { text: 'pumice', color: '#cfc6b4' }]),
    );
    if (!open()) return;
    tried.add(month);
    const zones = (['removed', 'down', 'scorched'] as Zone[]).map((z) => {
      const cs = blast.filter(([c]) => c.zone === z);
      return `${ZONE_NAME[z]} ${Math.round((100 * cs.filter(([, i]) => cov[i] > 0.05).length) / cs.length)}%`;
    }).join(', ');
    f.readout.textContent = `A blast in ${MONTHS[month]}, ${years < 1 ? 'just after' : `${Math.round(years)} years on`}: ${years < 1 ? 'survivors' : 'plants growing'} on ${Math.round(alive * 100)}% of the blast zone (${zones}). ${years < 1 ? (SNOW[month] > 0.5 ? 'Snow sheltered much of the high, north-facing ground.' : 'Little snow was left to shelter anything.') : ''}`;
    if (tried.has(4) && [6, 7, 8].some((m) => tried.has(m))) t.done();
  };
  const ms = slider('Month of the blast', 0, 11, 1, month, (v) => MONTHS[v], (v) => { month = v; paint(); }, 'water');
  const ys = slider('Years after', 0, 20, 1, 0, (v) => String(v), (v) => { years = v; paint(); }, 'plant');
  const play = player(ys, ctx, { seconds: 8 });
  f.controls.append(ms.node, play.node, ys.node);
  const open = guessFirst(t, f, {
    ask: 'The blast came on 18 May 1980, with late snow still lying on high and north-facing slopes. Had it come in August, after the snow had gone, how many plants would have come through it?',
    options: ['More', 'About as many', 'Fewer'],
    answer: 2,
    sliders: [ms, ys],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});
