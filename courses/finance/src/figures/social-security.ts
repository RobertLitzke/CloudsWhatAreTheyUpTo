// Lesson 13, Social Security, worked out: the benefit formula from years of
// earnings, and what claiming at 62, 67 or 70 adds up to by the age of death.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { aime, claimFactor, lifetime, pia } from '../engine/social-security';
import { RULES } from '../engine/rules';
import { axes, COL, figure, frame, guessFirst, k, pct, slider, tint, usd } from './kit';
import { legend } from './plot';

const W = 400;

export const formulaFigure = figure(['formula'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let earnings = 150_000;
  let years = 20;
  const seen = new Set<string>();
  const [b1, b2] = RULES.socialSecurity.bendPoints;
  const maxA = 16_000;
  const paint = () => {
    const a = axes({ x: 46, y: 20, w: 338, h: 160, xmin: 0, xmax: maxA, ymin: 0, ymax: 4_500, xticks: [0, 4_000, 8_000, 12_000, 16_000], yticks: [0, 1_000, 2_000, 3_000, 4_000], xfmt: k, yfmt: (v) => `$${(v / 1000).toFixed(0)}k`, xlabel: 'average monthly earnings over 35 years (AIME)', ylabel: 'monthly benefit at 67', ink: COL.ink, grid: COL.grid });
    const pts: [number, number][] = [];
    for (let x = 0; x <= maxA; x += 100) pts.push([x, pia(x)]);
    const my = aime(earnings, years);
    const full = aime(earnings, 35);
    redraw(g, ...a.parts,
      svg('rect', { x: a.X(0), y: 20, width: a.X(b1) - a.X(0), height: 160, fill: tint(COL.good, 0.12) }),
      svg('rect', { x: a.X(b1), y: 20, width: a.X(b2) - a.X(b1), height: 160, fill: tint(COL.ss, 0.08) }),
      small(a.X(b1 / 2), 32, '90%', { anchor: 'middle', bold: true, fill: COL.good }),
      small(a.X((b1 + b2) / 2), 32, '32% of each dollar', { anchor: 'middle', bold: true, fill: COL.ss }),
      small(a.X((b2 + maxA) / 2), 32, '15%', { anchor: 'middle', bold: true, fill: COL.soft }),
      a.path(pts, COL.ss, 2.4),
      ...(years < 35 ? [svg('circle', { cx: a.X(full), cy: a.Y(pia(full)), r: 3.5, fill: 'none', stroke: COL.ss, 'stroke-width': 1.5 }), small(a.X(full), a.Y(pia(full)) + 16, '35 years', { anchor: 'middle', soft: true })] : []),
      svg('circle', { cx: a.X(my), cy: a.Y(pia(my)), r: 5, fill: COL.spending }),
      label(a.X(my) + 7, a.Y(pia(my)) + 16, `${usd(pia(my))} a month`, { bold: true, fill: COL.spending }),
      note(46, 224, `Earning ${k(earnings)} a year for ${years} years, in today’s dollars`, { soft: true }),
    );
    if (!open()) return;
    seen.add(years >= 35 ? 'full' : years <= 15 ? 'short' : 'mid');
    const drop = 1 - pia(my) / pia(full);
    f.readout.textContent = `${years} years at ${k(Math.min(earnings, RULES.socialSecurity.taxableMax))} counted: ${usd(pia(my))} a month at 67`
      + (years < 35 ? `, ${pct(drop, 0)} less than working all 35 years, for ${pct(1 - years / 35, 0)} fewer years. The formula's top tier pays only 15 cents a dollar, so the last years of a high earner add little.` : '.');
    if (seen.has('full') && seen.has('short')) t.done();
  };
  const sE = slider('Earnings a year', 20_000, 250_000, 5_000, earnings, k, (v) => { earnings = v; paint(); }, 'wages');
  const sY = slider('Years worked', 10, 40, 1, years, (v) => `${v} years`, (v) => { years = v; paint(); }, 'ss');
  f.controls.append(sE.node, sY.node);
  const open = guessFirst(t, f, {
    ask: 'Someone earns $150,000 a year in today’s money and stops after 20 years instead of 35. Their benefit is based on the average of 35 years, so 15 count as zero. How much lower is their benefit than if they had worked all 35?',
    options: ['About 43 percent lower', 'About a quarter lower', 'About a tenth lower'],
    answer: 1,
    sliders: [sE, sY],
    after: () => paint(),
  });
  paint();
  return f.node;
});

const AGES = [62, 67, 70] as const;
const AGE_COL = [COL.bad, COL.ss, COL.good];

export const claimFigure = figure(['claim'], (_ctx, t) => {
  const f = frame(W, 226, 3);
  const g = svg('g');
  f.svg.append(g);
  let full = 3_000;
  let claim = 67;
  const tried = new Set<number>();
  const paint = () => {
    const top = Math.ceil((lifetime(full, 70, 100) * 1.05) / 250_000) * 250_000;
    const a = axes({ x: 50, y: 20, w: 334, h: 160, xmin: 62, xmax: 100, ymin: 0, ymax: top, xticks: [62, 70, 80, 90, 100], yticks: [0, top / 2, top], yfmt: k, xlabel: 'age at death', ylabel: 'total benefits received, today’s dollars', ink: COL.ink, grid: COL.grid });
    const curve = (c: number) => Array.from({ length: 39 }, (_, i) => [62 + i, lifetime(full, c, 62 + i)] as [number, number]);
    const lines = AGES.map((c, i) => a.path(curve(c), AGE_COL[i], c === claim ? 2.6 : 1.4, c === claim ? {} : { 'stroke-dasharray': '4 3' }));
    const mine = AGES.includes(claim as 62 | 67 | 70) ? [] : [a.path(curve(claim), COL.spending, 2.6)];
    // Where 70 overtakes 62.
    let cross = 0;
    for (let d = 70.1; d <= 100; d += 0.1) if (lifetime(full, 70, d) >= lifetime(full, 62, d)) { cross = d; break; }
    redraw(g, ...a.parts, ...lines, ...mine,
      ...(cross ? [line(a.X(cross), a.Y(0), a.X(cross), a.Y(lifetime(full, 70, cross)), COL.ink, 0.8, { 'stroke-dasharray': '2 3' }), small(a.X(cross) + 3, a.Y(0) - 6, `70 passes 62 at ${cross.toFixed(1)}`, { soft: true })] : []),
      ...legend(50, 216, AGES.map((c, i) => ({ text: `claim at ${c}`, color: AGE_COL[i] }))),
    );
    tried.add(claim);
    const m = full * claimFactor(claim);
    f.readout.textContent = `Claiming at ${claim}: ${usd(m)} a month, ${pct(claimFactor(claim), 0)} of the full benefit, for life and rising with prices. `
      + `Waiting to 70 instead of claiming at 62 pays off for anyone who lives past about ${cross.toFixed(0)}.`;
    if (tried.size >= 3) t.done();
  };
  const sF = slider('Benefit at 67', 1_000, 5_000, 100, full, (v) => `${usd(v)} a month`, (v) => { full = v; paint(); }, 'ss');
  const sC = slider('Claim at', 62, 70, 1, claim, String, (v) => { claim = v; paint(); }, 'spending');
  f.controls.append(sF.node, sC.node);
  paint();
  return f.node;
});
