// Lesson 8, Four buckets: $10,000 of pay put into each kind of account,
// grown for some years and spent, by the tax rate on the way in and on the
// way out; and the average rate on pre-tax withdrawals for a couple.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small, still } from 'didactics/draw';
import { federalTax } from '../engine/tax';
import { axes, COL, figure, frame, guessFirst, k, pct, slider, usd } from './kit';

const W = 400;
const PAY = 10_000;

export interface Buckets {
  pretax: number;
  roth: number;
  taxable: number;
  hsa: number;
}

/**
 * What $10,000 of pay becomes as spending money after `years`, at real return `r`,
 * with tax rate `now` on the way in and `later` on pre-tax money on the way out.
 * The taxable account pays tax each year on dividends of `yieldRate` at `gainsRate`,
 * and on the gain at the end at `gainsRate`.
 */
export function buckets(now: number, later: number, years: number, r = 0.05, gainsRate = 0.15, yieldRate = 0.02): Buckets {
  const grow = (1 + r) ** years;
  const pretax = PAY * grow * (1 - later);
  const roth = PAY * (1 - now) * grow;
  const hsa = PAY * grow;
  // Taxable: dividends taxed as they come; the rest grows untaxed until sold.
  let bal = PAY * (1 - now);
  let basis = bal;
  for (let i = 0; i < years; i++) {
    const div = bal * yieldRate;
    const tax = div * gainsRate;
    bal = bal * (1 + r) - tax;
    basis += div - tax; // reinvested dividends add to the basis
  }
  const taxable = bal - Math.max(0, bal - basis) * gainsRate;
  return { pretax, roth, taxable, hsa };
}

const ROWS: readonly { key: keyof Buckets; name: string; color: string; how: string }[] = [
  { key: 'pretax', name: 'Pre-tax (traditional 401(k), IRA)', color: COL.pretax, how: 'no tax in, taxed out' },
  { key: 'roth', name: 'Roth 401(k) or IRA', color: COL.roth, how: 'taxed in, free out' },
  { key: 'taxable', name: 'Taxable brokerage', color: COL.taxable, how: 'taxed in, gains taxed' },
  { key: 'hsa', name: 'HSA, spent on health care', color: COL.hsa, how: 'free in, free out' },
];

export const bucketsFigure = figure(['buckets'], (_ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  let now = 0.22;
  let later = 0.12;
  let years = 20;
  let matched = false;
  let lowered = false;
  const paint = () => {
    const b = buckets(now, later, years);
    const max = Math.max(30_000, Math.ceil(b.hsa / 10_000) * 10_000);
    const a = axes({ x: 150, y: 16, w: 230, h: 160, xmin: 0, xmax: max, ymin: 0, ymax: 4, xticks: [0, max / 2, max], yticks: [], xfmt: k, ink: COL.ink, grid: COL.grid });
    const parts: SVGElement[] = [...a.parts];
    ROWS.forEach((row, i) => {
      const y = 22 + i * 40;
      parts.push(small(144, y + 10, row.name, { anchor: 'end', bold: true }));
      parts.push(small(144, y + 22, row.how, { anchor: 'end', soft: true }));
      parts.push(svg('rect', { x: 150, y, width: a.X(b[row.key]) - 150, height: 22, rx: 3, fill: row.color }));
      parts.push(label(a.X(b[row.key]) + 4, y + 15, k(b[row.key]), { bold: true, fill: row.color }));
    });
    parts.push(line(a.X(b.roth), 16, a.X(b.roth), 176, COL.roth, 1, { 'stroke-dasharray': '2 3' }));
    parts.push(note(10, 206, `$10,000 of pay, ${years} years at 5% after inflation, then spent`, { soft: true }));
    redraw(g, ...parts);
    if (!open()) return;
    const ratio = b.pretax / b.roth;
    f.readout.textContent = `${pct(now, 0)} on the way in, ${pct(later, 0)} on pre-tax money on the way out: pre-tax leaves ${usd(b.pretax)} to spend, Roth ${usd(b.roth)}. `
      + (Math.abs(ratio - 1) < 0.005 ? 'Equal rates, equal results: the growth is the same in both, and so is the tax, just paid at a different time.'
        : ratio > 1 ? `Pre-tax wins by ${pct(ratio - 1, 0)}, because the rate out is lower than the rate in.` : `Roth wins by ${pct(1 / ratio - 1, 0)}, because the rate out is higher than the rate in.`);
    if (Math.abs(now - later) < 0.005) matched = true;
    if (later < 0.05) lowered = true;
    if (matched && lowered) t.done();
  };
  const sN = slider('Rate in (now)', 0.1, 0.37, 0.01, now, (v) => pct(v, 0), (v) => { now = v; paint(); }, 'roth');
  const sL = slider('Rate out (later)', 0, 0.37, 0.01, later, (v) => pct(v, 0), (v) => { later = v; paint(); }, 'pretax');
  const sY = slider('Years', 5, 40, 1, years, (v) => `${v} years`, (v) => { years = v; paint(); }, 'balance');
  f.controls.append(sN.node, sL.node, sY.node);
  const open = guessFirst(t, f, {
    ask: 'Someone pays 22 percent on their last dollars of pay now and expects to pay 12 percent on withdrawals later. Which leaves more to spend, the same $10,000 of pay put into a pre-tax account or a Roth?',
    options: ['The Roth', 'Pre-tax, by about an eighth', 'They come out the same'],
    answer: 1,
    sliders: [sN, sL, sY],
    after: () => paint(),
  });
  paint();
  return f.node;
});

/** A couple's average federal rate on pre-tax withdrawals of each size, with no other income. */
export function averageOut(max = 200_000, step = 2_000): [number, number][] {
  const out: [number, number][] = [];
  for (let x = step; x <= max; x += step) out.push([x, federalTax({ pretax: x }, { status: 'joint' }).total / x]);
  return out;
}

export const rateOutStill = () => {
  const f = still(W, 222);
  const a = axes({ x: 40, y: 20, w: 344, h: 140, xmin: 0, xmax: 200_000, ymin: 0, ymax: 0.25, xticks: [0, 50_000, 100_000, 150_000], yticks: [0, 0.05, 0.1, 0.15, 0.2, 0.25], xfmt: k, yfmt: (v) => pct(v, 0), xlabel: 'pre-tax withdrawals in a year (a couple, no other income)', ylabel: 'federal tax as a share of the withdrawal', ink: COL.ink, grid: COL.grid });
  const pts = averageOut();
  const mark = (x: number) => {
    const r = federalTax({ pretax: x }, { status: 'joint' }).total / x;
    return [svg('circle', { cx: a.X(x), cy: a.Y(r), r: 4, fill: COL.pretax }), small(a.X(x) + 4, a.Y(r) + 16, `${k(x)}: ${pct(r, 1)}`, { fill: COL.pretax, bold: true })];
  };
  f.svg.append(...a.parts, a.path(pts, COL.pretax, 2.4), ...mark(60_000), ...mark(100_000), ...mark(150_000),
    line(a.X(0), a.Y(0.22), a.X(200_000), a.Y(0.22), COL.roth, 1.2, { 'stroke-dasharray': '4 3' }),
    small(a.X(200_000), a.Y(0.22) - 5, 'a 22% rate saved on the way in', { anchor: 'end', fill: COL.roth }),
    note(40, 218, 'Federal income tax only, 2026 rules, standard deduction', { soft: true }));
  return { node: f.node };
};
