// Lesson 11, Health insurance before 65: what a couple pays for the
// benchmark marketplace plan as their income (MAGI) rises, and the combined
// rate of federal tax and lost premium credit on the next $1,000.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { RULES } from '../engine/rules';
import { aca, federalTax } from '../engine/tax';
import { axes, COL, figure, frame, guessFirst, k, pct, slider, tint, usd } from './kit';

const W = 400;
const PEOPLE = 2;

/** Net premium plus federal tax for a couple whose whole MAGI is ordinary income. */
export const healthAndTax = (magi: number, benchmark: number) =>
  aca(magi, PEOPLE, benchmark).net + federalTax({ pretax: magi }, { status: 'joint' }).total;

export const acaFigure = figure(['aca'], (_ctx, t) => {
  const f = frame(W, 262, 3);
  const g = svg('g');
  f.svg.append(g);
  let magi = 60_000;
  let benchmark = 24_000;
  let crossed = false;
  let under = false;
  const max = 120_000;
  const line400 = RULES.aca.povertyLine['2'] * RULES.aca.cliff;
  const line138 = RULES.aca.povertyLine['2'] * RULES.aca.medicaidBelow;
  const paint = () => {
    const a = axes({ x: 46, y: 20, w: 338, h: 100, xmin: 0, xmax: max, ymin: 0, ymax: 30_000, xticks: [], yticks: [0, 10_000, 20_000, 30_000], yfmt: k, ylabel: 'what the couple pays for the benchmark plan', ink: COL.ink, grid: COL.grid });
    const b = axes({ x: 46, y: 150, w: 338, h: 70, xmin: 0, xmax: max, ymin: 0, ymax: 0.6, xticks: [0, 20_000, 40_000, 60_000, 80_000, 100_000], yticks: [0, 0.2, 0.4, 0.6], xfmt: k, yfmt: (v) => pct(v, 0), xlabel: 'household income (MAGI)', ylabel: 'tax plus premium on the next $1,000', ink: COL.ink, grid: COL.grid });
    const net: [number, number][] = [];
    const rate: [number, number][] = [];
    for (let m = 0; m <= max; m += 500) {
      net.push([m, aca(m, PEOPLE, benchmark).net]);
      const r = (healthAndTax(m + 1000, benchmark) - healthAndTax(m, benchmark)) / 1000;
      if (Math.abs(m + 1000 - line400) < 1000 || m + 1000 > line400 && m < line400) continue;
      rate.push([m, Math.min(0.6, r)]);
    }
    const now = aca(magi, PEOPLE, benchmark);
    const next = (healthAndTax(magi + 1000, benchmark) - healthAndTax(magi, benchmark));
    redraw(g,
      svg('rect', { x: a.X(0), y: 20, width: a.X(line138) - a.X(0), height: 200, fill: tint(COL.good, 0.1) }),
      small(a.X(line138 / 2), 32, 'Medicaid', { anchor: 'middle', fill: COL.good }),
      ...a.parts, ...b.parts,
      a.path(net, COL.health, 2.4),
      b.path(rate, COL.tax, 1.8),
      line(a.X(line400), 20, a.X(line400), 220, COL.bad, 1, { 'stroke-dasharray': '3 2' }),
      small(a.X(line400) - 3, 32, `400%: ${k(line400)}`, { anchor: 'end', fill: COL.bad, bold: true }),
      line(a.X(magi), a.Y(0), a.X(magi), a.Y(now.net), COL.spending, 1, { 'stroke-dasharray': '2 2' }),
      svg('circle', { cx: a.X(magi), cy: a.Y(now.net), r: 4.5, fill: COL.spending }),
      label(a.X(magi) + (magi > 90_000 ? -6 : 6), a.Y(now.net) - 7, usd(now.net), { bold: true, fill: COL.spending, ...(magi > 90_000 ? { anchor: 'end' as const } : {}) }),
      note(46, 256, `A couple, benchmark plan ${k(benchmark)} a year; 2026 rules`, { soft: true }),
    );
    if (!open()) return;
    if (magi > line400) crossed = true;
    if (magi <= line400 && magi > line138) under = true;
    f.readout.textContent = `At ${k(magi)}, ${pct(now.multiple, 0).replace('%', '')} percent of the poverty line: `
      + (now.zone === 'medicaid' ? 'eligible for Medicaid instead of a marketplace credit. ' : now.zone === 'cliff' ? `no credit at all; the couple pays the full ${usd(benchmark)}. ` : `the couple pays ${usd(now.net)}, and the credit pays ${usd(now.credit)}. `)
      + (Math.abs(magi - line400) <= 2_500 && magi <= line400 ? `The next $1,000 of income would cost ${usd(next)} in tax and lost credit.` : `The next $1,000 of income costs ${usd(next)} in tax and premium.`);
    if (crossed && under) t.done();
  };
  const sM = slider('Income (MAGI)', 20_000, max, 1_000, magi, k, (v) => { magi = v; paint(); }, 'pretax');
  const sB = slider('Benchmark plan', 12_000, 36_000, 1_000, benchmark, k, (v) => { benchmark = v; paint(); }, 'health');
  f.controls.append(sM.node, sB.node);
  const open = guessFirst(t, f, {
    ask: 'A couple of 60 pays for a marketplace plan whose benchmark costs $24,000 a year. Their income rises from $84,000 to $85,000. What happens to what they pay for health insurance in 2026?',
    options: ['It rises by about $100', 'It rises by about $1,000', 'It rises by about $16,000'],
    answer: 2,
    sliders: [sM, sB],
    after: () => paint(),
  });
  paint();
  return f.node;
});
