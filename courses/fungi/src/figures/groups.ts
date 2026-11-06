// Lesson 6, Sacs and clubs: the four ways fungi make their spores (a still).
// The sorting of six fungi by spore-maker is a `groups` live chart, set up in
// the lesson's JSON (didactics/live-charts).

import { svg } from 'didactics/dom';
import { label, line, still } from 'didactics/draw';
import { COL, wrapped } from './kit';

const W = 400;

/** The four spore-makers, drawn small at (x, y). */
function ascus(x: number, y: number): SVGElement[] {
  return [
    svg('path', { d: `M${x - 9},${y + 40} L${x - 9},${y} Q${x},${y - 12} ${x + 9},${y} L${x + 9},${y + 40} Z`, fill: '#f6eedb', stroke: COL.hypha, 'stroke-width': 1.5 }),
    ...Array.from({ length: 8 }, (_, i) => svg('ellipse', { cx: x, cy: y + 2 + i * 4.6, rx: 4, ry: 2.4, fill: COL.spore })),
    line(x - 6, y - 7, x + 6, y - 7, COL.hypha, 1.5),
  ];
}
function basidium(x: number, y: number): SVGElement[] {
  return [
    svg('path', { d: `M${x - 9},${y + 40} L${x - 9},${y + 12} Q${x},${y} ${x + 9},${y + 12} L${x + 9},${y + 40}`, fill: '#f6eedb', stroke: COL.hypha, 'stroke-width': 1.5 }),
    ...[-6, -2, 2, 6].map((dx) => line(x + dx * 0.7, y + 6, x + dx * 1.3, y - 2, COL.hypha, 1.2)),
    ...[-6, -2, 2, 6].map((dx) => svg('ellipse', { cx: x + dx * 1.6, cy: y - 7, rx: 2.4, ry: 3.6, fill: COL.spore })),
  ];
}
function sporangium(x: number, y: number): SVGElement[] {
  return [
    line(x, y + 40, x, y + 8, COL.hypha, 2),
    svg('circle', { cx: x, cy: y, r: 10, fill: '#3a3236' }),
    ...Array.from({ length: 7 }, (_, i) => svg('circle', { cx: x - 5 + (i % 4) * 3.4, cy: y - 4 + Math.floor(i / 4) * 5, r: 1.3, fill: '#d8cfc0' })),
  ];
}
function zoospore(x: number, y: number): SVGElement[] {
  return [
    svg('circle', { cx: x, cy: y + 14, r: 7, fill: COL.spore }),
    svg('path', { d: `M${x},${y + 21} q6,8 0,14 q-6,6 0,12`, stroke: COL.spore, 'stroke-width': 1.2, fill: 'none' }),
  ];
}

export const makersStill = () => {
  const s = still(W, 180);
  const parts: SVGElement[] = [];
  const cols = [
    { x: 52, draw: ascus, name: 'Sac fungi', body: 'Usually 8 spores in a sac, shot out of its tip. Cup fungi, morels, yeasts, most moulds.' },
    { x: 150, draw: basidium, name: 'Club fungi', body: 'Usually 4 spores on prongs on a club-shaped cell. Mushrooms, brackets, puffballs, rusts.' },
    { x: 248, draw: sporangium, name: 'Pin moulds', body: 'Hundreds of spores in a ball on a stalk. Black bread mould, dung fungi.' },
    { x: 346, draw: zoospore, name: 'Chytrids', body: 'Spores that swim with one tail. Water, wet soil, pollen.' },
  ];
  for (const c of cols) {
    parts.push(...c.draw(c.x, 26), label(c.x, 90, c.name, { anchor: 'middle', bold: true }), ...wrapped(c.x - 46, 106, c.body, 19, { soft: true }, 11));
  }
  s.svg.append(...parts);
  return { node: s.node };
};
