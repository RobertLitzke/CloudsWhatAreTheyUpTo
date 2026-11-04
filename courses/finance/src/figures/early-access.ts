// Lesson 9, Money before 59 and a half: a couple who stop work early pay for
// the years until 60 from a taxable account, Roth contributions and a Roth
// conversion ladder, and from pre-tax money with the 10 percent penalty when
// those run short.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { federalTax } from '../engine/tax';
import { COL, figure, frame, guessFirst, k, slider, tint, usd } from './kit';
import { legend } from './plot';

const W = 400;
export const SEASON = 5;
const ACCESS = 60;
const R = 0.04;

export type Source = 'taxable' | 'basis' | 'ladder' | 'penalty';

export interface BridgeYear {
  age: number;
  from: Record<Source, number>;
  /** Roth conversion this year, and the federal tax on it (paid from the taxable account). */
  converted: number;
  tax: number;
}

export interface Bridge {
  years: BridgeYear[];
  penalty: number;
  conversionTax: number;
  /** Years in which some spending had to come from pre-tax money with the penalty. */
  gapYears: number;
}

/**
 * From `stop` to 60, spending `spend` a year (real dollars), a couple converts `spend`
 * of pre-tax money to Roth each year, and spends from: conversions at least five
 * years old, then Roth contributions (`basis`), then the taxable account, then
 * pre-tax money with the 10 percent penalty. Balances grow at 4 percent real.
 */
export function bridge(stop: number, spend: number, taxable: number, basis: number, pretax: number): Bridge {
  let tx = taxable;
  let bs = basis;
  let pt = pretax;
  const conversions: number[] = [];
  const years: BridgeYear[] = [];
  let penalty = 0;
  let conversionTax = 0;
  for (let age = stop; age < ACCESS; age++) {
    const t = age - stop;
    // Convert this year's slice, paying its tax from the taxable account.
    const c = Math.min(pt, spend);
    pt -= c;
    conversions.push(c);
    const tax = federalTax({ pretax: c }, { status: 'joint' }).total;
    tx -= tax;
    conversionTax += tax;
    let need = spend;
    const from: Record<Source, number> = { taxable: 0, basis: 0, ladder: 0, penalty: 0 };
    const ripe = t >= SEASON ? conversions[t - SEASON] : 0;
    from.ladder = Math.min(need, ripe);
    need -= from.ladder;
    from.basis = Math.min(need, bs);
    bs -= from.basis;
    need -= from.basis;
    from.taxable = Math.min(need, Math.max(0, tx));
    tx -= from.taxable;
    need -= from.taxable;
    if (need > 0) {
      // Pre-tax money early: taxed and penalised. Take enough to net the need.
      const gross = need / (1 - 0.1 - 0.12);
      pt -= gross;
      penalty += 0.1 * gross;
      from.penalty = need;
    }
    years.push({ age, from, converted: c, tax });
    tx = Math.max(0, tx) * (1 + R);
    bs *= 1 + R;
    pt = Math.max(0, pt) * (1 + R);
  }
  return { years, penalty, conversionTax, gapYears: years.filter((y) => y.from.penalty > 1).length };
}

const SOURCES: readonly { key: Source; name: string; color: string }[] = [
  { key: 'taxable', name: 'taxable account', color: COL.taxable },
  { key: 'basis', name: 'Roth contributions', color: tint(COL.roth, 0.55) },
  { key: 'ladder', name: 'conversions 5+ years old', color: COL.roth },
  { key: 'penalty', name: 'pre-tax, with penalty', color: COL.bad },
];

export const bridgeFigure = figure(['bridge'], (_ctx, t) => {
  const f = frame(W, 232, 3);
  const g = svg('g');
  f.svg.append(g);
  let stop = 50;
  let spend = 60_000;
  let taxable = 150_000;
  const basis = 60_000;
  const pretax = 1_200_000;
  let sawGap = false;
  let sawNone = false;
  const paint = () => {
    const b = bridge(stop, spend, taxable, basis, pretax);
    const n = ACCESS - 40;
    const bw = 344 / n;
    const X = (age: number) => 40 + (age - 40) * bw;
    const H = 130;
    const Y = (v: number) => 30 + H - (v / 100_000) * H;
    const parts: SVGElement[] = [];
    for (const v of [0, 50_000, 100_000]) parts.push(line(40, Y(v), 384, Y(v), COL.grid, 1), small(36, Y(v) + 3, k(v), { anchor: 'end', soft: true }));
    for (const y of b.years) {
      let top = 0;
      for (const s of SOURCES) {
        const v = y.from[s.key];
        if (v <= 0) continue;
        parts.push(svg('rect', { x: X(y.age) + 1, y: Y(top + v), width: bw - 2, height: Y(top) - Y(top + v), fill: s.color }));
        top += v;
      }
    }
    // The first year the ladder pays.
    const first = stop + SEASON;
    if (first < ACCESS) parts.push(line(X(first), 26, X(first), Y(0), COL.roth, 1, { 'stroke-dasharray': '3 2' }), small(X(first) + (first > 52 ? -3 : 3), 24, 'first conversion ripens', { fill: COL.roth, ...(first > 52 ? { anchor: 'end' as const } : {}) }));
    for (let a = 40; a <= ACCESS; a += 5) parts.push(small(X(a), Y(0) + 13, String(a), { anchor: 'middle', soft: true }));
    parts.push(small(384, Y(0) + 26, 'age', { anchor: 'end', soft: true }));
    parts.push(small(40, 16, 'Where each year’s spending comes from, until 60', { bold: true }));
    if (stop > 40) parts.push(label((40 + X(stop)) / 2, Y(50_000), 'working', { anchor: 'middle', fill: COL.soft }));
    parts.push(...legend(10, 214, SOURCES.slice(0, 2).map((s) => ({ text: s.name, color: s.color }))), ...legend(10, 228, SOURCES.slice(2).map((s) => ({ text: s.name, color: s.color }))));
    redraw(g, ...parts);
    if (!open()) return;
    if (b.gapYears) sawGap = true;
    else sawNone = true;
    f.readout.textContent = `Stopping at ${stop}, spending ${k(spend)} a year, with ${k(taxable)} taxable and ${k(basis)} of Roth contributions: `
      + (b.gapYears ? `${b.gapYears} ${b.gapYears === 1 ? 'year needs' : 'years need'} pre-tax money early, costing ${usd(b.penalty)} in penalties. ` : 'no penalties at all. ')
      + `Converting ${k(spend)} a year costs ${usd(b.conversionTax / b.years.length)} a year in federal tax.`;
    if (sawGap && sawNone) t.done();
  };
  const sS = slider('Stop work at', 40, 57, 1, stop, String, (v) => { stop = v; paint(); }, 'balance');
  const sP = slider('Spending', 40_000, 100_000, 5_000, spend, k, (v) => { spend = v; paint(); }, 'spending');
  const sT = slider('Taxable account', 0, 600_000, 10_000, taxable, k, (v) => { taxable = v; paint(); }, 'taxable');
  f.controls.append(sS.node, sP.node, sT.node);
  const open = guessFirst(t, f, {
    ask: 'A couple stops work at 50 and starts converting $60,000 a year from their 401(k) to a Roth. How many years must they live on other money before the first conversion can be spent without penalty?',
    options: ['None', 'Five', 'Nine and a half'],
    answer: 1,
    sliders: [sS, sP, sT],
    after: () => paint(),
  });
  paint();
  return f.node;
});
