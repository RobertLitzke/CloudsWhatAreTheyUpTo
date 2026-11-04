// Lesson 4, A fifty-year retirement: the highest rate each start year could
// have spent, as the horizon lengthens; and how the price of shares at the
// start (Shiller's CAPE) lines up with it.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { LAST, safeRate, starts, yearOf } from '../engine/history';
import { axes, COL, figure, frame, guessFirst, pct, slider, tint } from './kit';

const W = 400;

export interface HorizonSummary {
  rates: { start: number; rate: number }[];
  worst: { start: number; rate: number };
  tenth: number;
  median: number;
}

const memo = new Map<string, HorizonSummary>();

/** The highest steady real rate each start could have spent over `years`, and the spread. */
export function horizon(years: number, stocks: number): HorizonSummary {
  const key = `${years}:${stocks}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const rates = starts(years).map((s) => ({ start: s, rate: safeRate(s, years, stocks) }));
  const sorted = rates.map((r) => r.rate).sort((a, b) => a - b);
  const worst = rates.reduce((m, r) => (r.rate < m.rate ? r : m));
  const out = { rates, worst, tenth: sorted[Math.floor(sorted.length * 0.1)], median: sorted[Math.floor(sorted.length / 2)] };
  memo.set(key, out);
  return out;
}

export const horizonFigure = figure(['horizon'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let years = 30;
  let stocks = 0.75;
  let longest = 30;
  const paint = () => {
    const h = horizon(years, stocks);
    const a = axes({ x: 40, y: 20, w: 344, h: 170, xmin: 1871, xmax: 1994, ymin: 0, ymax: 0.12, xticks: [1880, 1900, 1920, 1940, 1960, 1980], yticks: [0, 0.03, 0.06, 0.09, 0.12], yfmt: (v) => pct(v, 0), xlabel: 'year retirement began', ylabel: `highest steady rate that lasted ${years} years`, ink: COL.ink, grid: COL.grid });
    const bw = 344 / (1994 - 1871);
    const bars = h.rates.map((r) => svg('rect', { x: a.X(r.start) - bw / 2 + 0.3, y: a.Y(Math.min(0.12, r.rate)), width: bw - 0.6, height: a.Y(0) - a.Y(Math.min(0.12, r.rate)), fill: r.start === h.worst.start ? COL.bad : r.rate < 0.04 ? tint(COL.bad, 0.5) : tint(COL.balance, 0.55) }));
    redraw(g, ...a.parts, ...bars,
      line(40, a.Y(0.04), 384, a.Y(0.04), COL.spending, 1.2, { 'stroke-dasharray': '4 3' }),
      small(44, a.Y(0.04) - 4, '4%', { fill: COL.spending, bold: true }),
      label(Math.min(350, a.X(h.worst.start)), Math.min(a.Y(h.worst.rate), a.Y(0.04)) - 8, `${h.worst.start}: ${pct(h.worst.rate, 2)}`, { anchor: 'middle', fill: COL.bad, bold: true }),
      note(40, 230, `${h.rates.length} starts, ${h.rates[0].start} to ${h.rates[h.rates.length - 1].start}: the last with ${years} years of data before ${LAST + 1}`, { soft: true }),
    );
    if (!open()) return;
    const below = h.rates.filter((r) => r.rate < 0.04).length;
    f.readout.textContent = `${years} years, ${pct(stocks, 0)} shares: the worst start, ${h.worst.start}, could spend ${pct(h.worst.rate, 2)}. `
      + `Nine in ten starts managed ${pct(h.tenth, 1)} or more, and the middle one ${pct(h.median, 1)}. `
      + `${below} of ${h.rates.length} could not sustain 4 percent.`;
    if (longest >= 45) t.done();
  };
  const sY = slider('Years', 30, 50, 1, years, (v) => `${v} years`, (v) => { years = v; longest = Math.max(longest, v); paint(); }, 'balance');
  const sS = slider('Shares', 0.25, 1, 0.05, stocks, (v) => `${pct(v, 0)} shares`, (v) => { stocks = v; paint(); }, 'stocks');
  f.controls.append(sY.node, sS.node);
  const open = guessFirst(t, f, {
    ask: 'Over thirty years, the worst US start (1966, with 75 percent in shares) could spend 3.7 percent of its first balance, raised with prices. Over fifty years, what could the worst start spend?',
    options: ['About 3.6 percent', 'About 3.3 percent', 'About 2.5 percent'],
    answer: 1,
    sliders: [sY, sS],
    after: () => paint(),
  });
  paint();
  return f.node;
});

/** Each 30-year start with a CAPE: the CAPE in its first January and the highest rate it could spend. */
export function capePoints(stocks = 0.75): { start: number; cape: number; rate: number }[] {
  return horizon(30, stocks).rates
    .filter((r) => yearOf(r.start).cape !== null)
    .map((r) => ({ start: r.start, cape: yearOf(r.start).cape as number, rate: r.rate }));
}

export const capeFigure = figure(['cape'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  const pts = capePoints(0.75);
  const today = yearOf(LAST).cape as number;
  let at = 15;
  let moved = false;
  const paint = () => {
    const a = axes({ x: 40, y: 20, w: 344, h: 170, xmin: 0, xmax: 45, ymin: 0.03, ymax: 0.12, xticks: [0, 10, 20, 30, 40], yticks: [0.04, 0.06, 0.08, 0.1, 0.12], yfmt: (v) => pct(v, 0), xlabel: 'CAPE in the first January (share prices ÷ ten years of earnings)', ylabel: 'highest steady rate that lasted 30 years', ink: COL.ink, grid: COL.grid });
    const near = pts.filter((p) => Math.abs(p.cape - at) <= 2.5);
    const dots = pts.map((p) => svg('circle', { cx: a.X(p.cape), cy: a.Y(p.rate), r: 2.8, fill: Math.abs(p.cape - at) <= 2.5 ? COL.spending : tint(COL.balance, 0.5) }));
    redraw(g, ...a.parts,
      svg('rect', { x: a.X(at - 2.5), y: a.Y(0.12), width: a.X(at + 2.5) - a.X(at - 2.5), height: a.Y(0.03) - a.Y(0.12), fill: tint(COL.spending, 0.12) }),
      ...dots,
      line(a.X(today), a.Y(0.12), a.X(today), a.Y(0.03), COL.bad, 1.2, { 'stroke-dasharray': '3 3' }),
      small(a.X(today) - 3, a.Y(0.12) + 10, `January ${LAST}: ${today.toFixed(0)}`, { anchor: 'end', fill: COL.bad, bold: true }),
      ...(['1929', '1966', '1982'].map((y) => {
        const p = pts.find((q) => q.start === Number(y));
        return p ? small(a.X(p.cape) + 5, a.Y(p.rate) + 3, y, { soft: true }) : null;
      }).filter((x): x is SVGElement => !!x)),
      note(40, 230, `Each dot a 30-year start, ${pts[0].start} to ${pts[pts.length - 1].start}, 75 percent shares`, { soft: true }),
    );
    const lo = near.length ? Math.min(...near.map((p) => p.rate)) : NaN;
    f.readout.textContent = near.length
      ? `Starts with a CAPE of ${(at - 2.5).toFixed(0)} to ${(at + 2.5).toFixed(0)}: ${near.length}. The worst could spend ${pct(lo, 1)}, the average ${pct(near.reduce((s, p) => s + p.rate, 0) / near.length, 1)}.`
        + (at > 22 ? ' History has hardly any starts this expensive, and none since 1966 with thirty years of results.' : '')
      : `No 30-year start in the record began with a CAPE near ${at.toFixed(0)}. Everything said about it is extrapolation.`;
    if (moved && at >= 30) t.done();
  };
  const sC = slider('CAPE at the start', 5, 42, 1, at, (v) => v.toFixed(0), (v) => { at = v; moved = true; paint(); }, 'stocks');
  f.controls.append(sC.node);
  paint();
  return f.node;
});
