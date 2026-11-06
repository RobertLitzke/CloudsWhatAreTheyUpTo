// Lesson 15, The trunk with no tree: Prototaxites to scale beside a person and
// the land plants of its day (a still). The board of clues is a clue-board
// block in the lesson's JSON (didactics/live-charts).

import { svg } from 'didactics/dom';
import { line, small, still } from 'didactics/draw';
import { COL } from './kit';

const W = 400;

// ---- To scale (still) ---------------------------------------------------------------------------------

export const scaleStill = () => {
  const s = still(W, 220);
  const ground = 200;
  const m = 21; // px per metre
  const parts: SVGElement[] = [
    line(10, ground, 390, ground, COL.ink, 1.5),
    svg('rect', { x: 10, y: ground, width: 380, height: 14, fill: COL.soil, opacity: 0.5 }),
  ];
  // Prototaxites: a tall smooth column, slightly tapering.
  parts.push(svg('path', { d: `M190,${ground} L194,${ground - 8 * m} Q208,${ground - 8.3 * m} 222,${ground - 8 * m} L226,${ground} Z`, fill: '#9b8a6e' }));
  for (let k = 1; k < 8; k++) parts.push(line(196, ground - k * m, 222, ground - k * m + 3, '#857558', 0.8));
  parts.push(small(234, ground - 8 * m + 8, 'Prototaxites: up to 8 m tall', { bold: true }), small(234, ground - 8 * m + 20, 'and a metre wide', { bold: true }));
  // A person.
  const px = 290;
  const h = 1.7 * m;
  parts.push(
    svg('circle', { cx: px, cy: ground - h + 4, r: 4, fill: COL.ink }),
    line(px, ground - h + 8, px, ground - h * 0.45, COL.ink, 2),
    line(px, ground - h * 0.45, px - 5, ground, COL.ink, 2),
    line(px, ground - h * 0.45, px + 5, ground, COL.ink, 2),
    line(px, ground - h * 0.8, px - 7, ground - h * 0.55, COL.ink, 2),
    line(px, ground - h * 0.8, px + 7, ground - h * 0.55, COL.ink, 2),
    small(px + 12, ground - h + 8, 'a person, for scale'),
  );
  // Early land plants: tiny forked stems.
  for (const x of [30, 46, 60, 74, 340, 356, 370, 384]) {
    parts.push(line(x, ground, x, ground - 0.3 * m, '#5f8f4a', 1.6), line(x, ground - 0.3 * m, x - 3, ground - 0.45 * m, '#5f8f4a', 1.2), line(x, ground - 0.3 * m, x + 3, ground - 0.45 * m, '#5f8f4a', 1.2));
  }
  parts.push(small(14, ground - 0.6 * m - 18, 'the tallest land'), small(14, ground - 0.6 * m - 6, 'plants: ankle-high'));
  s.svg.append(...parts);
  return { node: s.node };
};
