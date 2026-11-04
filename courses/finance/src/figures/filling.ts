// Lesson 10, Filling the low brackets: what a Roth conversion costs in a
// year when a couple lives on gains from a taxable account, as the
// conversion grows; and the lifetime tax of one household under different
// amounts of filling.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small, still } from 'didactics/draw';
import { runHousehold, type Household, type Strategy } from '../engine/household';
import { RULES } from '../engine/rules';
import { federalTax } from '../engine/tax';
import { axes, COL, figure, frame, guessFirst, k, pct, slider, usd } from './kit';

const W = 400;
const J = { status: 'joint' as const };

/** The extra federal tax a conversion of `c` adds to a year with `gains` of long-term gains. */
export const conversionCost = (c: number, gains: number) => federalTax({ pretax: c, gains }, J).total - federalTax({ gains }, J).total;

export const fillFigure = figure(['fill'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let c = 100_000;
  let gains = 40_000;
  let lowGains = false;
  let highGains = false;
  const max = 250_000;
  const paint = () => {
    const a = axes({ x: 44, y: 18, w: 340, h: 100, xmin: 0, xmax: max, ymin: 0, ymax: 60_000, xticks: [], yticks: [0, 20_000, 40_000, 60_000], yfmt: k, ylabel: 'federal tax the conversion adds', ink: COL.ink, grid: COL.grid });
    const b = axes({ x: 44, y: 146, w: 340, h: 60, xmin: 0, xmax: max, ymin: 0, ymax: 0.4, xticks: [0, 50_000, 100_000, 150_000, 200_000], yticks: [0, 0.2, 0.4], xfmt: k, yfmt: (v) => pct(v, 0), xlabel: 'Roth conversion this year', ylabel: 'rate on the next $1,000 converted', ink: COL.ink, grid: COL.grid });
    const pts: [number, number][] = [];
    const rate: [number, number][] = [];
    for (let x = 0; x <= max; x += 1000) {
      pts.push([x, conversionCost(x, gains)]);
      const r = (conversionCost(x + 1000, gains) - conversionCost(x, gains)) / 1000;
      rate.push([x, r], [x + 1000, r]);
    }
    const cost = conversionCost(c, gains);
    const now = (conversionCost(c + 1000, gains) - cost) / 1000;
    const top12 = RULES.federal.brackets.joint[2][0] + RULES.federal.standardDeduction.joint;
    redraw(g, ...a.parts, ...b.parts,
      a.path(pts, COL.tax, 2.4),
      b.path(rate, COL.pretax, 1.8),
      line(a.X(top12), 18, a.X(top12), 206, COL.ink, 0.8, { 'stroke-dasharray': '2 3' }),
      small(a.X(top12) + 3, 28, 'top of 12%', { soft: true }),
      line(a.X(c), a.Y(0), a.X(c), a.Y(cost), COL.spending, 1, { 'stroke-dasharray': '2 2' }),
      svg('circle', { cx: a.X(c), cy: a.Y(Math.min(60_000, cost)), r: 4.5, fill: COL.spending }),
      label(a.X(c) + (c > 180_000 ? -6 : 6), a.Y(Math.min(60_000, cost)) - 6, usd(cost), { bold: true, fill: COL.spending, ...(c > 180_000 ? { anchor: 'end' as const } : {}) }),
      note(44, 246, `A couple living on ${k(gains)} of long-term gains, plus the conversion`, { soft: true }),
    );
    if (!open()) return;
    if (gains <= 10_000) lowGains = true;
    if (gains >= 80_000) highGains = true;
    f.readout.textContent = `Converting ${k(c)} with ${k(gains)} of gains: ${usd(cost)} of extra tax, ${pct(c ? cost / c : 0, 1)} of the conversion. The next $1,000 would cost ${usd(now * 1000)}`
      + (now > 0.2 && c + RULES.federal.standardDeduction.joint < top12 ? ', more than the 12 percent bracket, because it pushes gains out of the 0 percent band.' : '.')
      + (lowGains && highGains ? ' The gains and the conversion compete for the same low brackets.' : ' Now change the gains.');
    if (lowGains && highGains) t.done();
  };
  const sC = slider('Conversion', 0, max, 5_000, c, k, (v) => { c = v; paint(); }, 'pretax');
  const sG = slider('Gains realised', 0, 120_000, 5_000, gains, k, (v) => { gains = v; paint(); }, 'gains');
  f.controls.append(sC.node, sG.node);
  const open = guessFirst(t, f, {
    ask: 'A married couple lives on sales from a taxable account that realise $40,000 of long-term gains. They also convert $100,000 from an IRA to a Roth. How much federal tax does the conversion add?',
    options: ['About $7,600', 'About $9,000', 'About $12,000'],
    answer: 1,
    sliders: [sC, sG],
    after: () => paint(),
  });
  paint();
  return f.node;
});

/** The sample household for the lifetime comparisons in lessons 10 to 12. */
export const SAMPLE: Household = {
  status: 'joint', people: 2, age: 60, until: 95, spending: 80_000,
  accounts: { taxable: 600_000, basis: 400_000, pretax: 1_200_000, rothOpen: 200_000, rothGrowth: 0 },
  ss: 50_000, claimAge: 67, benchmark: 15_600, returns: 0.04,
};

export const FILL_PLANS: readonly { name: string; strategy: Strategy }[] = [
  { name: 'No filling: taxable, then pre-tax, then Roth', strategy: { kind: 'textbook' } },
  { name: 'Fill to the top of 12%', strategy: { kind: 'fill', top: RULES.federal.brackets.joint[2][0] } },
  { name: 'Fill to the top of 22%', strategy: { kind: 'fill', top: RULES.federal.brackets.joint[3][0] } },
];

export const lifetimeStill = () => {
  const s = still(W, 222);
  const runs = FILL_PLANS.map((p) => ({ ...p, run: runHousehold(SAMPLE, p.strategy) }));
  const max = 400_000;
  const X = (v: number) => 20 + (v / max) * 330;
  const parts: SVGElement[] = [note(20, 16, 'Federal tax over 36 years, ages 60 to 95, in today’s dollars', { bold: true })];
  runs.forEach((r, i) => {
    const y = 30 + i * 56;
    parts.push(small(20, y + 8, r.name, { bold: true }));
    parts.push(svg('rect', { x: 20, y: y + 13, width: X(r.run.lifetimeTax) - 20, height: 18, rx: 3, fill: i ? COL.roth : COL.tax }));
    parts.push(label(X(r.run.lifetimeTax) + 5, y + 27, k(r.run.lifetimeTax), { bold: true }));
    const peak = Math.max(...r.run.rows.map((row) => row.tax));
    parts.push(small(20, y + 43, `largest single year ${k(peak)}; left at 95 after tax ${k(r.run.afterTaxEnd)}`, { soft: true }));
  });
  parts.push(small(20, 202, 'Sample couple: $600k taxable, $1.2M pre-tax, $200k Roth,', { soft: true }), small(20, 215, '$80k spending, $50k Social Security at 67, 4% real return', { soft: true }));
  s.svg.append(...parts);
  return { node: s.node };
};
