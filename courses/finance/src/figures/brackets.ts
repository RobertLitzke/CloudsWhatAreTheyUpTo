// Lesson 7, How a federal return stacks: ordinary income fills the brackets
// from the bottom, long-term gains sit on top of it with their own three
// rates; and the marginal rate on the next dollar of ordinary income, which
// jumps where that dollar pushes gains out of the 0 percent band.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { RULES } from '../engine/rules';
import { federalTax, marginalRate, type Status } from '../engine/tax';
import { axes, COL, figure, frame, guessFirst, k, pct, slider, tint, usd } from './kit';
import { pick } from './plot';

const W = 400;
const STATUS: readonly Status[] = ['joint', 'single'];
const NAMES = ['Married, joint', 'Single'];

/** Shade for an ordinary rate, light to dark. */
const shade = (r: number) => tint(COL.tax, Math.min(1, 0.12 + r * 2.2));

export const stackFigure = figure(['stack'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let status: Status = 'joint';
  let ordinary = 0;
  let gains = 120_000;
  let moved = 0;
  const paint = () => {
    const fed = RULES.federal;
    const ded = fed.standardDeduction[status];
    const max = status === 'joint' ? 320_000 : 180_000;
    const X = (v: number) => 20 + (Math.min(v, max) / max) * 360;
    const parts: SVGElement[] = [];
    // Row 1: the ordinary brackets, shifted up by the standard deduction.
    const rowA = 40;
    const br = fed.brackets[status];
    parts.push(small(20, rowA - 6, 'Brackets for ordinary income (wages, pre-tax withdrawals, interest)', { soft: true }));
    parts.push(svg('rect', { x: X(0), y: rowA, width: X(ded) - X(0), height: 18, fill: tint(COL.good, 0.35) }));
    parts.push(small((X(0) + X(ded)) / 2, rowA + 13, '0%', { anchor: 'middle' }));
    br.forEach(([lo, r], i) => {
      const hi = i + 1 < br.length ? br[i + 1][0] : Infinity;
      if (ded + lo >= max) return;
      const x0 = X(ded + lo);
      const x1 = X(Math.min(max, ded + hi));
      parts.push(svg('rect', { x: x0, y: rowA, width: x1 - x0, height: 18, fill: shade(r) }));
      if (x1 - x0 > 22) parts.push(small((x0 + x1) / 2, rowA + 13, pct(r, 0), { anchor: 'middle', fill: r > 0.2 ? '#fff' : COL.ink }));
    });
    // Row 2: the gains bands.
    const rowB = 86;
    const z = ded + fed.gains.zeroTop[status];
    const ft = ded + fed.gains.fifteenTop[status];
    parts.push(small(20, rowB - 6, 'Bands for long-term gains and qualified dividends', { soft: true }));
    parts.push(svg('rect', { x: X(0), y: rowB, width: X(z) - X(0), height: 18, fill: tint(COL.good, 0.35) }));
    parts.push(small((X(0) + X(z)) / 2, rowB + 13, '0%', { anchor: 'middle' }));
    parts.push(svg('rect', { x: X(z), y: rowB, width: X(Math.min(max, ft)) - X(z), height: 18, fill: tint(COL.gains, 0.6) }));
    parts.push(small((X(z) + X(Math.min(max, ft))) / 2, rowB + 13, '15%', { anchor: 'middle' }));
    // Row 3: this household's income, ordinary first, gains on top.
    const rowC = 134;
    const r = federalTax({ pretax: ordinary, gains }, { status });
    parts.push(small(20, rowC - 6, 'This household’s income, stacked: ordinary first, gains on top', { bold: true }));
    if (ordinary > 0) parts.push(svg('rect', { x: X(0), y: rowC, width: X(ordinary) - X(0), height: 22, fill: COL.pretax }));
    if (gains > 0) parts.push(svg('rect', { x: X(ordinary), y: rowC, width: X(ordinary + gains) - X(ordinary), height: 22, fill: COL.gains }));
    for (const xv of [ded, z]) parts.push(line(X(xv), rowA, X(xv), rowC + 30, COL.ink, 0.8, { 'stroke-dasharray': '2 2' }));
    parts.push(small(X(z), rowC + 40, `${k(z)}: top of 0% gains`, { anchor: X(z) > 300 ? 'end' : 'middle', soft: true }));
    // Ticks.
    for (let v = 0; v <= max; v += status === 'joint' ? 80_000 : 40_000) parts.push(small(X(v), 196, k(v), { anchor: 'middle', soft: true }));
    parts.push(line(20, 186, 380, 186, COL.ink, 1));
    parts.push(note(20, 226, `Federal tax ${usd(r.total)}: ${usd(r.ordinaryTax)} on ordinary income, ${usd(r.gainsTax)} on gains${r.niit ? `, ${usd(r.niit)} surtax` : ''}`, { fill: COL.ink, bold: true }));
    redraw(g, ...parts);
    if (!open()) return;
    const total = ordinary + gains;
    const mo = marginalRate({ pretax: ordinary, gains }, 'pretax', { status }, 1000);
    const mg = marginalRate({ pretax: ordinary, gains }, 'gains', { status }, 1000);
    f.readout.textContent = `${NAMES[STATUS.indexOf(status)]}, ${k(ordinary)} ordinary and ${k(gains)} gains: ${usd(r.total)} of tax, ${pct(total ? r.total / total : 0, 1)} of income. `
      + `The next $1,000 of ordinary income would cost ${pct(mo, 0)} in tax; the next $1,000 of gains, ${pct(mg, 0)}.`;
    if (moved === 3) t.done();
  };
  const chips = pick(NAMES, 0, (i) => { status = STATUS[i]; paint(); });
  const sO = slider('Ordinary income', 0, 250_000, 5_000, ordinary, k, (v) => { ordinary = v; moved |= 1; paint(); }, 'pretax');
  const sG = slider('Long-term gains', 0, 250_000, 5_000, gains, k, (v) => { gains = v; moved |= 2; paint(); }, 'gains');
  f.controls.append(chips.node, sO.node, sG.node);
  const open = guessFirst(t, f, {
    ask: 'A married couple has no wages and lives on $120,000 a year of long-term capital gains and qualified dividends. How much federal income tax do they owe in 2026?',
    options: ['Nothing', 'About $6,000', 'About $18,000'],
    answer: 0,
    sliders: [sO, sG],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

/** The marginal federal rate on the next dollar of ordinary income, across a range, with a fixed amount of gains. */
export function marginalCurve(gains: number, status: Status, max: number, step = 1000): [number, number][] {
  const out: [number, number][] = [];
  for (let o = 0; o <= max; o += step) out.push([o, marginalRate({ pretax: o, gains }, 'pretax', { status }, step)]);
  return out;
}

export const marginalFigure = figure(['marginal'], (_ctx, t) => {
  const f = frame(W, 226, 3);
  const g = svg('g');
  f.svg.append(g);
  let gains = 0;
  let at = 60_000;
  let sawBump = false;
  const status: Status = 'joint';
  const max = 300_000;
  const paint = () => {
    const a = axes({ x: 40, y: 20, w: 344, h: 160, xmin: 0, xmax: max, ymin: 0, ymax: 0.4, xticks: [0, 50_000, 100_000, 150_000, 200_000, 250_000], yticks: [0, 0.1, 0.2, 0.3, 0.4], xfmt: k, yfmt: (v) => pct(v, 0), xlabel: 'ordinary income (a couple, filing jointly)', ylabel: 'tax on the next dollar of ordinary income', ink: COL.ink, grid: COL.grid });
    const curve = marginalCurve(gains, status, max, 1000);
    const step = curve.flatMap(([x, y], i) => (i + 1 < curve.length ? [[x, y], [curve[i + 1][0], y]] : [[x, y]]) as [number, number][]);
    const base = marginalCurve(0, status, max, 1000);
    const baseStep = base.flatMap(([x, y], i) => (i + 1 < base.length ? [[x, y], [base[i + 1][0], y]] : [[x, y]]) as [number, number][]);
    const m = marginalRate({ pretax: at, gains }, 'pretax', { status }, 1000);
    redraw(g, ...a.parts,
      ...(gains ? [a.path(baseStep, COL.soft, 1.2, { 'stroke-dasharray': '4 3' })] : []),
      a.path(step, COL.tax, 2.2),
      line(a.X(at), a.Y(0), a.X(at), a.Y(m), COL.pretax, 1, { 'stroke-dasharray': '2 2' }),
      svg('circle', { cx: a.X(at), cy: a.Y(m), r: 4.5, fill: COL.pretax }),
      label(a.X(at) + (at > 220_000 ? -8 : 8), a.Y(m) - 8, pct(m, 1), { ...(at > 220_000 ? { anchor: 'end' as const } : {}), fill: COL.pretax, bold: true }),
      note(40, 218, gains ? `With ${k(gains)} of long-term gains on top; dashed: no gains` : 'No gains on top: just the brackets, after the deduction', { soft: true }),
    );
    const bump = gains > 0 && m > 0.25 && at < 150_000;
    if (bump) sawBump = true;
    f.readout.textContent = `At ${k(at)} of ordinary income${gains ? ` with ${k(gains)} of gains` : ''}, the next $1,000 of ordinary income costs ${usd(m * 1000)} in federal tax. `
      + (bump ? 'Higher than the bracket: each extra dollar is taxed at the bracket rate and also pushes a dollar of gains out of the 0 percent band into 15 percent.' : gains ? 'Look for where the line rises above the dashed brackets.' : 'Add some gains.');
    if (sawBump) t.done();
  };
  const sA = slider('Ordinary income', 0, max, 5_000, at, k, (v) => { at = v; paint(); }, 'pretax');
  const sG = slider('Gains on top', 0, 150_000, 5_000, gains, k, (v) => { gains = v; paint(); }, 'gains');
  f.controls.append(sA.node, sG.node);
  paint();
  return f.node;
});
