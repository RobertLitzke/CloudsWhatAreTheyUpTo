// Lesson 14, Build the plan: one household from the age it stops work to 95,
// with its taxes, health premiums, conversions and Social Security, run
// through every stretch of US market history long enough to cover it.

import { svg } from 'didactics/dom';
import { line, note, redraw, small } from 'didactics/draw';
import { realSeries, starts } from '../engine/history';
import { runHousehold, totalOf, type Household, type Run, type Strategy } from '../engine/household';
import { RULES } from '../engine/rules';
import { axes, COL, figure, frame, k, slider, tint } from './kit';
import { pick } from './plot';

const W = 400;
const UNTIL = 95;
const STOCKS = 0.7;
const top12 = RULES.federal.brackets.joint[2][0];
const cliff = RULES.aca.povertyLine['2'] * RULES.aca.cliff;

export const CAP_PLANS: readonly { short: string; strategy: Strategy }[] = [
  { short: 'Taxable first', strategy: { kind: 'textbook' } },
  { short: 'Fill 12%', strategy: { kind: 'fill', top: top12 } },
  { short: 'ACA, then 12%', strategy: { kind: 'aca', magi: cliff - 500, top: top12 } },
];

export interface CapInput {
  stop: number;
  spending: number;
  pretax: number;
  taxable: number;
  plan: number;
}

export const capHousehold = (c: CapInput, returns: readonly number[]): Household => ({
  status: 'joint', people: 2, age: c.stop, until: UNTIL, spending: c.spending,
  accounts: { taxable: c.taxable, basis: c.taxable * 0.65, pretax: c.pretax, rothOpen: 100_000, rothGrowth: 0 },
  ss: 55_800, claimAge: 70, benchmark: 24_000, returns,
});

/** The household through every start with enough history. */
export function stressTest(c: CapInput): { start: number; run: Run }[] {
  const years = UNTIL - c.stop + 1;
  return starts(years).map((s) => ({ start: s, run: runHousehold(capHousehold(c, realSeries(s, years, STOCKS)), CAP_PLANS[c.plan].strategy) }));
}

export const capstoneFigure = figure(['capstone'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  const c: CapInput = { stop: 50, spending: 80_000, pretax: 1_300_000, taxable: 700_000, plan: 2 };
  let sawShort = false;
  let sawSafe = false;
  const paint = () => {
    const runs = stressTest(c);
    const top = 8_000_000;
    const a = axes({ x: 46, y: 20, w: 338, h: 170, xmin: c.stop, xmax: UNTIL + 1, ymin: 0, ymax: top, xticks: [45, 55, 65, 75, 85, 95].filter((x) => x >= c.stop), yticks: [0, 2_000_000, 4_000_000, 6_000_000, 8_000_000], yfmt: k, xlabel: 'age', ylabel: 'all accounts together, today’s dollars', ink: COL.ink, grid: COL.grid });
    const lines: SVGElement[] = [];
    const bad = runs.filter((r) => r.run.shortAt >= 0);
    for (const r of runs) {
      if (r.run.shortAt >= 0) continue;
      lines.push(a.path(r.run.rows.map((row) => [row.age + 1, Math.min(top * 1.02, totalOf(row.end))] as const), tint(COL.balance, 0.22), 1));
    }
    for (const r of bad) lines.push(a.path(r.run.rows.map((row) => [row.age + 1, totalOf(row.end)] as const), COL.bad, 1.4));
    redraw(g, ...a.parts, ...lines,
      line(a.X(65), 20, a.X(65), 190, COL.ink, 0.8, { 'stroke-dasharray': '2 3' }), small(a.X(65) + 3, 30, 'Medicare', { soft: true }),
      line(a.X(70), 20, a.X(70), 190, COL.ink, 0.8, { 'stroke-dasharray': '2 3' }), small(a.X(70) + 3, 42, 'Social Security', { soft: true }),
      note(46, 230, `Each line one start year, ${runs[0].start} to ${runs[runs.length - 1].start}; red ran short. ${Math.round(STOCKS * 100)}% shares.`, { soft: true }),
    );
    const sorted = (xs: number[]) => xs.sort((p, q) => p - q);
    const tax = sorted(runs.map((r) => r.run.lifetimeTax + r.run.lifetimeHealth));
    const ends = sorted(runs.map((r) => r.run.afterTaxEnd));
    if (bad.length) sawShort = true;
    else sawSafe = true;
    const savings = c.pretax + c.taxable + 100_000;
    f.readout.textContent = `Stopping at ${c.stop} with ${k(savings)}, spending ${k(c.spending)} (${(100 * c.spending / savings).toFixed(1)}% of savings): `
      + (bad.length ? `${bad.length} of ${runs.length} starts ran short, the first from ${bad[0].start}. ` : `every one of ${runs.length} starts lasted to ${UNTIL}. `)
      + `Typical tax and income-linked premiums ${k(tax[tax.length >> 1])} over the whole plan; typical after-tax estate at ${UNTIL}, ${k(ends[ends.length >> 1])}.`;
    if (sawShort && sawSafe) t.done();
  };
  const chips = pick(CAP_PLANS.map((p) => p.short), c.plan, (i) => { c.plan = i; paint(); });
  const sStop = slider('Stop work at', 45, 62, 1, c.stop, String, (v) => { c.stop = v; paint(); }, 'balance');
  const sSpend = slider('Spending', 40_000, 150_000, 5_000, c.spending, k, (v) => { c.spending = v; paint(); }, 'spending');
  const sPre = slider('Pre-tax savings', 0, 3_000_000, 100_000, c.pretax, k, (v) => { c.pretax = v; paint(); }, 'pretax');
  const sTax = slider('Taxable savings', 0, 2_000_000, 50_000, c.taxable, k, (v) => { c.taxable = v; paint(); }, 'taxable');
  f.controls.append(chips.node, sStop.node, sSpend.node, sPre.node, sTax.node);
  paint();
  return f.node;
});
