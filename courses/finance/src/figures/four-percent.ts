// Lesson 2, Where 4 percent came from: Bengen's method run on every start
// since 1871 (the cycling figure, which later lessons reuse with more
// controls), and a grid of success rates in the manner of the Trinity study.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small, still } from 'didactics/draw';
import { cycle, LAST, starts, type Plan, type Rule } from '../engine/history';
import { axes, COL, figure, frame, guessFirst, pct, slider, tint } from './kit';

const W = 400;

export interface CycleView {
  years: number;
  rule: Rule;
  stocks: number | ((t: number) => number);
  fee: number;
  income?: Plan['income'];
  extra?: Plan['extra'];
}

export interface CycleSummary {
  runs: ReturnType<typeof cycle>;
  failed: number[];
  /** Median real ending balance, as a multiple of the start. */
  medianEnd: number;
  /** Share of starts that ended with more than they began with. */
  grew: number;
  /** The lowest year of spending in any run, as a share of the first year's. */
  worstSpend: number;
}

export function summarise(v: CycleView): CycleSummary {
  const runs = cycle({ years: v.years, rule: v.rule, stocks: v.stocks, fee: v.fee, income: v.income, extra: v.extra }, 1);
  const failed = runs.filter((r) => r.path.ranOut >= 0).map((r) => r.start);
  const ends = runs.map((r) => r.path.balance[r.path.balance.length - 1]).sort((a, b) => a - b);
  const worstSpend = Math.min(...runs.map((r) => Math.min(...r.path.spending) / r.path.spending[0]));
  return { runs, failed, medianEnd: ends[Math.floor(ends.length / 2)], grew: ends.filter((e) => e > 1).length / ends.length, worstSpend };
}

/** The cycling drawing: every start's balance against years, failures in red, and a strip of start years under it. */
export function drawCycles(g: SVGElement, s: CycleSummary, years: number, highlight?: number): void {
  const top = 4;
  const a = axes({ x: 40, y: 18, w: 344, h: 150, xmin: 0, xmax: years, ymin: 0, ymax: top, xticks: years >= 50 ? [0, 10, 20, 30, 40, 50] : [0, 10, 20, 30], yticks: [0, 1, 2, 3, 4], yfmt: (v) => `${v}×`, xlabel: 'years into retirement', ylabel: 'balance, in starting balances (after inflation)', ink: COL.ink, grid: COL.grid });
  const lines: SVGElement[] = [];
  for (const r of s.runs) {
    const bad = r.path.ranOut >= 0;
    if (bad || r.start === highlight) continue;
    lines.push(a.path(r.path.balance.map((b, i) => [i, Math.min(top + 0.1, b)] as const), tint(COL.balance, 0.22), 1));
  }
  for (const r of s.runs) {
    if (r.path.ranOut < 0) continue;
    lines.push(a.path(r.path.balance.map((b, i) => [i, b] as const), COL.bad, 1.4));
  }
  const hl = s.runs.find((r) => r.start === highlight);
  if (hl) lines.push(a.path(hl.path.balance.map((b, i) => [i, Math.min(top + 0.1, b)] as const), COL.spending, 2.4));
  // The strip of start years.
  const first = s.runs[0].start;
  const last = s.runs[s.runs.length - 1].start;
  const sx = (y: number) => 40 + ((y - first) / Math.max(1, last - first)) * 344;
  const strip: SVGElement[] = s.runs.map((r) => svg('rect', { x: sx(r.start) - 1.2, y: 212, width: 2.4, height: 14, fill: r.path.ranOut >= 0 ? COL.bad : tint(COL.good, 0.55) }));
  const decades: SVGElement[] = [];
  for (let y = Math.ceil(first / 20) * 20; y <= last; y += 20) decades.push(small(sx(y), 238, String(y), { anchor: 'middle', soft: true }));
  redraw(g, line(40, a.Y(1), 384, a.Y(1), COL.ink, 0.8, { 'stroke-dasharray': '2 3' }), ...a.parts, ...lines, note(40, 206, `Each start year, ${first} to ${last}: red ran out`, { soft: true }), ...strip, ...decades);
}

