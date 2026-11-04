// Lesson 3, The same average, a different order: the 1969 retiree's thirty
// years of returns played forwards, backwards and shuffled; and how well the
// first few years of a retirement predict how much it could have spent.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { makeRng, shuffle } from 'didactics/rng';
import { averages, realSeries, safeRate, simulate, starts } from '../engine/history';
import { axes, COL, figure, frame, guessFirst, pct, slider, tint } from './kit';
import { pick } from './plot';

const W = 400;
export const ORDER_START = 1969;
const YEARS = 30;
const STOCKS = 0.6;

const ORDERS = ['As it happened', 'Backwards', 'Shuffled'] as const;

export const orderFigure = figure(['order'], (_ctx, t) => {
  const f = frame(W, 262, 3);
  const g = svg('g');
  f.svg.append(g);
  const real = realSeries(ORDER_START, YEARS, STOCKS);
  const avg = averages(real);
  let rate = 0.04;
  let order = 0;
  let shuffles = 0;
  let sawBack = false;
  const rng = makeRng(1969);
  let mixed = real.slice();
  const series = () => (order === 0 ? real : order === 1 ? [...real].reverse() : mixed);
  const paint = () => {
    const rs = series();
    const p = simulate({ start: ORDER_START, years: YEARS, stocks: STOCKS, rule: { kind: 'constant', rate }, returns: rs });
    const top = 4;
    const a = axes({ x: 40, y: 18, w: 344, h: 140, xmin: 0, xmax: YEARS, ymin: 0, ymax: top, xticks: [0, 5, 10, 15, 20, 25, 30], yticks: [0, 1, 2, 3, 4], yfmt: (v) => `${v}×`, ylabel: 'balance, in starting balances (after inflation)', ink: COL.ink, grid: COL.grid });
    // Each year's return as a bar under the chart, in the order used.
    const bw = 344 / YEARS;
    const mid = 222;
    const bars = rs.map((r, i) => {
      const h = Math.min(34, Math.abs(r) * 140);
      return svg('rect', { x: 40 + i * bw + 0.8, y: r >= 0 ? mid - h : mid, width: bw - 1.6, height: h, fill: r >= 0 ? tint(COL.good, 0.7) : COL.bad, opacity: 0.85 });
    });
    const out = p.ranOut;
    redraw(g,
      line(40, a.Y(1), 384, a.Y(1), COL.ink, 0.8, { 'stroke-dasharray': '2 3' }),
      ...a.parts,
      a.path(p.balance.map((b, i) => [i, Math.min(top + 0.1, b / 1e6)] as const), out >= 0 ? COL.bad : COL.balance, 2.4),
      ...(out >= 0 ? [svg('circle', { cx: a.X(out), cy: a.Y(0), r: 4.5, fill: COL.bad }), label(a.X(out), a.Y(0) - 10, `empty in year ${out + 1}`, { anchor: 'middle', fill: COL.bad, bold: true })] : []),
      line(40, mid, 384, mid, COL.ink, 0.8),
      ...bars,
      note(40, 184, `Each year’s real return, ${pct(STOCKS, 0)} shares and ${pct(1 - STOCKS, 0)} bonds, in this order`, { soft: true }),
      small(40, 254, 'first year', { soft: true }),
      small(384, 254, 'thirtieth year', { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    const end = p.balance[YEARS] / 1e6;
    f.readout.textContent = `${ORDERS[order]}${order === 2 ? ` (${shuffles} ${shuffles === 1 ? 'shuffle' : 'shuffles'})` : ''}, ${pct(rate, 2)} a year: `
      + (out >= 0 ? `empty in year ${out + 1}. ` : `ends with ${end.toFixed(1)} times the starting balance. `)
      + `The same thirty returns every time, averaging ${pct(avg.compound, 1)} a year after inflation; only the order changes.`;
    if (order === 1) sawBack = true;
    if (sawBack && shuffles >= 2) t.done();
  };
  // Tapping "Shuffled" again deals a new order.
  const chips = pick(ORDERS, 0, (i) => {
    order = i;
    if (i === 2) {
      mixed = shuffle(real, rng);
      shuffles++;
    }
    paint();
  });
  const sR = slider('Withdrawal', 0.03, 0.05, 0.0025, rate, (v) => pct(v, 2), (v) => { rate = v; paint(); }, 'spending');
  f.controls.append(chips.node, sR.node);
  const open = guessFirst(t, f, {
    ask: `The thirty years from ${ORDER_START} averaged ${pct(avg.compound, 1)} a year after inflation on 60/40, a little better than history as a whole, yet 4 percent withdrawals ran out in year ${simulate({ start: ORDER_START, years: YEARS, stocks: STOCKS, rule: { kind: 'constant', rate: 0.04 } }).ranOut + 1}. Play the same thirty years backwards. How does it end?`,
    options: ['Runs out at about the same time', 'Lasts, with a little to spare', 'Ends with about three times the start'],
    answer: 2,
    sliders: [sR],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

/** For each 30-year start: the compound real return of its first `n` years, and the highest rate it could have spent. */
export function windows(n: number, stocks = STOCKS): { start: number; first: number; safe: number }[] {
  return starts(YEARS).map((s) => ({ start: s, first: averages(realSeries(s, n, stocks)).compound, safe: safeRate(s, YEARS, stocks) }));
}

export function correlation(xs: readonly number[], ys: readonly number[]): number {
  const m = (a: readonly number[]) => a.reduce((p, q) => p + q, 0) / a.length;
  const mx = m(xs);
  const my = m(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my);
    sxx += (x - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  });
  return sxy / Math.sqrt(sxx * syy);
}

export const windowFigure = figure(['window'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  const safe = starts(YEARS).map((s) => safeRate(s, YEARS, STOCKS));
  const cache = new Map<number, ReturnType<typeof windows>>();
  const at = (n: number) => {
    if (!cache.has(n)) cache.set(n, starts(YEARS).map((s, i) => ({ start: s, first: averages(realSeries(s, n, STOCKS)).compound, safe: safe[i] })));
    return cache.get(n) as ReturnType<typeof windows>;
  };
  let n = 30;
  const seen = new Set<number>();
  const paint = () => {
    const pts = at(n);
    const a = axes({ x: 44, y: 20, w: 330, h: 170, xmin: -0.08, xmax: 0.16, ymin: 0.03, ymax: 0.11, xticks: [-0.08, -0.04, 0, 0.04, 0.08, 0.12, 0.16], yticks: [0.04, 0.06, 0.08, 0.1], xfmt: (v) => pct(v, 0), yfmt: (v) => pct(v, 0), xlabel: `average real return of the first ${n} years`, ylabel: 'highest rate that lasted 30 years', ink: COL.ink, grid: COL.grid });
    const r = correlation(pts.map((p) => p.first), pts.map((p) => p.safe));
    const dots = pts.map((p) => svg('circle', { cx: a.X(Math.max(-0.085, Math.min(0.165, p.first))), cy: a.Y(p.safe), r: p.start === 1966 || p.start === 1982 ? 4.2 : 2.6, fill: p.start === 1966 ? COL.bad : p.start === 1982 ? COL.good : tint(COL.balance, 0.6) }));
    const p66 = pts.find((p) => p.start === 1966);
    const p82 = pts.find((p) => p.start === 1982);
    redraw(g, ...a.parts, ...dots,
      ...(p66 ? [small(a.X(p66.first) + 6, a.Y(p66.safe) + 4, '1966', { fill: COL.bad, bold: true })] : []),
      ...(p82 ? [small(a.X(Math.min(0.16, p82.first)) - 8, a.Y(p82.safe) + 4, '1982', { fill: COL.good, bold: true, anchor: 'end' })] : []),
      note(44, 232, `How closely the dots follow a line (correlation): ${r.toFixed(2)}`, { fill: COL.ink }),
    );
    seen.add(n);
    f.readout.textContent = n === 30
      ? 'Counting all thirty years, the average return explains only part of the outcome: starts with similar averages land far apart. Shorten the window.'
      : `Counting only the first ${n} years, the dots line up ${r > 0.85 ? 'tightly' : r > 0.7 ? 'more closely' : 'loosely'} (${r.toFixed(2)}). `
        + (n >= 8 && n <= 16 ? 'The first ten to fifteen years decide most of it.' : n < 8 ? 'Too short a window leaves out early years that still matter.' : 'Past fifteen years the later returns start to blur the picture again.');
    if ([...seen].some((s) => s >= 8 && s <= 16)) t.done();
  };
  const sN = slider('Years counted', 3, 30, 1, n, (v) => `first ${v}`, (v) => { n = v; paint(); }, 'balance');
  f.controls.append(sN.node);
  paint();
  return f.node;
});
