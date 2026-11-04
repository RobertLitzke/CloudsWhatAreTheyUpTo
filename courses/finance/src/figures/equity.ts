// Branch E, equity pay: the gap between the 22 percent withheld on vesting
// shares and the tax they actually add; and the AMT on exercising incentive
// stock options and holding the shares.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { RULES } from '../engine/rules';
import { amt, federalTax } from '../engine/tax';
import { COL, figure, frame, guessFirst, k, pct, slider, usd } from './kit';
import { pick } from './plot';

const W = 400;

/** The federal income tax a vest of RSUs adds, what is withheld from it at the flat rates, and the shortfall. */
export function rsuGap(salary: number, vest: number, joint: boolean): { owed: number; withheld: number; gap: number } {
  const status = joint ? 'joint' : 'single';
  const owed = federalTax({ wages: salary + vest }, { status }).total - federalTax({ wages: salary }, { status }).total;
  const w = RULES.federal.withholding;
  const withheld = w.supplemental * Math.min(vest, 1_000_000) + w.over1M * Math.max(0, vest - 1_000_000);
  return { owed, withheld, gap: owed - withheld };
}

function twoBars(rows: [string, string, number, string][], max: number, left: number): SVGElement[] {
  const X = (v: number) => left + (v / max) * (320 - left);
  const out: SVGElement[] = [];
  rows.forEach(([name, sub, v, c], i) => {
    const y = 30 + i * 46;
    out.push(small(left - 6, y + 10, name, { anchor: 'end', bold: true }), small(left - 6, y + 22, sub, { anchor: 'end', soft: true }));
    out.push(svg('rect', { x: left, y, width: Math.max(1, X(v) - left), height: 24, rx: 3, fill: c }));
    out.push(label(X(v) + 5, y + 17, usd(v), { bold: true, fill: c }));
  });
  out.push(line(left, 128, 320, 128, COL.ink, 1), small(left, 142, '$0', { anchor: 'middle', soft: true }), small(320, 142, k(max), { anchor: 'middle', soft: true }));
  return out;
}

export const rsuFigure = figure(['rsu-gap'], (_ctx, t) => {
  const f = frame(W, 176, 3);
  const g = svg('g');
  f.svg.append(g);
  let salary = 250_000;
  let vest = 150_000;
  let joint = false;
  const seen = new Set<string>();
  const paint = () => {
    const r = rsuGap(salary, vest, joint);
    const max = Math.max(50_000, Math.ceil(Math.max(r.owed, r.withheld) / 50_000) * 50_000);
    redraw(g,
      note(10, 16, `${usd(vest)} of shares vesting on a ${k(salary)} salary, ${joint ? 'married' : 'single'}`, { bold: true }),
      ...twoBars([
        ['Withheld', '22% flat', r.withheld, COL.soft],
        ['Tax it adds', 'at the real brackets', r.owed, COL.tax],
      ], max, 120),
      small(10, 166, 'Federal income tax only; Social Security and Medicare are withheld separately.', { soft: true }),
    );
    seen.add(r.gap > 5_000 ? 'gap' : 'none');
    f.readout.textContent = r.gap > 0
      ? `The vest adds ${usd(r.owed)} of tax, ${pct(r.owed / vest, 0)} of it, but only ${usd(r.withheld)} is withheld: ${usd(r.gap)} is still owed in April, unless paid during the year.`
      : `Here 22 percent withheld covers the tax the vest adds (${usd(r.owed)}), so nothing extra is owed.`;
    if (seen.size >= 2) t.done();
  };
  const chips = pick(['Single', 'Married'], 0, (i) => { joint = i === 1; paint(); });
  const sS = slider('Salary', 50_000, 500_000, 10_000, salary, k, (v) => { salary = v; paint(); }, 'wages');
  const sV = slider('Shares vesting', 10_000, 600_000, 10_000, vest, k, (v) => { vest = v; paint(); }, 'gains');
  f.controls.append(chips.node, sS.node, sV.node);
  paint();
  return f.node;
});

export const amtFigure = figure(['amt'], (_ctx, t) => {
  const f = frame(W, 176, 3);
  const g = svg('g');
  f.svg.append(g);
  let wages = 300_000;
  let spread = 100_000;
  const seen = new Set<string>();
  const paint = () => {
    const r = amt(wages, spread, 'joint');
    const max = Math.max(50_000, Math.ceil(Math.max(r.regular, r.tentative) / 50_000) * 50_000);
    redraw(g,
      note(10, 16, `A couple earning ${k(wages)} exercise options with a ${k(spread)} spread`, { bold: true }),
      ...twoBars([
        ['Regular tax', 'the spread isn’t counted', r.regular, COL.taxable],
        ['Minimum tax', 'the spread counted', r.tentative, r.amt > 0 ? COL.bad : COL.soft],
      ], max, 140),
      small(10, 166, 'They pay the larger. 2026 AMT exemption $140,200 for a couple, at 26 and 28 percent.', { soft: true }),
    );
    if (!open()) return;
    seen.add(r.amt > 0 ? 'amt' : 'none');
    f.readout.textContent = r.amt > 0
      ? `The AMT adds ${usd(r.amt)} this year, ${pct(r.amt / spread, 0)} of the spread, though no shares were sold. Much of it comes back later as a credit.`
      : `No AMT: the minimum tax, ${usd(r.tentative)}, is below the regular tax. This much spread can be exercised this year without paying more.`;
    if (seen.size >= 2) t.done();
  };
  const sW = slider('Wages', 100_000, 800_000, 10_000, wages, k, (v) => { wages = v; paint(); }, 'wages');
  const sP = slider('Spread at exercise', 0, 500_000, 5_000, spread, k, (v) => { spread = v; paint(); }, 'gains');
  f.controls.append(sW.node, sP.node);
  const open = guessFirst(t, f, {
    ask: 'A married couple earning $300,000 exercise incentive stock options worth $100,000 more than the exercise price, and keep the shares. What extra federal tax do they owe for the year?',
    options: ['None: nothing was sold', 'About $18,000', 'About $37,000'],
    answer: 1,
    sliders: [sW, sP],
    after: () => paint(),
  });
  paint();
  return f.node;
});