export const cyclingFigure = figure(['cycle'], (_ctx, t) => {
  const f = frame(W, 246, 3);
  const g = svg('g');
  f.svg.append(g);
  let rate = 0.04;
  let stocks = 0.6;
  let fee = 0;
  let touched = 0;
  const paint = () => {
    const s = summarise({ years: 30, rule: { kind: 'constant', rate }, stocks, fee });
    drawCycles(g, s, 30);
    if (!open()) return;
    const n = s.runs.length;
    const fails = s.failed.length;
    f.readout.textContent = `${pct(rate, 2)} a year, raised with prices, ${pct(stocks, 0)} in shares${fee ? `, ${pct(fee, 2)} fees` : ''}: `
      + (fails ? `${fails} of ${n} starts ran out, from ${s.failed[0]}${fails > 1 ? ` to ${s.failed[s.failed.length - 1]}` : ''}. ` : `every one of ${n} starts lasted 30 years. `)
      + `The middle start ended with ${s.medianEnd.toFixed(1)} times its first balance.`;
    if (touched >= 2) t.done();
  };
  const sR = slider('Withdrawal', 0.03, 0.06, 0.0025, rate, (v) => pct(v, 2), (v) => { rate = v; touched |= 1; paint(); }, 'spending');
  const sS = slider('Shares', 0, 1, 0.05, stocks, (v) => `${pct(v, 0)} shares, ${pct(1 - v, 0)} bonds`, (v) => { stocks = v; touched |= 2; paint(); }, 'stocks');
  const sF = slider('Fees', 0, 0.015, 0.001, fee, (v) => pct(v, 1), (v) => { fee = v; paint(); }, 'tax');
  f.controls.append(sR.node, sS.node, sF.node);
  const open = guessFirst(t, f, {
    ask: `Spend 4 percent of the starting balance, raised with prices every year, from 60 percent shares and 40 percent bonds. Of the ${starts(30).length} thirty-year starts from 1871 to ${LAST - 29}, how many ran out of money?`,
    options: ['None', 'A handful, all close together', 'About a quarter'],
    answer: 1,
    reveal: 'done',
    sliders: [sR, sS, sF],
    after: () => paint(),
  });
  paint();
  return f.node;
});

/** A grid of 30-year success rates by withdrawal rate and share of stocks, in the Trinity study's manner, from this course's data. */
export function successGrid(years = 30): { rates: number[]; shares: number[]; cells: number[][] } {
  const rates = [0.03, 0.035, 0.04, 0.045, 0.05, 0.06];
  const shares = [0, 0.25, 0.5, 0.75, 1];
  const cells = shares.map((sh) => rates.map((r) => {
    const runs = cycle({ years, rule: { kind: 'constant', rate: r }, stocks: sh }, 1);
    return runs.filter((x) => x.path.ranOut < 0).length / runs.length;
  }));
  return { rates, shares, cells };
}

export const gridStill = () => {
  const s = still(W, 220);
  const { rates, shares, cells } = successGrid(30);
  const x0 = 96;
  const y0 = 34;
  const cw = 48;
  const ch = 30;
  const parts: SVGElement[] = [note(x0, 16, 'Share of 30-year starts that lasted, 1871 to 1993', { bold: true })];
  rates.forEach((r, j) => parts.push(small(x0 + j * cw + cw / 2, y0 - 4, pct(r, 1), { anchor: 'middle' })));
  shares.forEach((sh, i) => {
    parts.push(small(x0 - 8, y0 + i * ch + ch / 2 + 3, `${pct(sh, 0)} shares`, { anchor: 'end' }));
    rates.forEach((_, j) => {
      const v = cells[i][j];
      const color = v >= 0.999 ? COL.good : v >= 0.9 ? tint(COL.good, 0.55) : v >= 0.7 ? COL.health : COL.bad;
      parts.push(svg('rect', { x: x0 + j * cw + 1, y: y0 + i * ch + 1, width: cw - 2, height: ch - 2, rx: 3, fill: color, opacity: 0.85 }));
      parts.push(label(x0 + j * cw + cw / 2, y0 + i * ch + ch / 2 + 4, `${Math.round(v * 100)}%`, { anchor: 'middle', fill: v >= 0.9 || v < 0.7 ? '#fff' : COL.ink, bold: true }));
    });
  });
  parts.push(small(x0 + (rates.length * cw) / 2, y0 + shares.length * ch + 16, 'starting withdrawal, raised with prices each year', { anchor: 'middle', soft: true }));
  s.svg.append(...parts);
  return { node: s.node };
};

/** For tests and the lesson: how a 4 percent, 60/40 plan fares, as the figure's guess has it. */
export const fourPercent = () => summarise({ years: 30, rule: { kind: 'constant', rate: 0.04 }, stocks: 0.6, fee: 0 });

