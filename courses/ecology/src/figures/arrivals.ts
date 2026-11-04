// Branch H2, Arrivals: twenty releases of a newcomer, with or without the
// enemies it had at home. Most fizzle out; a few take off.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, COL, figure, frame, legend, slider, toggles } from './kit';

const W = 400;

/** Releases in one run of the figure. */
export const TRIES = 20;
/** The most the new home can hold. */
export const ROOM = 5000;
/** Counted as taken over: at least this many after 30 years. */
export const BOOM = 1000;

export interface Release {
  founders: number;
  /** Its predators, parasites and diseases came with it. */
  enemies: boolean;
}

/** A normal random number from two uniform ones. */
const normal = (rng: () => number) => Math.sqrt(-2 * Math.log(Math.max(1e-12, rng()))) * Math.cos(2 * Math.PI * rng());

/** A Poisson-like random count with mean `m`. */
function draw(rng: () => number, m: number): number {
  if (m > 30) return Math.max(0, Math.round(m + Math.sqrt(m) * normal(rng)));
  const l = Math.exp(-m);
  let k = 0;
  let p = rng();
  while (p > l) { k++; p *= rng(); }
  return k;
}

/**
 * Numbers year by year for each of `TRIES` releases. Each year the population
 * grows by a random factor (good years and bad), slower with its enemies, and
 * levels off as it fills the room it has. Individuals are whole animals, so a
 * small population can die out by chance. Seeded. A model.
 */
export function releases(r: Release, years = 30): number[][] {
  const rng = makeRng(1890);
  const mu = r.enemies ? -0.02 : 0.3;
  return Array.from({ length: TRIES }, () => {
    let n = r.founders;
    const out = [n];
    for (let y = 1; y <= years; y++) {
      const factor = Math.exp(mu + 0.45 * normal(rng));
      const m = (n * factor) / (1 + (n * Math.max(0, factor - 1)) / ROOM);
      n = n > 0 ? draw(rng, m) : 0;
      out.push(n);
    }
    return out;
  });
}

export const fate = (runs: number[][]) => {
  const last = runs.map((r) => r[r.length - 1]);
  return { gone: last.filter((n) => n === 0).length, boom: last.filter((n) => n >= BOOM).length };
};

export const releaseFigure = figure(['boom'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const r: Release = { founders: 10, enemies: true };
  const tried = new Set<boolean>();
  const paint = () => {
    const runs = releases(r);
    const { gone, boom } = fate(runs);
    const a = axes({ x: 44, y: 20, w: 340, h: 150, xmin: 0, xmax: 30, ymin: 1, ymax: 10000, ylog: true, xticks: [0, 10, 20, 30], yticks: [1, 10, 100, 1000, 10000], yfmt: (v) => v.toLocaleString('en-US'), xlabel: 'years after release', ylabel: 'animals, in each of twenty releases', ink: COL.ink, grid: COL.grid });
    redraw(g,
      ...a.parts,
      ...runs.map((run) => {
        const end = run.indexOf(0);
        const pts = run.slice(0, end < 0 ? run.length : end + 1).map((n, i) => [i, Math.max(n, 1)] as [number, number]);
        const last = run[run.length - 1];
        return a.path(pts, last >= BOOM ? COL.heat : last === 0 ? COL.soft : COL.prey, last >= BOOM ? 1.8 : 1.1, { opacity: 0.8 });
      }),
      ...legend(44, 212, [{ text: 'took over', color: COL.heat }, { text: 'hanging on', color: COL.prey }, { text: 'died out', color: COL.soft }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    tried.add(r.enemies);
    f.readout.textContent = `Of ${TRIES} releases of ${r.founders} animals ${r.enemies ? 'that brought their enemies with them' : 'free of their old enemies'}, ${gone} died out and ${boom} took over, passing ${BOOM.toLocaleString('en-US')} within 30 years.`;
    if (tried.size === 2 && boom > 0) t.done();
  };
  const fs = slider('Animals released', 2, 100, 1, r.founders, (v) => String(v), (v) => { r.founders = v; paint(); }, 'prey');
  const sw = toggles(['Its enemies came too'], [true], (on) => { r.enemies = on[0]; paint(); });
  f.controls.append(fs.node, sw.node);
  paint();
  return f.node;
});
