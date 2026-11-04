// Branch P, Portugal: Portugal's income tax on a couple's pension income
// against the US federal tax on the same money; and a whole year's income of
// several kinds, taxed by the US alone or by Portugal and the US together.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { RULES } from '../engine/rules';
import { federalTax, portugalPensionTax } from '../engine/tax';
import { COL, figure, frame, guessFirst, k, pct, slider, usd } from './kit';
import { pick } from './plot';

const W = 400;
const FX = RULES.portugal.eurPerDollar;
const eurk = (n: number) => `€${n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n / 1000) + 'k'}`;

/** US federal tax on pension income (pre-tax withdrawals) for a couple or a single person. */
export const usPensionTax = (dollars: number, joint: boolean) => federalTax({ pretax: dollars }, { status: joint ? 'joint' : 'single' }).total;

/** Portugal's tax on the same pension income, in dollars. */
export const ptPensionTaxUsd = (dollars: number, joint: boolean) => portugalPensionTax(dollars * FX, joint) / FX;

export const ptTaxFigure = figure(['pt-tax'], (_ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  let income = 60_000;
  let joint = true;
  const seen = new Set<string>();
  const paint = () => {
    const us = usPensionTax(income, joint);
    const pt = ptPensionTaxUsd(income, joint);
    const max = Math.max(20_000, Math.ceil(Math.max(us, pt) / 10_000) * 10_000);
    const X = (v: number) => 120 + (v / max) * 240;
    const row = (y: number, name: string, sub: string, v: number, color: string) => [
      small(114, y + 10, name, { anchor: 'end', bold: true }),
      small(114, y + 22, sub, { anchor: 'end', soft: true }),
      svg('rect', { x: 120, y, width: Math.max(1, X(v) - 120), height: 24, rx: 3, fill: color }),
      label(X(v) + 5, y + 17, `${usd(v)} (${pct(income ? v / income : 0, 1)})`, { bold: true, fill: color }),
    ];
    redraw(g,
      note(10, 18, `Income tax on ${usd(income)} of IRA and 401(k) withdrawals a year`, { bold: true }),
      ...row(36, 'United States', joint ? 'federal, married jointly' : 'federal, single', us, COL.taxable),
      ...row(84, 'Portugal', joint ? 'IRS, joint filing' : 'IRS, single', pt, COL.portugal),
      line(120, 128, 360, 128, COL.ink, 1),
      small(120, 142, '$0', { anchor: 'middle', soft: true }),
      small(360, 142, k(max), { anchor: 'middle', soft: true }),
      small(10, 166, `In euros: ${eurk(income * FX)} of pension income; Portugal’s tax ${eurk(pt * FX)}.`, { soft: true }),
      small(10, 180, 'Each pensioner’s specific deduction, then the 2026 brackets; no other deductions.', { soft: true }),
      small(10, 194, `Washington has no income tax. Exchange rate about $${(1 / FX).toFixed(2)} to the euro.`, { soft: true }),
    );
    if (!open()) return;
    seen.add(income < 50_000 ? 'low' : income > 120_000 ? 'high' : 'mid');
    f.readout.textContent = `On ${usd(income)}, Portugal takes ${usd(pt)} and the US ${usd(us)}`
      + (pt > us ? `: Portugal's tax is ${(pt / Math.max(1, us)).toFixed(1)} times as large, mostly because its brackets climb much faster.` : '.')
      + ' An American resident in Portugal owes both, less credits, so in practice pays about the larger.';
    if (seen.size >= 2) t.done();
  };
  const chips = pick(['Married couple', 'Single'], 0, (i) => { joint = i === 0; paint(); });
  const sI = slider('Pension income', 20_000, 200_000, 5_000, income, k, (v) => { income = v; paint(); }, 'pretax');
  f.controls.append(chips.node, sI.node);
  const open = guessFirst(t, f, {
    ask: 'A married couple, both retired, live on $60,000 a year of withdrawals from their IRAs. The US federal tax on that is $2,840. If they lived in Portugal, roughly how much would Portugal’s income tax be?',
    options: ['About the same', 'About three times as much', 'About ten times as much'],
    answer: 1,
    sliders: [sI],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

export interface TwoCountries {
  us: number;
  pt: number;
  /** Roughly what a US citizen resident in Portugal pays in all: the larger of the two, as the credits work out. */
  both: number;
}

/** A couple's year: pre-tax withdrawals, long-term gains and dividends, and Social Security, all in dollars. */
export function twoCountries(pretax: number, gains: number, ss: number): TwoCountries {
  const us = federalTax({ pretax, gains, ss }, { status: 'joint' }).total;
  // Portugal: pensions (including, on its tax authority's reading, Social Security) at the progressive rates, investment income at a flat 28 percent.
  const pt = portugalPensionTax((pretax + ss) * FX, true) / FX + RULES.portugal.investmentFlat * gains;
  return { us, pt, both: Math.max(us, pt) };
}

export const twoCountriesFigure = figure(['two-countries'], (_ctx, t) => {
  const f = frame(W, 196, 3);
  const g = svg('g');
  f.svg.append(g);
  let pretax = 40_000;
  let gains = 40_000;
  let ss = 0;
  let movedGains = false;
  const paint = () => {
    const r = twoCountries(pretax, gains, ss);
    const max = Math.max(20_000, Math.ceil(Math.max(r.us, r.pt) / 10_000) * 10_000);
    const X = (v: number) => 150 + (v / max) * 210;
    const rows: [string, string, number, string][] = [
      ['Living in Washington', 'federal tax only', r.us, COL.taxable],
      ['Portugal’s tax alone', 'gains at 28%', r.pt, COL.portugal],
      ['Living in Portugal', 'both, after credits', r.both, COL.bad],
    ];
    const parts: SVGElement[] = [note(10, 16, `A couple: ${k(pretax)} from IRAs, ${k(gains)} of gains and dividends, ${k(ss)} Social Security`, { bold: true })];
    rows.forEach(([name, sub, v, c], i) => {
      const y = 30 + i * 46;
      parts.push(small(144, y + 10, name, { anchor: 'end', bold: true }), small(144, y + 22, sub, { anchor: 'end', soft: true }));
      parts.push(svg('rect', { x: 150, y, width: Math.max(1, X(v) - 150), height: 24, rx: 3, fill: c }));
      parts.push(label(X(v) + 5, y + 17, usd(v), { bold: true, fill: c }));
    });
    parts.push(small(10, 186, 'A rough model: the real credits are worked out income by income, under the treaty.', { soft: true }));
    redraw(g, ...parts);
    if (gains >= 80_000) movedGains = true;
    f.readout.textContent = `Staying in Washington: ${usd(r.us)}. Living in Portugal: about ${usd(r.both)}, ${usd(r.both - r.us)} more. `
      + (gains > 0 ? `The gains alone cost ${usd(RULES.portugal.investmentFlat * gains)} in Portugal, where the US 0 percent band doesn't exist.` : 'With no gains, the gap is the pension brackets alone.');
    if (movedGains) t.done();
  };
  const sP = slider('From IRAs', 0, 150_000, 5_000, pretax, k, (v) => { pretax = v; paint(); }, 'pretax');
  const sG = slider('Gains and dividends', 0, 150_000, 5_000, gains, k, (v) => { gains = v; paint(); }, 'gains');
  const sS = slider('Social Security', 0, 80_000, 5_000, ss, k, (v) => { ss = v; paint(); }, 'ss');
  f.controls.append(sP.node, sG.node, sS.node);
  paint();
  return f.node;
});
