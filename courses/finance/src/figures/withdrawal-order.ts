// Lesson 12, Which account to spend first: the sample couple from lesson 10
// run from 60 to 95 under five orders of withdrawal, year by year; and the
// tax on the next dollar once Social Security starts being taxed.

import { svg } from 'didactics/dom';
import { line, note, redraw, small } from 'didactics/draw';
import { runHousehold, type Strategy } from '../engine/household';
import { RULES } from '../engine/rules';
import { marginalRate } from '../engine/tax';
import { axes, COL, figure, frame, guessFirst, k, pct, slider } from './kit';
import { legend, pick } from './plot';
import { SAMPLE } from './filling';

const W = 400;
const top12 = RULES.federal.brackets.joint[2][0];
const top22 = RULES.federal.brackets.joint[3][0];
const cliff = RULES.aca.povertyLine['2'] * RULES.aca.cliff;

export const ORDERS: readonly { name: string; short: string; strategy: Strategy }[] = [
  { name: 'taxable first, then pre-tax, then Roth', short: 'Taxable first', strategy: { kind: 'textbook' } },
  { name: 'pre-tax first, then taxable, then Roth', short: 'Pre-tax first', strategy: { kind: 'pretax-first' } },
  { name: 'fill to the top of 12% every year', short: 'Fill 12%', strategy: { kind: 'fill', top: top12 } },
  { name: 'fill to the top of 22% every year', short: 'Fill 22%', strategy: { kind: 'fill', top: top22 } },
  { name: 'under the ACA cliff until 65, then fill 12%', short: 'ACA, then 12%', strategy: { kind: 'aca', magi: cliff - 500, top: top12 } },
];

