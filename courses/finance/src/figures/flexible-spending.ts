// Lesson 5, Spending rules that bend: one start year run through five
// spending rules, spending above and balance below; and a table of how each
// rule did over every start.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small, still } from 'didactics/draw';
import { cycle, simulate, starts, type Path, type Rule } from '../engine/history';
import { axes, COL, figure, frame, guessFirst, k, slider } from './kit';
import { pick } from './plot';

const W = 400;
const YEARS = 30;
const STOCKS = 0.6;
const START = 1_000_000;

export const RULES: readonly { name: string; short: string; rule: Rule; says: string }[] = [
  { name: 'Fixed 4%', short: 'Fixed', rule: { kind: 'constant', rate: 0.04 }, says: '4 percent of the first balance, raised with prices' },
  { name: '4% of balance', short: 'Percent', rule: { kind: 'percent', rate: 0.04 }, says: '4 percent of whatever the balance is each January' },
  { name: 'Guardrails', short: 'Guardrails', rule: { kind: 'guardrails', rate: 0.05, band: 0.2, cut: 0.1 }, says: 'start at 5 percent; cut 10 percent when spending passes 6 percent of the balance, raise 10 percent below 4' },
  { name: 'VPW', short: 'VPW', rule: { kind: 'vpw', assumed: 0.035 }, says: 'the payment that would empty the balance over the years left, at a 3.5 percent real return' },
  { name: 'Floor and ceiling', short: 'Floor', rule: { kind: 'floor', rate: 0.045, floor: 0.75, ceiling: 1.25 }, says: '4.5 percent of the balance, but never below 75 or above 125 percent of the first year' },
];

