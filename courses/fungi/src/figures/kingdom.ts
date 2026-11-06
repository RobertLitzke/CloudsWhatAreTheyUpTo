// Lesson 2, Closer to us than to plants: a still of three cells. The two
// sortings of living things, by looks (Linnaeus) and by shared proteins and
// genes (Baldauf and Palmer, 1993), are a regroup block in the lesson's JSON
// (didactics/live-charts).

import { svg } from 'didactics/dom';
import { label, line, small, still } from 'didactics/draw';
import { COL, wrapped } from './kit';

const W = 400;

const FUNGI = COL.cap;
const PLANT = COL.leaf;
const ANIMAL = COL.matB;

// ---- Three cells (still) ----------------------------------------------------------------------------

export const cellsStill = () => {
  const s = still(W, 236);
  const parts: SVGElement[] = [];
  const col = (cx: number, title: string, rows: string[], tone: string) => {
    parts.push(label(cx, 18, title, { anchor: 'middle', bold: true, fill: tone }));
    rows.forEach((r, i) => parts.push(...wrapped(cx - 58, 154 + i * 22, r, 24, { soft: i > 0 }, 10)));
  };
  // A plant cell: thick wall, chloroplasts, a big water sac, starch grains.
  parts.push(
    svg('rect', { x: 18, y: 32, width: 104, height: 104, rx: 6, fill: '#eef3e2', stroke: PLANT, 'stroke-width': 5 }),
    svg('rect', { x: 40, y: 52, width: 60, height: 56, rx: 10, fill: '#d8e8f2' }),
    ...[[30, 46], [104, 50], [30, 118], [106, 116], [70, 122]].map(([x, y]) => svg('ellipse', { cx: x, cy: y, rx: 8, ry: 5, fill: PLANT })),
    ...[[56, 118], [88, 46]].map(([x, y]) => svg('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: COL.soft, 'stroke-width': 0.8 })),
  );
  col(70, 'Plant', ['Wall of cellulose', 'Chloroplasts make sugar', 'Stores starch'], PLANT);
  // An animal cell: no wall, glycogen granules.
  parts.push(
    svg('path', { d: 'M152,84 C150,46 190,30 214,40 C246,52 256,74 248,104 C240,134 200,140 176,128 C156,118 154,104 152,84 Z', fill: '#e3f0ef', stroke: ANIMAL, 'stroke-width': 1.5 }),
    svg('circle', { cx: 202, cy: 86, r: 14, fill: '#c9dedd', stroke: ANIMAL }),
    ...[[176, 64], [226, 70], [182, 112], [228, 108], [210, 122]].map(([x, y]) => svg('circle', { cx: x, cy: y, r: 2.5, fill: COL.food })),
  );
  col(200, 'Animal', ['No wall', 'Eats food whole', 'Stores glycogen'], ANIMAL);
  // A hypha: a tube with a chitin wall, cross walls with pores, glycogen, enzymes leaving the tip.
  const hy = 330;
  parts.push(
    svg('rect', { x: hy - 10, y: 56, width: 20, height: 80, rx: 10, fill: '#f6eedb', stroke: FUNGI, 'stroke-width': 3 }),
    line(hy - 10, 84, hy + 10, 84, FUNGI, 2), line(hy - 10, 112, hy + 10, 112, FUNGI, 2),
    svg('circle', { cx: hy, cy: 84, r: 2, fill: '#f6eedb' }), svg('circle', { cx: hy, cy: 112, r: 2, fill: '#f6eedb' }),
    ...[[hy - 3, 70], [hy + 4, 98], [hy - 4, 124]].map(([x, y]) => svg('circle', { cx: x, cy: y, r: 2.5, fill: COL.food })),
    ...[[-22, 44], [0, 38], [22, 44], [-30, 56], [30, 56]].map(([dx, y]) => svg('circle', { cx: hy + dx, cy: y, r: 2, fill: COL.enzyme })),
    small(hy + 26, 40, 'enzymes', { fill: COL.enzyme }),
  );
  col(hy, 'Fungus', ['Wall of chitin', 'Digests outside, absorbs', 'Stores glycogen'], FUNGI);
  s.svg.append(...parts);
  return { node: s.node };
};
