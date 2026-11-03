// Lesson 6, Higher than a pump can lift: the pull on a tree's water column,
// and a suction pump beside a tree.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, slider, wrapped } from './kit';

const W = 400;

/** The water column of a tree: the pull (tension, MPa) in its leaves, its parts, how open its pores are, and the share of pipes broken by air bubbles. */
export function column(height: number, airDry: number, soilDry: number) {
  const soil = soilDry * 2.5;
  const gravity = 0.01 * height;
  // Pores close as the pull from soil and height alone nears 2.2 MPa, which cuts the flow.
  const open = Math.max(0.1, Math.min(1, (2.4 - soil - gravity) / 1.2));
  const flow = 1.4 * airDry * open;
  const tension = soil + gravity + flow;
  const broken = Math.max(0, Math.min(1, (tension - 2.6) / 1.6));
  return { tension, soil, gravity, flow, open, broken };
}

export const columnFigure = figure(['embolism'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let height = 40;
  let airDry = 0.5;
  let soilDry = 0.2;
  const paint = () => {
    const c = column(height, airDry, soilDry);
    const ground = 222;
    const top = ground - (height / 120) * 190;
    const rng = makeRng(1894);
    const pipes: SVGElement[] = [];
    for (let i = 0; i < 7; i++) {
      const x = 68 + i * 4;
      const broken = rng() < c.broken;
      pipes.push(line(x, top + 10, x, ground + 10, broken ? COL.soft : COL.water, 2, broken ? { 'stroke-dasharray': '2 5', opacity: 0.6 } : {}));
      if (broken) pipes.push(svg('circle', { cx: x, cy: top + 20 + rng() * (ground - top - 30), r: 3, fill: '#ffffff', stroke: COL.soft }));
    }
    const crown = Math.max(18, 30 * (height / 120) + 14);
    const bar = (x: number, y: number, w: number, color: string) => svg('rect', { x, y, width: Math.max(0, w), height: 18, fill: color });
    const scale = 38;
    redraw(g,
      svg('rect', { x: 0, y: ground, width: 180, height: 18, fill: COL.soil, opacity: 0.5 + soilDry * 0.4 }),
      svg('rect', { x: 62, y: top + 6, width: 32, height: ground - top - 6, fill: COL.bark, opacity: 0.35 }),
      svg('ellipse', { cx: 78, cy: top + 6, rx: crown, ry: crown * 0.7, fill: COL.leaf, opacity: 0.85 * (0.5 + 0.5 * (1 - c.broken)) }),
      ...pipes,
      ...[0, 0.3, 0.6].map((k) => line(78, ground + 10, 50 + k * 60, ground + 16, COL.wood, 1.6)),
      small(110, top + 2, `${height} m`, { bold: true }),
      label(200, 30, 'The pull on water in the leaves', { bold: true }),
      bar(200, 42, c.soil * scale, COL.soil),
      bar(200 + c.soil * scale, 42, c.gravity * scale, COL.wood),
      bar(200 + (c.soil + c.gravity) * scale, 42, c.flow * scale, COL.water),
      small(200, 76, `${c.tension.toFixed(1)} MPa below zero`, { bold: true, fill: COL.water }),
      svg('rect', { x: 200, y: 88, width: 9, height: 9, fill: COL.soil }), small(214, 96, `dry soil holding on: ${c.soil.toFixed(1)}`),
      svg('rect', { x: 200, y: 104, width: 9, height: 9, fill: COL.wood }), small(214, 112, `lifting against gravity: ${c.gravity.toFixed(1)}`),
      svg('rect', { x: 200, y: 120, width: 9, height: 9, fill: COL.water }), small(214, 128, `dragging it through the pipes: ${c.flow.toFixed(1)}`),
      small(200, 156, `Pores ${c.open > 0.8 ? 'wide open' : c.open > 0.4 ? 'partly closed' : 'nearly shut'}`, { bold: true, fill: c.open > 0.4 ? COL.leaf : COL.sugar }),
      small(200, 174, `Pipes broken by air bubbles: ${Math.round(c.broken * 100)}%`, { bold: true, fill: c.broken > 0 ? COL.bad : COL.soft }),
      ...wrapped(200, 196, 'A model. Tension is pressure below zero: the water is being stretched.', 34, { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = c.broken > 0.3
      ? `At ${c.tension.toFixed(1)} megapascals of pull the water columns start to snap: air is sucked into the pipes and they stop carrying water. That is cavitation.`
      : c.open < 0.5
        ? 'The leaves have partly shut their pores to cut the pull. They stop losing water, and stop taking in carbon dioxide too.'
        : `The leaves pull at ${c.tension.toFixed(1)} megapascals below zero. Higher trees, drier air and drier soil all pull harder.`;
    if (c.broken > 0.3) t.done();
  };
  const h = slider('Tree height', 10, 120, 5, height, (v) => `${v} m`, (v) => { height = v; paint(); }, 'wood');
  const a = slider('Dry air', 0, 1, 0.05, airDry, (v) => `${Math.round(v * 100)}%`, (v) => { airDry = v; paint(); }, 'light');
  const s = slider('Dry soil', 0, 1, 0.05, soilDry, (v) => `${Math.round(v * 100)}%`, (v) => { soilDry = v; paint(); }, 'soil');
  f.controls.append(h.node, a.node, s.node);
  const open = guessFirst(t, f, {
    ask: 'The soil around a tree dries out. What happens to the pull on the water in its leaves?',
    options: ['It gets stronger', 'It gets weaker', 'It stays the same'],
    answer: 0,
    reveal: 'done',
    sliders: [h, a, s],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A pump and a tree -------------------------------------------------------------------------------

export const pumpStill = () => {
  const s = still(W, 250);
  const ground = 226;
  const m = 1.7; // pixels per metre
  const out: SVGElement[] = [
    svg('rect', { width: W, height: 250, fill: COL.paper }),
    svg('rect', { x: 0, y: ground, width: W, height: 24, fill: COL.water, opacity: 0.25 }),
    // The pump: a pipe 18 m tall, water standing only 10 m up it.
    svg('rect', { x: 60, y: ground - 18 * m - 20, width: 14, height: 18 * m + 20 + 14, fill: '#ffffff', stroke: COL.ink, 'stroke-width': 1.5 }),
    svg('rect', { x: 61, y: ground - 10.3 * m, width: 12, height: 10.3 * m + 13, fill: COL.water, opacity: 0.8 }),
    svg('rect', { x: 52, y: ground - 18 * m - 26, width: 30, height: 8, fill: COL.ink }),
    line(30, ground - 10.3 * m, 100, ground - 10.3 * m, COL.heat, 1, { 'stroke-dasharray': '3 3' }),
    small(104, ground - 10.3 * m + 4, '10 m: as high as the air can push it', { fill: COL.heat }),
    small(80, ground - 14 * m, 'empty but for vapour', { soft: true }),
    label(20, 20, 'A suction pump', { bold: true }),
    ...wrapped(20, 36, 'Sucking only lowers the pressure above the water; the air pushes it up. It can’t push more than about 10 metres.', 30, { soft: true }),
    // The tree: an unbroken column to the top, pulled.
    line(360, ground, 360, ground - 115 * m * 0.95, COL.bark, 9),
    line(360, ground, 360, ground - 115 * m * 0.95, COL.water, 2.5),
    svg('ellipse', { cx: 360, cy: ground - 115 * m * 0.95, rx: 30, ry: 18, fill: COL.leaf }),
    small(330, ground - 115 * m * 0.95 + 4, '115 m', { bold: true, anchor: 'end' }),
    label(196, 112, 'A coast redwood', { bold: true }),
    ...wrapped(196, 128, 'Water evaporating from the leaves pulls the whole column up. Water holds together, so it can be stretched below zero.', 22, { soft: true }),
  ];
  s.svg.append(...out);
  return { node: s.node };
};
