// Lesson 6, Stocks, bonds and the glide path: a share in shares that moves
// from one level at the start to another ten years in, tested on every
// 30-year start.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { cycle, safeRate, starts } from '../engine/history';
import { axes, COL, figure, frame, guessFirst, k, pct, slider, tint } from './kit';

const W = 400;
const YEARS = 30;
const RAMP = 10;

export const glide = (from: number, to: number) => (t: number) => from + (to - from) * Math.min(1, t / RAMP);

export interface GlideSummary {
  rates: { start: number; rate: number }[];
  worst: { start: number; rate: number };
  fails: number;
  medianEnd: number;
}

const memo = new Map<string, GlideSummary>();

/** Every 30-year start under a path from `from` to `to` shares over ten years: highest safe rates, and how 4 percent fared. */
export function glideSummary(from: number, to: number): GlideSummary {
  const key = `${from.toFixed(2)}:${to.toFixed(2)}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const g = glide(from, to);
  const rates = starts(YEARS).map((s) => ({ start: s, rate: safeRate(s, YEARS, g) }));
  const worst = rates.reduce((m, r) => (r.rate < m.rate ? r : m));
  const runs = cycle({ years: YEARS, stocks: g, rule: { kind: 'constant', rate: 0.04 } });
  const ends = runs.map((r) => r.path.balance[YEARS]).sort((a, b) => a - b);
  const out = { rates, worst, fails: runs.filter((r) => r.path.ranOut >= 0).length, medianEnd: ends[Math.floor(ends.length / 2)] };
  memo.set(key, out);
  return out;
}

export const glideFigure = figure(['glide'], (_ctx, t) => {
  const f = frame(W, 262, 3);
  const g = svg('g');
  f.svg.append(g);
  let from = 0.6;
  let to = 0.6;
  let rose = false;
  let fell = false;
  const paint = () => {
    const s = glideSummary(from, to);
    // The path, small, at the top.
    const p = axes({ x: 40, y: 12, w: 120, h: 44, xmin: 0, xmax: YEARS, ymin: 0, ymax: 1, xticks: [0, 10, 30], yticks: [0, 1], yfmt: (v) => pct(v, 0), ink: COL.ink, grid: COL.grid });
    const path = Array.from({ length: YEARS + 1 }, (_, i) => [i, glide(from, to)(i)] as const);
    const a = axes({ x: 40, y: 92, w: 344, h: 120, xmin: 1871, xmax: 1994, ymin: 0, ymax: 0.12, xticks: [1880, 1900, 1920, 1940, 1960, 1980], yticks: [0, 0.04, 0.08, 0.12], yfmt: (v) => pct(v, 0), xlabel: 'year retirement began', ink: COL.ink, grid: COL.grid });
    const bw = 344 / (1994 - 1871);
    const bars = s.rates.map((r) => svg('rect', { x: a.X(r.start) - bw / 2 + 0.3, y: a.Y(Math.min(0.12, r.rate)), width: bw - 0.6, height: a.Y(0) - a.Y(Math.min(0.12, r.rate)), fill: r.rate < 0.04 ? tint(COL.bad, 0.6) : tint(COL.stocks, 0.5) }));
    redraw(g, ...p.parts,
      p.path(path, COL.stocks, 2.4),
      small(170, 26, 'share in shares, year by year', { soft: true }),
      small(170, 40, `${pct(from, 0)} at the start, ${pct(to, 0)} from year ${RAMP}`, { fill: COL.stocks, bold: true }),
      ...a.parts, ...bars,
      line(40, a.Y(0.04), 384, a.Y(0.04), COL.spending, 1.2, { 'stroke-dasharray': '4 3' }),
      small(44, a.Y(0.04) - 4, '4%', { fill: COL.spending, bold: true }),
      small(40, 86, 'highest steady rate that lasted 30 years, by start', { soft: true }),
      label(Math.min(350, a.X(s.worst.start)), Math.min(a.Y(s.worst.rate), a.Y(0.04)) - 8, `${s.worst.start}: ${pct(s.worst.rate, 2)}`, { anchor: 'middle', fill: COL.bad, bold: true }),
      note(40, 256, `At 4%: ${s.fails} of ${s.rates.length} starts ran out; typical end ${k(s.medianEnd)} from $1M`, { fill: COL.ink }),
    );
    if (!open()) return;
    if (to - from > 0.19) rose = true;
    if (from - to > 0.19) fell = true;
    const fixed = glideSummary(0.6, 0.6);
    f.readout.textContent = `${Math.abs(from - to) < 0.01 ? `${pct(from, 0)} shares throughout` : `${pct(from, 0)} shares ${to > from ? 'rising' : 'falling'} to ${pct(to, 0)}`}: the worst start could spend ${pct(s.worst.rate, 2)}`
      + (Math.abs(from - 0.6) < 0.01 && Math.abs(to - 0.6) < 0.01 ? '.' : `, against ${pct(fixed.worst.rate, 2)} for 60 percent throughout.`)
      + (rose && fell ? ' The path matters far less than the average share in shares.' : rose ? ' Now try a falling path.' : fell ? ' Now try a rising one.' : '');
    if (rose && fell) t.done();
  };
  const sA = slider('Shares at the start', 0, 1, 0.1, from, (v) => pct(v, 0), (v) => { from = v; paint(); }, 'stocks');
  const sB = slider(`Shares from year ${RAMP}`, 0, 1, 0.1, to, (v) => pct(v, 0), (v) => { to = v; paint(); }, 'stocks');
  f.controls.append(sA.node, sB.node);
  const open = guessFirst(t, f, {
    ask: 'Bonds feel safe. Hold nothing but ten-year Treasury bonds and spend 4 percent a year, raised with prices. Of 123 thirty-year starts since 1871, how many ran out of money?',
    options: ['None', 'About a tenth', 'About half'],
    answer: 2,
    sliders: [sA, sB],
    after: () => {
      from = 0;
      to = 0;
      sA.set(0);
      sB.set(0);
      paint();
    },
  });
  paint();
  return f.node;
});
