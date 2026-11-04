// Lesson 1, Why the savings rate beats the return: years until savings can
// cover spending, as the share of income saved, the real return and the
// withdrawal rate change; and why the size of the income drops out.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, k, legend, pct, slider } from './kit';

const W = 400;

/**
 * Years of saving `s` of take-home pay (spending the rest) until the pile can pay
 * that spending at withdrawal rate `w`, earning real return `r`, from nothing.
 * Contributions come in at the end of each year.
 */
export function yearsToEnough(s: number, r: number, w: number): number {
  if (s <= 0) return Infinity;
  if (s >= 1) return 0;
  const target = (1 - s) / w; // in years of take-home pay
  if (Math.abs(r) < 1e-9) return target / s;
  return Math.log(1 + (target * r) / s) / Math.log(1 + r);
}

/** The pile, in years of take-home pay, after each year of saving. */
export function pile(s: number, r: number, years: number): number[] {
  const out = [0];
  let b = 0;
  for (let t = 0; t < years; t++) {
    b = b * (1 + r) + s;
    out.push(b);
  }
  return out;
}

const yearsText = (n: number) => (n === Infinity ? 'never' : n < 1 ? 'under a year' : `${n.toFixed(1)} years`);

export const yearsFigure = figure(['sooner'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let s = 0.5;
  let r = 0.05;
  let w = 0.04;
  let moved = false;
  const paint = () => {
    const a = axes({ x: 44, y: 26, w: 330, h: 170, xmin: 0, xmax: 0.9, ymin: 0, ymax: 60, xticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], yticks: [0, 10, 20, 30, 40, 50, 60], xfmt: (v) => `${Math.round(v * 100)}%`, xlabel: 'share of take-home pay saved', ylabel: 'years until savings cover spending', ink: COL.ink, grid: COL.grid });
    const curve = (rr: number, ww: number) => {
      const pts: [number, number][] = [];
      for (let x = 0.03; x <= 0.9001; x += 0.01) pts.push([x, Math.min(61, yearsToEnough(x, rr, ww))]);
      return pts;
    };
    const n = yearsToEnough(s, r, w);
    const base = r !== 0.05 || w !== 0.04;
    redraw(g,
      ...a.parts,
      ...(base ? [a.path(curve(0.05, 0.04), COL.soft, 1.4, { 'stroke-dasharray': '4 3' })] : []),
      a.path(curve(r, w), COL.balance, 2.4),
      line(a.X(s), a.Y(0), a.X(s), a.Y(Math.min(60, n)), COL.spending, 1, { 'stroke-dasharray': '2 2' }),
      svg('circle', { cx: a.X(s), cy: a.Y(Math.min(60, n)), r: 5, fill: COL.spending }),
      label(a.X(s) + 8, a.Y(Math.min(60, n)) - 8, yearsText(n), { bold: true, fill: COL.spending }),
      ...legend(44, 232, [{ text: `${pct(r, 0)} real return, ${pct(w, 1)} withdrawals`, color: COL.balance }, ...(base ? [{ text: '5% and 4%', color: COL.soft, dash: true }] : [])]),
    );
    if (!open()) return;
    const a50 = yearsToEnough(0.5, r, w);
    const a60 = yearsToEnough(0.6, r, w);
    const a10 = yearsToEnough(0.1, r, w);
    const a20 = yearsToEnough(0.2, r, w);
    f.readout.textContent = `Saving ${pct(s, 0)} of take-home pay: ${yearsText(n)}. `
      + `Here, going from 10% to 20% saves ${(a10 - a20).toFixed(0)} years, and from 50% to 60% saves ${(a50 - a60).toFixed(1)}. `
      + (moved ? `A point of return moves the curve far less than ten points of saving moves you along it.` : `Now move the return and the withdrawal rate.`);
    if (moved) t.done();
  };
  const sS = slider('Saved', 0.05, 0.85, 0.01, s, (v) => pct(v, 0), (v) => { s = v; paint(); }, 'spending');
  const sR = slider('Real return', 0.02, 0.07, 0.005, r, (v) => pct(v, 1), (v) => { r = v; moved = true; paint(); }, 'stocks');
  const sW = slider('Withdrawal rate', 0.03, 0.05, 0.0025, w, (v) => pct(v, 2), (v) => { w = v; moved = true; paint(); }, 'balance');
  f.controls.append(sS.node, sR.node, sW.node);
  const open = guessFirst(t, f, {
    ask: 'At a 5 percent real return and 4 percent withdrawals, saving half your take-home pay takes about 17 years. How much sooner if you save 60 percent instead?',
    options: ['About a year', 'About four years', 'About eight years'],
    answer: 1,
    sliders: [sS, sR, sW],
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const incomeFigure = figure(['income'], (_ctx, t) => {
  const f = frame(W, 230, 2);
  const g = svg('g');
  f.svg.append(g);
  let pay = 80_000;
  let s = 0.3;
  const r = 0.05;
  const w = 0.04;
  const firstPay = pay;
  const paint = () => {
    const n = yearsToEnough(s, r, w);
    const span = 45;
    const p = pile(s, r, span).map((v) => v * pay);
    const target = ((1 - s) * pay) / w;
    const top = 5_000_000;
    const a = axes({ x: 54, y: 22, w: 320, h: 160, xmin: 0, xmax: span, ymin: 0, ymax: top, xticks: [0, 10, 20, 30, 40], yticks: [0, top / 2, top], yfmt: k, xlabel: 'years of saving', ylabel: 'savings, today’s dollars', ink: COL.ink, grid: COL.grid });
    const cut = Math.min(span, Math.ceil(n));
    redraw(g,
      ...a.parts,
      line(a.X(0), a.Y(target), a.X(span), a.Y(target), COL.spending, 1.6, { 'stroke-dasharray': '5 3' }),
      small(a.X(span) - 2, a.Y(target) - 5, `enough: ${k(target)}`, { anchor: 'end', fill: COL.spending }),
      a.path(p.slice(0, cut + 1).map((v, i) => [i, v] as const), COL.balance, 2.4),
      ...(n <= span ? [svg('circle', { cx: a.X(n), cy: a.Y(target), r: 4.5, fill: COL.spending })] : []),
      note(60, 214, `Take-home ${k(pay)}: saves ${k(pay * s)} a year, spends ${k(pay * (1 - s))}`, { fill: COL.ink }),
    );
    f.readout.textContent = `Enough after ${yearsText(n)}. `
      + (Math.abs(pay - firstPay) >= 40_000 ? 'A bigger or smaller income moves both lines by the same factor, so where they cross stays put: only the share saved changes the date.' : 'Change the income and watch where the lines cross.');
    if (Math.abs(pay - firstPay) >= 40_000) t.done();
  };
  const sP = slider('Take-home pay', 40_000, 300_000, 5_000, pay, k, (v) => { pay = v; paint(); }, 'wages');
  const sS = slider('Saved', 0.1, 0.7, 0.01, s, (v) => pct(v, 0), (v) => { s = v; paint(); }, 'spending');
  f.controls.append(sP.node, sS.node);
  paint();
  return f.node;
});
