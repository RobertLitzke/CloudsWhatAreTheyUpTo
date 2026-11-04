// Branch W3, The lake Seattle saved: phosphorus from sewage plants, the
// algae it fed and the water's clarity, 1940 to 1990, with the sewage
// diversion and the return of Daphnia as switches.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, legend, toggles } from './kit';

const W = 400;
export const FIRST = 1940;
export const LAST = 1990;

export interface Lake {
  /** Sewage diverted to Puget Sound in stages from 1963 to 1968. */
  divert: boolean;
  /** Daphnia take over the lake's plankton from 1976. */
  daphnia: boolean;
}

/** Phosphorus from sewage each year, relative to 1962 = 1. */
export function sewage(o: Lake, year: number): number {
  const grown = Math.max(0, Math.min(1, (year - 1941) / 21));
  if (!o.divert || year < 1963) return grown;
  return grown * Math.max(0.02, 1 - (year - 1963) / 5);
}

/**
 * Year by year: phosphorus in the lake (µg/L), algae (chlorophyll, µg/L) and
 * clarity (the depth a white disk can be seen, m). The lake flushes its water
 * in about three years; algae follow phosphorus; Daphnia graze them down.
 * A model.
 */
export function lakeYears(o: Lake): { p: number[]; algae: number[]; clear: number[] } {
  let p = 18;
  const out = { p: [] as number[], algae: [] as number[], clear: [] as number[] };
  for (let y = FIRST; y <= LAST; y++) {
    const target = 18 + 52 * sewage(o, y);
    p += (target - p) / 3;
    const grazed = o.daphnia && y >= 1976 ? 0.35 : 1;
    const algae = Math.max(1, 0.55 * (p - 12)) * grazed;
    out.p.push(p);
    out.algae.push(algae);
    out.clear.push(10 / (1.3 + 0.32 * algae));
  }
  return out;
}

export const lakeWaFigure = figure(['clear'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const o: Lake = { divert: false, daphnia: false };
  const paint = () => {
    const run = lakeYears(o);
    const a = axes({ x: 40, y: 20, w: 346, h: 150, xmin: FIRST, xmax: LAST, ymin: 0, ymax: 80, xticks: [1940, 1950, 1960, 1970, 1980, 1990], yticks: [0, 40, 80], xlabel: 'year', ylabel: 'phosphorus and algae, µg/L; clarity, m × 10', ink: COL.ink, grid: COL.grid });
    const at = (arr: number[], k = 1) => arr.map((v, i) => [FIRST + i, v * k] as [number, number]);
    redraw(g,
      ...a.parts,
      a.path(at(run.p), COL.heat, 1.8),
      a.path(at(run.algae), COL.plant, 2.2),
      a.path(at(run.clear, 10), COL.sea, 2, { 'stroke-dasharray': '5 3' }),
      ...legend(40, 212, [{ text: 'phosphorus', color: COL.heat }, { text: 'algae', color: COL.plant }, { text: 'clarity', color: COL.sea, dash: true }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    const i62 = 1962 - FIRST;
    const end = run.clear.length - 1;
    f.readout.textContent = `In 1962 a white disk vanished ${run.clear[i62].toFixed(1)} m down. By ${LAST}, ${run.clear[end].toFixed(1)} m. ${!o.divert ? 'With the sewage still pouring in, the lake stays green.' : !o.daphnia ? 'Diverting the sewage cut the phosphorus and the algae, and the water cleared.' : 'Then Daphnia grazed the algae down further, and the water cleared again.'}`;
    if (o.divert && o.daphnia) t.done();
  };
  const sw = toggles(['Divert the sewage, 1963 to 1968', 'Daphnia return, 1976'], [false, false], (on) => { o.divert = on[0]; o.daphnia = on[1]; paint(); });
  f.controls.append(sw.node);
  paint();
  return f.node;
});