export const orderOfWithdrawalFigure = figure(['withdraw'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let which = 0;
  let pretax = 1_200_000;
  const seen = new Set<number>();
  const paint = () => {
    const h = { ...SAMPLE, accounts: { ...SAMPLE.accounts, pretax } };
    const run = runHousehold(h, ORDERS[which].strategy);
    const a = axes({ x: 44, y: 20, w: 340, h: 160, xmin: 60, xmax: 96, ymin: 0, ymax: 60_000, xticks: [60, 65, 70, 75, 80, 85, 90, 95], yticks: [0, 20_000, 40_000, 60_000], yfmt: k, xlabel: 'age', ylabel: 'federal tax and income-linked health premiums, each year', ink: COL.ink, grid: COL.grid });
    const bw = 340 / 36;
    const bars: SVGElement[] = [];
    for (const r of run.rows) {
      const x = a.X(r.age) + 0.6;
      const tx = Math.min(60_000, r.tax);
      const hl = Math.min(60_000 - tx, r.health);
      bars.push(svg('rect', { x, y: a.Y(tx), width: bw - 1.2, height: a.Y(0) - a.Y(tx), fill: COL.tax }));
      if (hl > 0) bars.push(svg('rect', { x, y: a.Y(tx + hl), width: bw - 1.2, height: a.Y(tx) - a.Y(tx + hl), fill: COL.health }));
    }
    redraw(g, ...a.parts, ...bars,
      line(a.X(75), a.Y(60_000), a.X(75), a.Y(0), COL.ink, 0.8, { 'stroke-dasharray': '2 3' }),
      small(a.X(75) + 3, a.Y(56_000), 'required withdrawals start', { soft: true }),
      line(a.X(67), a.Y(60_000), a.X(67), a.Y(0), COL.ink, 0.8, { 'stroke-dasharray': '2 3' }),
      small(a.X(67) + 3, a.Y(50_000), 'Social Security', { soft: true }),
      ...legend(44, 216, [{ text: 'federal tax', color: COL.tax }, { text: 'ACA premium or Medicare surcharge', color: COL.health }]),
      note(44, 234, `${pretax === SAMPLE.accounts.pretax ? 'The sample couple from lesson 10' : `The sample couple with ${k(pretax)} pre-tax`}, 4% real, today’s dollars`, { soft: true }),
    );
    if (!open()) return;
    seen.add(which);
    f.readout.textContent = `${ORDERS[which].short} (${ORDERS[which].name}): ${k(run.lifetimeTax)} of federal tax and ${k(run.lifetimeHealth)} of income-linked premiums over 36 years; `
      + `${k(run.afterTaxEnd)} left at 95 after the tax still owed on pre-tax money.`;
    if (seen.size >= 4) t.done();
  };
  const chips = pick(ORDERS.map((o) => o.short), which, (i) => { which = i; paint(); });
  const sP = slider('Pre-tax at 60', 400_000, 3_000_000, 100_000, pretax, k, (v) => { pretax = v; paint(); }, 'pretax');
  f.controls.append(chips.node, sP.node);
  const open = guessFirst(t, f, {
    ask: 'Lesson 10’s couple spends the same $80,000 a year from 60 to 95 whichever account they draw on. Which order leaves the most at 95, after the tax still owed on their pre-tax money?',
    options: ['Taxable first, the usual advice', 'Pre-tax accounts first', 'Fill the 22% bracket every year'],
    answer: 1,
    sliders: [sP],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const torpedoFigure = figure(['torpedo'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let ss = 50_000;
  let at = 40_000;
  let found = false;
  const max = 150_000;
  const who = { status: 'joint' as const, over65: 2 };
  const paint = () => {
    const a = axes({ x: 40, y: 20, w: 344, h: 150, xmin: 0, xmax: max, ymin: 0, ymax: 0.45, xticks: [0, 25_000, 50_000, 75_000, 100_000, 125_000], yticks: [0, 0.1, 0.2, 0.3, 0.4], xfmt: k, yfmt: (v) => pct(v, 0), xlabel: 'other income: pre-tax withdrawals, pensions, interest', ylabel: 'federal tax on the next dollar of that income', ink: COL.ink, grid: COL.grid });
    const curve = (s: number) => {
      const out: [number, number][] = [];
      for (let x = 0; x <= max; x += 1000) {
        const m = marginalRate({ pretax: x, ss: s }, 'pretax', who, 1000);
        out.push([x, m], [x + 1000, m]);
      }
      return out;
    };
    const m = marginalRate({ pretax: at, ss }, 'pretax', who, 1000);
    redraw(g, ...a.parts,
      a.path(curve(0), COL.soft, 1.2, { 'stroke-dasharray': '4 3' }),
      a.path(curve(ss), COL.ss, 2.2),
      line(a.X(at), a.Y(0), a.X(at), a.Y(m), COL.pretax, 1, { 'stroke-dasharray': '2 2' }),
      svg('circle', { cx: a.X(at), cy: a.Y(m), r: 4.5, fill: COL.pretax }),
      small(a.X(at) + 6, a.Y(m) - 6, pct(m, 1), { bold: true, fill: COL.pretax }),
      note(40, 214, `A couple over 65 with ${k(ss)} of Social Security; dashed: none`, { soft: true }),
    );
    const dashed = marginalRate({ pretax: at }, 'pretax', who, 1000);
    if (ss > 0 && m > dashed + 0.05) found = true;
    f.readout.textContent = `With ${k(at)} of other income, the next $1,000 costs ${pct(m, 1)} in federal tax`
      + (ss > 0 && m > dashed + 0.03 ? `, against ${pct(dashed, 0)} without Social Security: each extra dollar also makes up to 85 cents of benefits taxable.` : '.');
    if (found) t.done();
  };
  const sA = slider('Other income', 0, max, 1_000, at, k, (v) => { at = v; paint(); }, 'pretax');
  const sS = slider('Social Security', 0, 90_000, 5_000, ss, k, (v) => { ss = v; paint(); }, 'ss');
  f.controls.append(sA.node, sS.node);
  paint();
  return f.node;
});
