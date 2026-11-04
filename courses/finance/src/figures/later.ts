// Branches C, H and S: a survivor's tax against the couple's; Medicare's
// income surcharges as steps; and how a few years of part-time pay raise the
// spending that lasted through every stretch of history.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { simulate, starts } from '../engine/history';
import { RULES } from '../engine/rules';
import { federalTax, irmaa } from '../engine/tax';
import { axes, COL, figure, frame, guessFirst, k, slider, usd } from './kit';

const W = 400;

function bars(rows: [string, string, number, string][], max: number, left: number, fmt: (v: number) => string = usd): SVGElement[] {
  const X = (v: number) => left + (v / max) * (320 - left);
  const out: SVGElement[] = [];
  rows.forEach(([name, sub, v, c], i) => {
    const y = 30 + i * 46;
    out.push(small(left - 6, y + 10, name, { anchor: 'end', bold: true }), small(left - 6, y + 22, sub, { anchor: 'end', soft: true }));
    out.push(svg('rect', { x: left, y, width: Math.max(1, X(v) - left), height: 24, rx: 3, fill: c }));
    out.push(label(X(v) + 5, y + 17, fmt(v), { bold: true, fill: c }));
  });
  out.push(line(left, 128, 320, 128, COL.ink, 1), small(left, 142, '$0', { anchor: 'middle', soft: true }), small(320, 142, k(max), { anchor: 'middle', soft: true }));
  return out;
}

/** Federal tax for a couple over 65, and for the survivor after one dies: same withdrawals, the smaller Social Security benefit gone. */
export function survivorTax(pretax: number, ssHigh: number, ssLow: number): { couple: number; survivor: number } {
  return {
    couple: federalTax({ pretax, ss: ssHigh + ssLow }, { status: 'joint', over65: 2 }).total,
    survivor: federalTax({ pretax, ss: ssHigh }, { status: 'single', over65: 1 }).total,
  };
}

export const survivorFigure = figure(['survivor'], (_ctx, t) => {
  const f = frame(W, 176, 3);
  const g = svg('g');
  f.svg.append(g);
  let pretax = 100_000;
  let high = 40_000;
  let low = 25_000;
  const paint = () => {
    const r = survivorTax(pretax, high, low);
    const max = Math.max(20_000, Math.ceil(Math.max(r.couple, r.survivor) / 20_000) * 20_000);
    redraw(g,
      note(10, 16, `${k(pretax)} a year from IRAs, Social Security ${k(high)} and ${k(low)}`, { bold: true }),
      ...bars([
        ['Both alive', `joint, ${k(pretax + high + low)} in`, r.couple, COL.taxable],
        ['The survivor', `single, ${k(pretax + high)} in`, r.survivor, COL.bad],
      ], max, 130),
      small(10, 166, 'Federal tax, both over 65, 2026 rules. The survivor keeps the larger benefit.', { soft: true }),
    );
    f.readout.textContent = `The survivor has ${usd(low)} less coming in and pays ${usd(r.survivor - r.couple)} ${r.survivor >= r.couple ? 'more' : 'less'} tax: the same withdrawals now fall into the single brackets, about half as wide.`;
    if (pretax >= 150_000) t.done();
  };
  const sP = slider('From IRAs', 0, 250_000, 5_000, pretax, k, (v) => { pretax = v; paint(); }, 'pretax');
  const sH = slider('Larger benefit', 10_000, 60_000, 1_000, high, k, (v) => { high = v; paint(); }, 'ss');
  const sL = slider('Smaller benefit', 0, 50_000, 1_000, low, k, (v) => { low = v; paint(); }, 'ss');
  f.controls.append(sP.node, sH.node, sL.node);
  paint();
  return f.node;
});

