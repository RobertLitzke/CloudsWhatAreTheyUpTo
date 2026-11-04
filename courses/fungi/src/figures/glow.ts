// Lesson 12, Foxfire: the fungal light cycle (a still), and the decoy
// experiment, fake mushrooms lit green or left dark on a forest floor,
// counted night by night.

import { svg } from 'didactics/dom';
import { arrow, label, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;

// ---- The light cycle (still) -----------------------------------------------------------------------

export const cycleLightStill = () => {
  const s = still(W, 220);
  const parts: SVGElement[] = [];
  const cx = 200;
  const cy = 112;
  const r = 60;
  const nodes = [
    { a: -90, name: 'caffeic acid', body: 'a common plant and fungus chemical' },
    { a: 0, name: 'hispidin', body: '' },
    { a: 90, name: 'luciferin', body: 'the molecule that will glow' },
    { a: 180, name: 'spent luciferin', body: '' },
  ];
  const at = (a: number, rr = r) => [cx + rr * Math.cos((a * Math.PI) / 180), cy + rr * Math.sin((a * Math.PI) / 180)] as const;
  for (let i = 0; i < 4; i++) {
    const a0 = nodes[i].a + 22;
    const a1 = nodes[(i + 1) % 4].a + (i === 3 ? 360 : 0) - 22;
    const steps = 8;
    const pts = Array.from({ length: steps + 1 }, (_, k) => at(a0 + ((a1 - a0) * k) / steps));
    parts.push(svg('polyline', { points: pts.map((p) => p.join(',')).join(' '), stroke: COL.hypha, 'stroke-width': 2, fill: 'none' }));
    const [x1, y1] = pts[steps - 1];
    const [x2, y2] = pts[steps];
    parts.push(arrow(x1, y1, x2, y2, COL.hypha, 2));
  }
  for (const n of nodes) {
    const [x, y] = at(n.a);
    parts.push(svg('circle', { cx: x, cy: y, r: 5, fill: n.name === 'luciferin' ? COL.glow : COL.hypha }));
    const anchor = n.a === 0 ? undefined : n.a === 180 ? ('end' as const) : ('middle' as const);
    const dx = n.a === 0 ? 10 : n.a === 180 ? -10 : 0;
    const dy = n.a === -90 ? -24 : n.a === 90 ? 22 : 4;
    parts.push(label(x + dx, y + dy, n.name, { anchor, bold: true }));
    if (n.body) parts.push(small(x + dx, y + dy + 12, n.body, { anchor, soft: true }));
  }
  // The flash, between luciferin and spent luciferin.
  const [lx, ly] = at(135, r + 6);
  parts.push(
    svg('circle', { cx: lx, cy: ly, r: 14, fill: COL.glow, opacity: 0.25 }),
    svg('circle', { cx: lx, cy: ly, r: 7, fill: COL.glow, opacity: 0.6 }),
    small(lx - 6, ly + 26, 'with oxygen: green light', { anchor: 'end', fill: '#2c8a5a', bold: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- The decoys -------------------------------------------------------------------------------------

/** Insects caught on one lit and one dark decoy on each night (a fixed, made-up run with the means below). */
const LIT = [3, 1, 4, 2, 0, 5, 2, 3, 1, 4, 2, 3, 6, 1, 2, 3, 2, 4, 1, 3];
const DARK = [1, 2, 0, 1, 0, 2, 1, 0, 3, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0];

export function decoys(nights: number): { lit: number; dark: number; litNights: number[]; darkNights: number[] } {
  const litNights = LIT.slice(0, nights);
  const darkNights = DARK.slice(0, nights);
  return { lit: litNights.reduce((a, b) => a + b, 0), dark: darkNights.reduce((a, b) => a + b, 0), litNights, darkNights };
}

/** Rough check: is the lit total clear of chance? (a sign test on nights where one side won) */
export function clearWin(litNights: readonly number[], darkNights: readonly number[]): boolean {
  let wins = 0;
  let n = 0;
  litNights.forEach((l, i) => { if (l !== darkNights[i]) { n++; if (l > darkNights[i]) wins++; } });
  if (n === 0) return false;
  // Two-sided 95%: wins must exceed n/2 by about 1.96 standard deviations.
  return wins - n / 2 > 1.96 * Math.sqrt(n) / 2;
}

export const decoyFigure = figure(['nights'], (_ctx, t) => {
  const f = frame(W, 190, 3);
  const g = svg('g');
  f.svg.append(g);
  let nights = 1;
  const paint = () => {
    const d = decoys(nights);
    const win = clearWin(d.litNights, d.darkNights);
    const mush = (x: number, lit: boolean): SVGElement[] => [
      ...(lit ? [svg('ellipse', { cx: x, cy: 70, rx: 30, ry: 20, fill: COL.glow, opacity: 0.22 })] : []),
      svg('rect', { x: x - 4, y: 68, width: 8, height: 22, fill: lit ? '#bff0cf' : '#b9b0a2' }),
      svg('path', { d: `M${x - 20},70 Q${x},40 ${x + 20},70 Z`, fill: lit ? COL.glow : '#8d8478' }),
    ];
    const bar = (x: number, n: number, col: string) => {
      const h = Math.min(110, n * 2);
      return [svg('rect', { x, y: 170 - h, width: 34, height: h, fill: col }), small(x + 17, 164 - h, `${n}`, { anchor: 'middle', bold: true })];
    };
    redraw(g,
      svg('rect', { x: 0, y: 90, width: 200, height: 100, fill: '#2e2a26' }),
      svg('rect', { x: 0, y: 0, width: 200, height: 90, fill: '#14161f' }),
      ...mush(60, true), ...mush(140, false),
      small(60, 110, 'lit green', { anchor: 'middle', fill: '#bff0cf', bold: true }),
      small(140, 110, 'dark', { anchor: 'middle', fill: '#d8d0c4', bold: true }),
      small(100, 140, 'sticky glue on each', { anchor: 'middle', fill: '#d8d0c4' }),
      label(300, 20, `Insects caught in ${nights} night${nights === 1 ? '' : 's'}`, { anchor: 'middle', bold: true }),
      ...bar(250, d.lit, COL.glow), ...bar(316, d.dark, '#8d8478'),
      small(267, 184, 'lit', { anchor: 'middle' }), small(333, 184, 'dark', { anchor: 'middle' }),
    );
    if (!open()) return;
    f.readout.textContent = nights < 3
      ? 'One or two nights prove nothing: a moth that happened past, or a gust of wind, decides the count.'
      : win
        ? `After ${nights} nights the lit decoy has won so often that chance is a poor explanation: insects are drawn to the glow.`
        : `After ${nights} nights the lit decoy is ahead, but not yet by more than chance could give. Keep counting.`;
    if (win && nights >= 10) t.done();
  };
  const ns = slider('Nights', 1, 20, 1, nights, (v) => `${v}`, (v) => { nights = v; paint(); }, 'glow');
  f.controls.append(ns.node);
  const open = guessFirst(t, f, {
    ask: 'Fake mushrooms, some lit with a green light and some dark, are set out on a forest floor at night. Will more insects land on the lit ones?',
    options: ['Yes', 'No, the same', 'Fewer: insects avoid light'],
    answer: 0,
    sliders: [ns],
    after: () => paint(),
  });
  paint();
  return f.node;
});
