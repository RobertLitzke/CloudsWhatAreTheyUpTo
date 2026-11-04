// Branch N2, Why work for someone else's children?: a gene for helping
// relatives, spreading or vanishing by Hamilton's rule, rB > C.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, pick, sig, slider } from './kit';

const W = 400;

export const KIN = [
  { name: 'Sister (ants)', r: 0.75 },
  { name: 'Brother or sister', r: 0.5 },
  { name: 'Cousin', r: 0.125 },
  { name: 'Stranger', r: 0 },
] as const;

export const GENERATIONS = 200;

/**
 * Share of the population carrying a gene that makes its bearer give up `cost`
 * young of its own to raise `benefit` extra young of a relative who shares
 * the gene with chance `r`. Its fitness edge is (rB - C), scaled small, as in
 * Hamilton's rule. Starts at 5%. A model.
 */
export function helping(r: number, benefit: number, cost: number): number[] {
  let p = 0.05;
  const s = 0.05 * (r * benefit - cost);
  const out = [p];
  for (let gen = 1; gen <= GENERATIONS; gen++) {
    p = Math.min(1, Math.max(0, p + s * p * (1 - p)));
    out.push(p);
  }
  return out;
}

export const kinFigure = figure(['cousin'], (_ctx, t) => {
  const f = frame(W, 210, 3);
  const g = svg('g');
  f.svg.append(g);
  let at = 1;
  let benefit = 3;
  let cost = 1;
  const paint = () => {
    const r = KIN[at].r;
    const run = helping(r, benefit, cost);
    const a = axes({ x: 40, y: 20, w: 346, h: 140, xmin: 0, xmax: GENERATIONS, ymin: 0, ymax: 100, xticks: [0, 50, 100, 150, 200], yticks: [0, 50, 100], xlabel: 'generations', ylabel: 'carry the helping gene, %', ink: COL.ink, grid: COL.grid });
    const gain = r * benefit;
    redraw(g,
      ...a.parts,
      line(a.X(0), a.Y(5), a.X(GENERATIONS), a.Y(5), COL.soft, 1, { 'stroke-dasharray': '3 3' }),
      a.path(run.map((p, i) => [i, p * 100] as [number, number]), gain > cost ? COL.good : COL.bad, 2.2),
      small(40, 200, `r × B = ${r === 0.125 ? '1/8' : sig(r)} × ${benefit} = ${sig(gain)}, against C = ${cost}`, { bold: true }),
      small(392, 200, 'A model', { anchor: 'end', soft: true }),
    );
    const end = run[run.length - 1];
    f.readout.textContent = gain > cost
      ? `The gene spreads, to ${Math.round(end * 100)}% after ${GENERATIONS} generations: the extra young raised, weighted by the chance they carry it, outnumber the young given up.`
      : gain === cost
        ? 'Exactly even: the gene neither spreads nor shrinks.'
        : `The gene fades, to ${sig(end * 100)}%: the help given doesn't make up for the young given up.`;
    if (at === 2 && gain > cost) t.done();
  };
  const who = pick(KIN.map((k) => `${k.name}: r = ${k.r === 0.125 ? '1/8' : k.r}`), at, (i) => { at = i; paint(); });
  const bs = slider('Extra young the relative raises (B)', 0, 12, 1, benefit, (v) => String(v), (v) => { benefit = v; paint(); }, 'good');
  const cs = slider('Own young given up (C)', 0.5, 3, 0.5, cost, (v) => String(v), (v) => { cost = v; paint(); }, 'bad');
  f.controls.append(who.node, bs.node, cs.node);
  paint();
  return f.node;
});