const lowest = (p: Path) => Math.min(...p.spending);
const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export const rulesFigure = figure(['rules'], (_ctx, t) => {
  const f = frame(W, 290, 3);
  const g = svg('g');
  f.svg.append(g);
  let which = 1;
  let start = 1966;
  const seen = new Set<number>();
  const paint = () => {
    const r = RULES[which];
    const p = simulate({ start, years: YEARS, stocks: STOCKS, rule: r.rule }, START);
    const fixed = simulate({ start, years: YEARS, stocks: STOCKS, rule: RULES[0].rule }, START);
    const top = axes({ x: 48, y: 18, w: 336, h: 100, xmin: 0, xmax: YEARS, ymin: 0, ymax: 100_000, xticks: [], yticks: [0, 50_000, 100_000], yfmt: k, ylabel: 'spending this year, today’s dollars', ink: COL.ink, grid: COL.grid });
    const bot = axes({ x: 48, y: 152, w: 336, h: 100, xmin: 0, xmax: YEARS, ymin: 0, ymax: 3_000_000, xticks: [0, 5, 10, 15, 20, 25, 30], yticks: [0, 1_000_000, 2_000_000, 3_000_000], yfmt: k, xlabel: `years from January ${start}`, ylabel: 'balance', ink: COL.ink, grid: COL.grid });
    const step = (vals: readonly number[]) => vals.flatMap((v, i) => [[i, v], [i + 1, v]] as const);
    redraw(g, ...top.parts, ...bot.parts,
      ...(which ? [top.path(step(fixed.spending), COL.soft, 1.2, { 'stroke-dasharray': '4 3' }), bot.path(fixed.balance.map((b, i) => [i, b] as const), COL.soft, 1.2, { 'stroke-dasharray': '4 3' })] : []),
      top.path(step(p.spending), COL.spending, 2.2),
      bot.path(p.balance.map((b, i) => [i, Math.min(3_050_000, b)] as const), p.ranOut >= 0 ? COL.bad : COL.balance, 2.2),
      ...(p.ranOut >= 0 ? [label(bot.X(p.ranOut), bot.Y(0) - 8, 'empty', { anchor: 'middle', fill: COL.bad, bold: true })] : []),
      note(48, 284, which ? `${r.name}; dashed: fixed 4%` : r.name, { fill: COL.ink }),
    );
    if (!open()) return;
    seen.add(which);
    const low = lowest(p);
    f.readout.textContent = `${r.name} (${r.says}), from ${start}: first year ${k(p.spending[0])}, lowest ${k(low)}, average ${k(mean(p.spending))}`
      + (p.ranOut >= 0 ? `, and the money ran out in year ${p.ranOut + 1}.` : `, ending with ${k(p.balance[YEARS])}.`);
    if (seen.size >= 4) t.done();
  };
  const chips = pick(RULES.map((r) => r.short), which, (i) => { which = i; paint(); });
  const sY = slider('Retired in', starts(YEARS)[0], starts(YEARS)[starts(YEARS).length - 1], 1, start, String, (v) => { start = v; paint(); }, 'balance');
  f.controls.append(chips.node, sY.node);
  const open = guessFirst(t, f, {
    ask: 'Retire in 1966 with $1,000,000 in 60/40 and spend 4 percent of whatever the balance is each January. The money can never run out. In the worst year, how much did that come to?',
    options: ['About $34,000', 'About $25,000', 'About $15,000'],
    answer: 2,
    sliders: [sY],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

export interface RuleRow {
  name: string;
  first: number;
  fails: number;
  /** The lowest single year of spending in any start, per $1 of first balance. */
  worst: number;
  /** One start in ten had a lowest year at or below this. */
  tenth: number;
  medianAverage: number;
  medianEnd: number;
}

export function ruleTable(years = YEARS): RuleRow[] {
  const mid = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  return RULES.map((r) => {
    const runs = cycle({ years, stocks: STOCKS, rule: r.rule }, 1);
    const lows = runs.map((x) => lowest(x.path)).sort((a, b) => a - b);
    return {
      name: r.name,
      first: runs[0].path.spending[0],
      fails: runs.filter((x) => x.path.ranOut >= 0).length,
      worst: lows[0],
      tenth: lows[Math.floor(lows.length * 0.1)],
      medianAverage: mid(runs.map((x) => mean(x.path.spending))),
      medianEnd: mid(runs.map((x) => x.path.balance[years])),
    };
  });
}

export const rulesTableStill = () => {
  const s = still(W, 214);
  const rows = ruleTable();
  const n = starts(YEARS).length;
  const cols = [
    { head: 'first year', x: 150, val: (r: RuleRow) => k(r.first * START) },
    { head: 'ran out', x: 205, val: (r: RuleRow) => (r.fails ? `${r.fails} of ${n}` : 'never') },
    { head: 'worst year', x: 262, val: (r: RuleRow) => k(r.worst * START) },
    { head: 'typical avg', x: 324, val: (r: RuleRow) => k(r.medianAverage * START) },
    { head: 'typical end', x: 386, val: (r: RuleRow) => k(r.medianEnd * START) },
  ];
  const parts: SVGElement[] = [note(10, 16, `Every 30-year start, ${starts(YEARS)[0]} to ${starts(YEARS)[n - 1]}: $1,000,000 in 60/40`, { bold: true })];
  cols.forEach((c) => parts.push(small(c.x, 40, c.head, { anchor: 'end', soft: true })));
  rows.forEach((r, i) => {
    const y = 64 + i * 26;
    parts.push(line(10, y + 9, 390, y + 9, COL.grid, 1));
    parts.push(label(10, y, r.name, { bold: true, fill: i === 0 ? COL.ink : COL.spending }));
    cols.forEach((c) => parts.push(label(c.x, y, c.val(r), { anchor: 'end', fill: c.head === 'ran out' && r.fails ? COL.bad : COL.ink })));
  });
  parts.push(small(10, 206, 'Typical: the median start. Worst year: the lowest year in any start.', { soft: true }));
  s.svg.append(...parts);
  return { node: s.node };
};
