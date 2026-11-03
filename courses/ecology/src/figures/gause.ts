// Lesson 6, Gause's bottles: two species on one food, and MacArthur's
// warblers sharing a spruce.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, player, rk4, slider, toggles } from './kit';

const W = 400;

export interface Pair {
  /** How much the two kinds' diets overlap, 0 to 1: how much each crowds the other, compared with its own kind. */
  overlap: number;
  /** Conditions swing back and forth, favouring each kind in turn. */
  swings: boolean;
  /** Only one kind in the tube: 'a', 'b', or both when absent. */
  alone?: 'a' | 'b';
}

/** Two kinds of Paramecium in a tube, by day, from 2 of each: A grows faster and packs more in on the shared food. */
export function tube(p: Pair, days: number): number[][] {
  const dt = 0.02;
  const out: number[][] = [];
  let y = [p.alone === 'b' ? 0 : 2, p.alone === 'a' ? 0 : 2];
  for (let i = 0; i <= days / dt; i++) {
    if (i % 5 === 0) out.push(y);
    const t = i * dt;
    const swing = p.swings ? 0.45 * Math.sin((2 * Math.PI * t) / 6) : 0;
    const ka = 200 * (1 + swing);
    const kb = 150 * (1 - swing);
    y = rk4(([a, b]) => [
      1.1 * a * (1 - (a + p.overlap * b) / ka),
      0.8 * b * (1 - (b + p.overlap * a) / kb),
    ], y, dt).map((v) => Math.max(0, v));
  }
  return out;
}

export const tubeFigure = figure(['coexist'], (ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  const p: Pair = { overlap: 1, swings: false };
  let day = 0;
  const DAYS = 40;
  const paint = () => {
    const runs = tube(p, DAYS);
    const per = runs.length / DAYS;
    const upto = runs.slice(0, Math.round(day * per) + 1);
    const ax = axes({ x: 46, y: 20, w: 330, h: 170, xmin: 0, xmax: DAYS, ymin: 0, ymax: 300, xticks: [0, 10, 20, 30, 40], yticks: [0, 100, 200, 300], xlabel: 'days', ylabel: 'cells in a drop', ink: COL.ink, grid: COL.grid });
    const series = (k: number) => upto.map((y, i) => [i / per, y[k]] as const);
    const now = upto[upto.length - 1];
    redraw(g, ...ax.parts, ax.path(series(0), COL.prey, 2.4), ax.path(series(1), COL.rival, 2.4),
      ...legend(46, 228, [{ text: 'kind A, the faster grower', color: COL.prey }, { text: 'kind B', color: COL.rival }]));
    if (!open()) return;
    const bShare = now[1] / 150;
    f.readout.textContent = day < 2
      ? 'Two of each kind in a tube of broth. Press Play.'
      : bShare < 0.05 && day > 15
        ? `Day ${Math.round(day)}: kind B is gone${p.swings ? ', though the swings kept it going for longer' : ''}. With this much overlap, every cell of A takes food B would have eaten, and A is the better at it.`
        : day >= DAYS - 1 && bShare > 0.2
          ? `Both kinds are still here after ${DAYS} days, at steady numbers: each crowds its own kind more than the other, so neither can push the other out.`
          : `Day ${Math.round(day)}: ${Math.round(now[0])} of A, ${Math.round(now[1])} of B in a drop.`;
    if (day >= 30 && p.overlap <= 0.7 && bShare > 0.2) t.done();
  };
  const days = slider('Day', 0, DAYS, 0.5, 0, (v) => `${Math.round(v)}`, (v) => { day = v; paint(); }, 'model');
  const play = player(days, ctx, { seconds: 8 });
  const overlap = slider('Diets overlap', 0, 1, 0.05, p.overlap, (v) => `${Math.round(v * 100)}%`, (v) => { p.overlap = v; paint(); }, 'heat');
  const sw = toggles(['Conditions swing'], [false], (on) => { p.swings = on[0]; paint(); });
  f.controls.append(play.node, days.node, overlap.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'Two kinds of Paramecium eat exactly the same food in the same way. One grows a little faster. After a month in the same tube, what is left?',
    options: ['Both, sharing the food', 'Only one kind', 'Neither'],
    answer: 1,
    reveal: 'done',
    sliders: [days, overlap],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- MacArthur's warblers ------------------------------------------------------------------

/** The five warblers and where in a spruce each fed most, simplified from MacArthur's 1958 drawings. */
const WARBLERS = [
  { name: 'Cape May', where: 'top, outer tips', color: '#c98a2e', zones: ['top-out'] },
  { name: 'Blackburnian', where: 'top, outer and new growth', color: '#c4462f', zones: ['top-in', 'mid-out-high'] },
  { name: 'Black-throated green', where: 'middle, outer', color: '#4f8a3c', zones: ['mid-out'] },
  { name: 'Bay-breasted', where: 'middle, near the trunk', color: '#7a3b6e', zones: ['mid-in'] },
  { name: 'Yellow-rumped', where: 'low branches and ground', color: '#2f7f9a', zones: ['low'] },
] as const;

export const warblerStill = () => {
  const s = still(W, 250);
  const cx = 120;
  // The spruce as a stack of bands; each band split into the part near the trunk and the outer part.
  const at = (y: number) => 14 + y; // y down from the tip
  const half = (y: number) => 8 + y * 0.42;
  const band = (y0: number, y1: number, inner: boolean, fill: string) => {
    const f = inner ? 0.45 : 1;
    const g = inner ? 0 : 0.45;
    const pts = [
      [cx - half(y0) * f, at(y0)], [cx - half(y0) * g, at(y0)], [cx - half(y1) * g, at(y1)], [cx - half(y1) * f, at(y1)],
    ];
    const mirror = pts.map(([x, y]) => [2 * cx - x, y]);
    return [
      svg('polygon', { points: pts.map((p) => p.join(',')).join(' '), fill, stroke: COL.paper, 'stroke-width': 1 }),
      svg('polygon', { points: mirror.map((p) => p.join(',')).join(' '), fill, stroke: COL.paper, 'stroke-width': 1 }),
    ];
  };
  const zone: Record<string, string> = {};
  for (const w of WARBLERS) for (const z of w.zones) zone[z] = w.color;
  const tree = [
    ...band(0, 60, false, zone['top-out']),
    ...band(0, 60, true, zone['top-in']),
    ...band(60, 90, false, zone['mid-out-high']),
    ...band(60, 90, true, zone['mid-in']),
    ...band(90, 150, false, zone['mid-out']),
    ...band(90, 150, true, zone['mid-in']),
    ...band(150, 215, false, zone.low),
    ...band(150, 215, true, zone.low),
  ];
  s.svg.append(
    svg('rect', { width: W, height: 250, fill: COL.paper }),
    ...tree,
    line(cx, at(0), cx, 244, '#6b4f3a', 4),
    line(20, 244, 230, 244, COL.soil, 2),
    ...WARBLERS.flatMap((w, i) => [
      svg('rect', { x: 250, y: 30 + i * 40, width: 14, height: 14, fill: w.color, rx: 2 }),
      label(270, 41 + i * 40, w.name, { bold: true }),
      small(270, 54 + i * 40, w.where, { soft: true }),
    ]),
  );
  return { node: s.node };
};
