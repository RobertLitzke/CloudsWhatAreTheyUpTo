// Branch M3, Spirit Lake: a lake loaded with dead wood and soil in May 1980,
// its oxygen used up by bacteria feeding on it, and its slow return.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, player, slider } from './kit';

const W = 400;
export const MONTHS = 120;
/** Oxygen below which trout can't live, mg per litre. */
export const FISH = 4;

/**
 * Month by month from May 1980: oxygen in the water (mg/L) and dissolved
 * dead matter (100 = what the blast left with a normal `load` of 1). Bacteria
 * feed on the dead matter and use oxygen as they do; air puts oxygen back in
 * at the surface; logs keep leaching more for a few years. A model.
 */
export function lake(load: number): { oxygen: number[]; matter: number[] } {
  let matter = 100 * load;
  let oxygen = 0.5;
  const out = { oxygen: [oxygen], matter: [matter] };
  for (let m = 1; m <= MONTHS; m++) {
    // Four steps a month keep the oxygen from overshooting.
    for (let k = 0; k < 4; k++) {
      const leach = 1.5 * load * Math.exp(-m / 24);
      const aerobic = oxygen / (oxygen + 1);
      const used = 0.05 * matter * aerobic;
      matter = Math.max(0, matter + (leach - 0.03 * matter - 0.02 * matter * aerobic) / 4);
      oxygen = Math.max(0, Math.min(10, oxygen + (0.15 * (10 - oxygen) - used) / 4));
    }
    out.oxygen.push(oxygen);
    out.matter.push(matter);
  }
  return out;
}

export const spiritFigure = figure(['clear'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let load = 1;
  let month = 0;
  const paint = () => {
    const run = lake(load);
    const m = Math.round(month);
    const a = axes({ x: 40, y: 20, w: 346, h: 150, xmin: 1980, xmax: 1990, ymin: 0, ymax: 10, xticks: [1980, 1982, 1984, 1986, 1988, 1990], yticks: [0, 5, 10], xlabel: 'year', ylabel: 'oxygen, mg per litre', ink: COL.ink, grid: COL.grid });
    const yr = (i: number) => 1980 + (i + 4) / 12;
    redraw(g,
      ...a.parts,
      line(a.X(1980), a.Y(FISH), a.X(1990), a.Y(FISH), COL.sea, 1, { 'stroke-dasharray': '4 3' }),
      small(a.X(1990) - 2, a.Y(FISH) - 4, 'enough for trout', { anchor: 'end', fill: COL.sea }),
      a.path(run.matter.slice(0, m + 1).map((v, i) => [yr(i), Math.min(10, v / 20)] as [number, number]), COL.soil, 1.6, { 'stroke-dasharray': '5 3' }),
      a.path(run.oxygen.slice(0, m + 1).map((v, i) => [yr(i), v] as [number, number]), COL.water, 2.4),
      ...legend(40, 212, [{ text: 'oxygen', color: COL.water }, { text: 'dead matter (and bacteria)', color: COL.soil, dash: true }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    const o = run.oxygen[m];
    const when = run.oxygen.findIndex((v, i) => i > 6 && v >= FISH);
    f.readout.textContent = m < 2
      ? 'May 1980: the lake is full of shattered trees, soil and ash, and bacteria are multiplying on it. Press Play.'
      : `${Math.floor(yr(m))}: ${o.toFixed(1)} mg of oxygen per litre. ${o < 1 ? 'Almost none: only bacteria that need no oxygen can live.' : o < FISH ? 'Rising, as the dead matter is used up.' : 'Enough for fish again.'}${when > 0 ? ` Trout could live here from about ${Math.floor(yr(when))}.` : ''}`;
    if (m >= 72 && o >= FISH) t.done();
  };
  const ms = slider('Months after the blast', 0, MONTHS, 1, 0, (v) => String(v), (v) => { month = v; paint(); }, 'model');
  const play = player(ms, ctx, { seconds: 10 });
  const ls = slider('Dead matter dumped in the lake', 0.5, 2, 0.1, load, (v) => `${v.toFixed(1)}×`, (v) => { load = v; paint(); }, 'soil');
  f.controls.append(play.node, ms.node, ls.node);
  const open = guessFirst(t, f, {
    ask: 'In May 1980 Spirit Lake filled with shattered forest and its oxygen ran out. How long before it held enough oxygen for fish again?',
    options: ['A few months', 'A few years', 'A century'],
    answer: 1,
    sliders: [ms, ls],
    buttons: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});
