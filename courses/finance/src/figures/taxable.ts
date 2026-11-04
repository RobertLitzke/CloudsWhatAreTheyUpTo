// Branch T, taxable-account craft: which account should hold the bonds and
// which the shares; and what $1 million left in each kind of account is
// worth to an heir.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, k, pct, slider, usd } from './kit';
import { pick } from './plot';

const W = 400;

/** Returns for the location model: shares pay dividends and grow; bonds pay interest. */
export const LOCATION = { dividend: 0.02, growth: 0.05, bond: 0.045 };

/** The federal brackets a household might be in, with its rate on qualified dividends and long-term gains. */
export const BRACKETS: readonly { name: string; ordinary: number; qualified: number }[] = [
  { name: '12%', ordinary: 0.12, qualified: 0 },
  { name: '22%', ordinary: 0.22, qualified: 0.15 },
  { name: '24%', ordinary: 0.24, qualified: 0.15 },
  { name: '32%', ordinary: 0.32, qualified: 0.15 },
];

/**
 * After-tax value after `years` of equal amounts in a taxable and a pre-tax
 * account, half the whole in shares and half in bonds, with the bonds in the
 * pre-tax account (`bondsSheltered`) or the shares there. Everything is sold
 * or withdrawn at the end at the same rates.
 */
export function located(years: number, each: number, ordinary: number, qualified: number, bondsSheltered: boolean): number {
  const { dividend, growth, bond } = LOCATION;
  let taxable = each;
  let basis = each;
  let pretax = each;
  for (let y = 0; y < years; y++) {
    if (bondsSheltered) {
      const d = taxable * dividend * (1 - qualified);
      taxable = taxable * (1 + growth) + d;
      basis += d;
      pretax *= 1 + bond;
    } else {
      taxable *= 1 + bond * (1 - ordinary);
      basis = taxable;
      pretax *= 1 + dividend + growth;
    }
  }
  return taxable - (taxable - basis) * qualified + pretax * (1 - ordinary);
}

export const locationFigure = figure(['location'], (_ctx, t) => {
  const f = frame(W, 176, 3);
  const g = svg('g');
  f.svg.append(g);
  let years = 30;
  let b = 1;
  const seen = new Set<number>();
  const paint = () => {
    const { ordinary, qualified } = BRACKETS[b];
    const good = located(years, 500_000, ordinary, qualified, true);
    const bad = located(years, 500_000, ordinary, qualified, false);
    const max = Math.ceil(Math.max(good, bad) / 1_000_000) * 1_000_000;
    const X = (v: number) => 150 + (v / max) * 170;
    const rows: [string, string, number, string][] = [
      ['Bonds in the IRA', 'shares in taxable', good, COL.good],
      ['Shares in the IRA', 'bonds in taxable', bad, COL.soft],
    ];
    const parts: SVGElement[] = [note(10, 16, `$500,000 in each account, after ${years} years and all tax`, { bold: true })];
    rows.forEach(([name, sub, v, c], i) => {
      const y = 30 + i * 46;
      parts.push(small(144, y + 10, name, { anchor: 'end', bold: true }), small(144, y + 22, sub, { anchor: 'end', soft: true }));
      parts.push(svg('rect', { x: 150, y, width: X(v) - 150, height: 24, rx: 3, fill: c }));
      parts.push(label(X(v) + 5, y + 17, k(v), { bold: true, fill: c }));
    });
    parts.push(line(150, 128, 320, 128, COL.ink, 1), small(150, 142, '$0', { anchor: 'middle', soft: true }), small(320, 142, k(max), { anchor: 'middle', soft: true }));
    parts.push(small(10, 166, `Shares 7% a year (2% dividends), bonds 4.5%. ${BRACKETS[b].name} bracket, gains at ${pct(qualified, 0)}.`, { soft: true }));
    redraw(g, ...parts);
    if (!open()) return;
    seen.add(b);
    f.readout.textContent = `Putting the bonds in the IRA leaves ${usd(good - bad)} more, ${pct(good / bad - 1, 1)} of the total. `
      + (qualified === 0 ? 'In the 12 percent bracket the shares’ dividends and gains are taxed at 0, so taxable is the ideal home for them.' : 'The bonds’ interest is taxed every year at the ordinary rate in a taxable account; the shares’ growth waits, at a lower rate.');
    if (seen.size >= 2) t.done();
  };
  const chips = pick(BRACKETS.map((x) => `${x.name} bracket`), b, (i) => { b = i; paint(); });
  const sY = slider('Years', 5, 40, 1, years, (v) => `${v} years`, (v) => { years = v; paint(); }, 'balance');
  f.controls.append(chips.node, sY.node);
  const open = guessFirst(t, f, {
    ask: 'A couple in the 22 percent bracket hold $500,000 in a traditional IRA and $500,000 in a taxable account, half in shares and half in bonds overall. Over 30 years, how much more does the better placement leave them after tax?',
    options: ['About $25,000', 'About $250,000', 'About $1 million'],
    answer: 1,
    sliders: [sY],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

/** What $1 million left in each kind of account is worth to an heir with these rates. */
export function inherited(ordinary: number, qualified: number): [string, string, number][] {
  return [
    ['Roth IRA', 'withdrawn untaxed', 1_000_000],
    ['Taxable, held to death', 'basis steps up', 1_000_000],
    ['Taxable, given in life', '$300k basis carries over', 1_000_000 - 700_000 * qualified],
    ['Traditional IRA', 'taxed as income', 1_000_000 * (1 - ordinary)],
  ];
}

export const heirsFigure = figure(['heirs'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let b = 3;
  const seen = new Set<number>();
  const rates = [...BRACKETS, { name: '37%', ordinary: 0.37, qualified: 0.2 }];
  const paint = () => {
    const { ordinary, qualified } = rates[b];
    const rows = inherited(ordinary, qualified);
    const X = (v: number) => 160 + (v / 1_000_000) * 160;
    const parts: SVGElement[] = [note(10, 16, `$1 million left to an heir in the ${rates[b].name} bracket`, { bold: true })];
    rows.forEach(([name, sub, v], i) => {
      const y = 30 + i * 44;
      const c = v >= 999_999 ? COL.roth : v > 800_000 ? COL.taxable : COL.pretax;
      parts.push(small(154, y + 10, name, { anchor: 'end', bold: true }), small(154, y + 22, sub, { anchor: 'end', soft: true }));
      parts.push(svg('rect', { x: 160, y, width: X(v) - 160, height: 24, rx: 3, fill: c }));
      parts.push(label(X(v) + 5, y + 17, k(v), { bold: true, fill: c }));
    });
    parts.push(small(10, 226, 'To a charity, every account is worth the full $1 million.', { soft: true }));
    redraw(g, ...parts);
    seen.add(b);
    f.readout.textContent = `The same million is worth ${k(1_000_000 * (1 - ordinary))} to this heir as a traditional IRA and the full $1M as a Roth or as shares held until death. `
      + 'Leave the pre-tax money to charity and the rest to people, and nobody pays the income tax.';
    if (seen.size >= 2) t.done();
  };
  const chips = pick(rates.map((x) => x.name), b, (i) => { b = i; paint(); });
  f.controls.append(chips.node);
  paint();
  return f.node;
});
