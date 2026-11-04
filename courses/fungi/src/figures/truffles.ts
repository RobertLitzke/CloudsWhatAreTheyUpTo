// Branch N3, The squirrel, the truffle and the owl: a patch of forest at
// night, an animal digging truffles near its nest and leaving spores in its
// droppings, and the seedlings in a gap that pick up a root fungus from them.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick, player, slider } from './kit';

const W = 400;
const H = 190;

export const ANIMALS = [
  { name: 'Flying squirrel', range: 150, nest: [90, 95] },
  { name: 'Red-backed vole', range: 45, nest: [90, 95] },
] as const;

/** The gap in the forest where seedlings stand, centre and radius. */
export const GAP = { x: 300, y: 95, r: 48 } as const;

/** A fixed pseudo-random number in 0..1 for index `i` and a salt. */
const rnd = (i: number, salt: number) => {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** Seedlings in the gap, at fixed spots. */
export const SEEDLINGS: readonly [number, number][] = Array.from({ length: 22 }, (_, i) => {
  const a = rnd(i, 3) * Math.PI * 2;
  const r = Math.sqrt(rnd(i, 4)) * (GAP.r - 6);
  return [GAP.x + r * Math.cos(a), GAP.y + r * Math.sin(a)] as [number, number];
});

/**
 * Droppings left over `nights` of foraging, each night four, scattered within
 * the animal's range of its nest, and the seedlings within reach of one.
 */
export function spread(nights: number, animal: number): { pellets: [number, number][]; partnered: boolean[] } {
  const a = ANIMALS[animal];
  const pellets: [number, number][] = [];
  for (let i = 0; i < nights * 4; i++) {
    const ang = rnd(i, 1) * Math.PI * 2;
    const r = Math.sqrt(rnd(i, 2)) * a.range;
    const x = a.nest[0] + r * Math.cos(ang) * 1.5;
    const y = a.nest[1] + r * Math.sin(ang) * 0.55;
    if (x > 8 && x < W - 8 && y > 14 && y < H - 14) pellets.push([x, y]);
  }
  const partnered = SEEDLINGS.map(([sx, sy]) => pellets.some(([px, py]) => Math.hypot(px - sx, py - sy) < 16));
  return { pellets, partnered };
}

export const trufflesFigure = figure(['spread'], (ctx, t) => {
  const f = frame(W, H + 20, 3);
  const g = svg('g');
  f.svg.append(g);
  let nights = 0;
  let animal = 0;
  let sawSquirrel = false;
  let sawVole = false;
  // Old trees outside the gap, at fixed spots.
  const trees = Array.from({ length: 60 }, (_, i) => [12 + rnd(i, 5) * (W - 24), 18 + rnd(i, 6) * (H - 36)] as [number, number])
    .filter(([x, y]) => Math.hypot(x - GAP.x, y - GAP.y) > GAP.r + 8 && Math.hypot(x - 90, y - 95) > 14);
  const paint = () => {
    const a = ANIMALS[animal];
    const s = spread(nights, animal);
    const parts: SVGElement[] = [
      svg('rect', { x: 0, y: 10, width: W, height: H - 10, fill: '#2e3b2c', rx: 6 }),
      svg('circle', { cx: GAP.x, cy: GAP.y, r: GAP.r, fill: '#6b5a3c' }),
      svg('ellipse', { cx: a.nest[0], cy: a.nest[1], rx: a.range * 1.5, ry: a.range * 0.55, fill: 'none', stroke: '#e8dcc0', 'stroke-opacity': 0.35, 'stroke-dasharray': '4 4' }),
    ];
    for (const [x, y] of trees) parts.push(svg('circle', { cx: x, cy: y, r: 7, fill: '#3f5a3a' }), svg('circle', { cx: x, cy: y, r: 2.2, fill: '#6b4a2e' }));
    for (const [x, y] of s.pellets) parts.push(svg('circle', { cx: x, cy: y, r: 2.2, fill: COL.spore, stroke: '#e8dcc0', 'stroke-width': 0.6 }));
    SEEDLINGS.forEach(([x, y], i) => {
      parts.push(svg('path', { d: `M${x},${y + 4} l-4,-8 l4,2.5 l4,-2.5 z`, fill: s.partnered[i] ? '#7fc35a' : '#b5a98a' }));
      if (s.partnered[i]) parts.push(svg('circle', { cx: x, cy: y + 1, r: 6.5, fill: 'none', stroke: COL.hypha, 'stroke-width': 1.2 }));
    });
    parts.push(
      svg('circle', { cx: a.nest[0], cy: a.nest[1], r: 5, fill: '#e3a04f', stroke: '#2b2b2b' }),
      small(a.nest[0], a.nest[1] - 9, 'nest', { anchor: 'middle', fill: '#f1e9dc', bold: true }),
      small(GAP.x, GAP.y - GAP.r - 4, 'a gap with seedlings', { anchor: 'middle', fill: '#f1e9dc', bold: true }),
    );
    const n = s.partnered.filter(Boolean).length;
    parts.push(small(8, H + 14, `${a.name}, ${nights} nights: ${s.pellets.length} droppings`, { bold: true }), small(W - 8, H + 14, `${n} of ${SEEDLINGS.length} seedlings with a root fungus`, { anchor: 'end', bold: true }));
    redraw(g, ...parts);
    if (!open()) return;
    if (animal === 0 && nights >= 15) sawSquirrel = true;
    if (animal === 1 && nights >= 15) sawVole = true;
    f.readout.textContent = nights === 0
      ? 'An old forest at night, with a gap where a few trees blew down. Seedlings in the gap have no root fungus yet.'
      : animal === 1
        ? 'The vole eats truffles too, but it stays within a few tens of metres of its nest, so its droppings never reach the gap.'
        : n > 0
          ? 'The squirrel glides from tree to tree and ranges far. Its droppings, full of living truffle spores, land in the gap, and seedlings near them pick up a fungus.'
          : 'Each night the squirrel digs truffles by smell and leaves droppings as it goes, each holding many thousands of spores.';
    if (sawSquirrel && sawVole) t.done();
  };
  const ns = slider('Nights of foraging', 0, 30, 1, nights, (v) => `${v}`, (v) => { nights = v; paint(); }, 'spore');
  const play = player(ns, ctx, { seconds: 6 });
  const ap = pick(ANIMALS.map((x) => x.name), 0, (i) => { animal = i; paint(); });
  f.controls.append(ap.node, play.node, ns.node);
  const open = guessFirst(t, f, {
    ask: 'A truffle ripens underground and never comes up. How do its spores reach the roots of new trees?',
    options: ['Animals eat it and leave the spores in droppings', 'The wind lifts them out of the soil', 'Rain washes them along the ground'],
    answer: 0,
    sliders: [ns],
    buttons: ap.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
