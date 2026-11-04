// Branch H3, The cod that didn't come back: fishing a stock that grows like
// lesson 2's curve, by a fixed catch or a fixed share, through one bad year.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, pick, slider, toggles } from './kit';

const W = 400;

/** The stock with no fishing, as 100. */
export const K = 100;
/** Growth rate of a small stock, per year. */
export const R = 0.4;
/** The most the stock can give each year without shrinking: at half of K. */
export const MSY = (R * K) / 4;
/** The year the bad year comes. */
export const BAD_YEAR = 15;

export interface Fishing {
  /** Catch a fixed tonnage each year, or a fixed share of what's there. */
  rule: 'catch' | 'share';
  /** How hard, as a share of the most the stock can sustainably give. */
  effort: number;
  /** Young fish fail one year and the stock loses half. */
  bad: boolean;
}

/** Stock and catch for 50 years, starting from a stock fished down to 60. A model. */
export function fishery(o: Fishing, years = 50): { stock: number[]; caught: number[] } {
  let n = 60;
  const stock = [n];
  const caught = [0];
  for (let y = 1; y <= years; y++) {
    const grown = n + R * n * (1 - n / K);
    const want = o.rule === 'catch' ? o.effort * MSY : o.effort * (R / 2) * grown;
    const c = Math.min(grown, want);
    n = grown - c;
    if (o.bad && y === BAD_YEAR) n *= 0.5;
    if (n < 0.5) n = 0;
    stock.push(n);
    caught.push(c);
  }
  return { stock, caught };
}

export const codFigure = figure(['share'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const o: Fishing = { rule: 'catch', effort: 0.9, bad: true };
  const paint = () => {
    const run = fishery(o);
    const a = axes({ x: 40, y: 20, w: 346, h: 150, xmin: 0, xmax: 50, ymin: 0, ymax: 100, xticks: [0, 10, 20, 30, 40, 50], yticks: [0, 50, 100], xlabel: 'years', ylabel: 'fish in the sea, unfished = 100', ink: COL.ink, grid: COL.grid });
    redraw(g,
      ...a.parts,
      line(a.X(0), a.Y(K / 2), a.X(50), a.Y(K / 2), COL.model, 1, { 'stroke-dasharray': '4 3' }),
      small(a.X(50) - 2, a.Y(K / 2) - 4, 'half: where it grows fastest', { anchor: 'end', fill: COL.model }),
      o.bad ? line(a.X(BAD_YEAR), a.Y(0), a.X(BAD_YEAR), a.Y(100), COL.heat, 1, { 'stroke-dasharray': '2 3' }) : null,
      o.bad ? small(a.X(BAD_YEAR) + 4, a.Y(92), 'a bad year', { fill: COL.heat }) : null,
      a.path(run.stock.map((v, i) => [i, v]), COL.sea, 2.2),
      a.path(run.caught.map((v, i) => [i, v * 5] as [number, number]).slice(1), COL.prey, 1.6),
      ...legend(40, 212, [{ text: 'fish in the sea', color: COL.sea }, { text: 'catch, ×5 to show', color: COL.prey }]),
      small(392, 212, 'A model', { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    const end = run.stock[run.stock.length - 1];
    const dead = run.stock.indexOf(0);
    f.readout.textContent = dead > 0
      ? `Collapsed in year ${dead}. ${o.rule === 'catch' ? 'A fixed catch takes a bigger and bigger share as the stock shrinks, so once a bad year knocks the stock low enough, it can never get back.' : 'Even a fixed share collapses the stock if the share is set too high.'}`
      : `After 50 years the stock is at ${Math.round(end)}, with a catch of ${Math.round(run.caught[50])} a year (the most it can give is ${MSY}). ${o.rule === 'share' ? 'A fixed share takes less when the fish are few, so the stock can recover.' : ''}`;
    if (o.rule === 'share' && o.bad && dead < 0 && o.effort >= 0.8) t.done();
  };
  const rules = pick(['Fixed catch', 'Fixed share'], 0, (i) => { o.rule = i ? 'share' : 'catch'; paint(); });
  const es = slider('How hard, as a share of the most it can give', 0.2, 1.4, 0.05, o.effort, (v) => `${Math.round(v * 100)}%`, (v) => { o.effort = v; paint(); }, 'prey');
  const sw = toggles(['A bad year in year 15'], [true], (on) => { o.bad = on[0]; paint(); });
  f.controls.append(rules.node, es.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'A fishery lands a fixed catch each year, a little below the most the stock can give. In year 15 the young fish fail and the stock loses half. With the same catch, what happens next?',
    options: ['It recovers within a few years', 'It settles lower but holds', 'It collapses'],
    answer: 2,
    sliders: [es],
    buttons: [...rules.buttons, ...sw.buttons],
    after: () => paint(),
  });
  paint();
  return f.node;
});