export const irmaaFigure = figure(['irmaa'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let magi = 200_000;
  const seen = new Set<number>();
  const max = 800_000;
  const paint = () => {
    const a = axes({ x: 50, y: 20, w: 334, h: 160, xmin: 150_000, xmax: max, ymin: 0, ymax: 15_000, xticks: [200_000, 400_000, 600_000, 800_000], yticks: [0, 5_000, 10_000, 15_000], xfmt: k, yfmt: k, xlabel: 'the couple’s MAGI two years earlier', ylabel: 'surcharge a year, both of them', ink: COL.ink, grid: COL.grid });
    const pts: [number, number][] = [];
    for (let m = 150_000; m <= max; m += 1_000) pts.push([m, 2 * irmaa(m, 'joint').yearly]);
    const now = 2 * irmaa(magi, 'joint').yearly;
    redraw(g, ...a.parts,
      a.path(pts, COL.health, 2.4),
      svg('circle', { cx: a.X(magi), cy: a.Y(now), r: 4.5, fill: COL.spending }),
      label(a.X(magi) + (magi > 600_000 ? -6 : 6), a.Y(now) - 8, usd(now), { bold: true, fill: COL.spending, ...(magi > 600_000 ? { anchor: 'end' as const } : {}) }),
      note(50, 224, `On top of the standard Part B premium, $${RULES.medicare.partB.toFixed(2)} a month each in 2026`, { soft: true }),
    );
    if (!open()) return;
    const tier = irmaa(magi, 'joint').tier;
    seen.add(tier);
    const rows = RULES.medicare.irmaa.joint;
    const next = rows.find(([above]) => above >= magi);
    f.readout.textContent = (tier ? `At ${k(magi)}, tier ${tier}: ${usd(now)} a year more for the two of them. ` : `At ${k(magi)}, below the first step: no surcharge. `)
      + (next ? `The next step is at ${k(next[0])}; a dollar over it costs ${usd(2 * 12 * (next[1] + next[2]) - now)} more.` : 'This is the top tier.');
    if (seen.size >= 3) t.done();
  };
  const sM = slider('MAGI', 150_000, max, 1_000, magi, k, (v) => { magi = v; paint(); }, 'pretax');
  f.controls.append(sM.node);
  const open = guessFirst(t, f, {
    ask: 'A married couple on Medicare had MAGI of $218,000 two years ago. If it had been $219,000, how much more would they pay for Medicare this year?',
    options: ['About $20', 'About $2,300', 'About $9,000'],
    answer: 1,
    sliders: [sM],
    after: () => paint(),
  });
  paint();
  return f.node;
});

const HORIZON = 45;
const STOCKS = 0.6;
const memo = new Map<string, number>();

/** The highest constant real spending, work income included, that lasted every start over 45 years from $1 million, with `income` a year for the first `years`. */
export function safeWithWork(income: number, years: number): number {
  const key = `${income}:${years}`;
  const hit = memo.get(key);
  if (hit != null) return hit;
  const ss = starts(HORIZON);
  let lo = 0;
  let hi = 0.15;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    const ok = ss.every((s) => simulate({ start: s, years: HORIZON, stocks: STOCKS, rule: { kind: 'constant', rate: mid }, income: (y) => (y < years ? income : 0) }).ranOut < 0);
    if (ok) lo = mid;
    else hi = mid;
  }
  const v = lo * 1_000_000;
  memo.set(key, v);
  return v;
}

export const partTimeFigure = figure(['part-time'], (_ctx, t) => {
  const f = frame(W, 176, 3);
  const g = svg('g');
  f.svg.append(g);
  let income = 20_000;
  let years = 10;
  const seen = new Set<string>();
  const paint = () => {
    const none = safeWithWork(0, 0);
    const work = safeWithWork(income, years);
    redraw(g,
      note(10, 16, `$1 million, 45 years, 60% shares: spending that lasted every start`, { bold: true }),
      ...bars([
        ['No work', 'portfolio alone', none, COL.soft],
        ['Part-time work', `${k(income)} a year for ${years} years`, work, COL.good],
      ], Math.max(60_000, Math.ceil(work / 20_000) * 20_000), 140),
      small(10, 166, 'Real dollars a year, for life; work income counts as spending while it lasts.', { soft: true }),
    );
    if (!open()) return;
    seen.add(`${income}:${years}`);
    f.readout.textContent = `Earning ${usd(income * years)} in all raises the spending that lasted every start by ${usd(work - none)} a year, for all 45 years: ${usd((work - none) * HORIZON)} more over a lifetime. `
      + 'The pay arrives in the years when a bad sequence does the most harm.';
    if (seen.size >= 3) t.done();
  };
  const sI = slider('Earned a year', 0, 50_000, 5_000, income, k, (v) => { income = v; paint(); }, 'wages');
  const sY = slider('For the first', 0, 20, 1, years, (v) => `${v} years`, (v) => { years = v; paint(); }, 'balance');
  f.controls.append(sI.node, sY.node);
  const open = guessFirst(t, f, {
    ask: 'From $1 million, the highest spending that lasted 45 years from every US start was about $32,700 a year. Earning $20,000 a year for the first ten years raises it by about how much a year, for life?',
    options: ['About $2,000', 'About $7,000', 'About $20,000'],
    answer: 1,
    sliders: [sI, sY],
    after: () => paint(),
  });
  paint();
  return f.node;
});

