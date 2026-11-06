// Lesson 21, Darwin's abominable mystery: a monocot beside a eudicot (still).
// The flowering plants grouped by looks and by DNA, with the sacred lotus
// moving from the water lilies to the plane trees, are a regroup block in the
// lesson's JSON (didactics/live-charts).

import { svg } from 'didactics/dom';
import { label, line, small, still } from 'didactics/draw';
import { COL } from './kit';

const W = 400;

// ---- A monocot and a eudicot (still) -----------------------------------------------------------------

export const twoStill = () => {
  const s = still(W, 330);
  const parts: SVGElement[] = [];
  const cols = [140, 300];
  parts.push(
    label(cols[0], 20, 'Monocot', { anchor: 'middle', bold: true }),
    small(cols[0], 34, 'grasses, lilies, palms, orchids', { anchor: 'middle', soft: true }),
    label(cols[1], 20, 'Eudicot', { anchor: 'middle', bold: true }),
    small(cols[1], 34, 'beans, roses, oaks, sunflowers', { anchor: 'middle', soft: true }),
  );
  const rows = ['seed leaves', 'leaf veins', 'stem, cut across', 'flower parts'];
  rows.forEach((r, i) => parts.push(small(12, 82 + i * 72, r, { bold: true })));
  const green = '#8fbf6a';
  // Seedlings.
  {
    const y = 96;
    const [a, b] = cols;
    parts.push(
      line(a, y, a, y - 30, COL.leaf, 2),
      svg('path', { d: `M${a},${y - 30} q4,-14 0,-26 q-4,12 0,26 Z`, fill: green, stroke: COL.leaf }),
      small(a + 10, y - 40, 'one', { soft: true }),
      line(b, y, b, y - 26, COL.leaf, 2),
      svg('ellipse', { cx: b - 11, cy: y - 30, rx: 11, ry: 6, fill: green, stroke: COL.leaf }),
      svg('ellipse', { cx: b + 11, cy: y - 30, rx: 11, ry: 6, fill: green, stroke: COL.leaf }),
      small(b + 26, y - 26, 'two', { soft: true }),
      line(a - 30, y, a + 30, y, COL.soil, 2),
      line(b - 30, y, b + 30, y, COL.soil, 2),
    );
  }
  // Leaves.
  {
    const y = 154;
    const [a, b] = cols;
    parts.push(svg('path', { d: `M${a - 50},${y} q50,-22 100,0 q-50,22 -100,0 Z`, fill: green, stroke: COL.leaf }));
    for (const dy of [-8, -4, 0, 4, 8]) parts.push(svg('path', { d: `M${a - 46},${y} q46,${dy * 2.2} 92,0`, fill: 'none', stroke: COL.leaf, 'stroke-width': 0.8 }));
    parts.push(svg('path', { d: `M${b - 40},${y} q40,-30 80,0 q-40,30 -80,0 Z`, fill: green, stroke: COL.leaf }), line(b - 40, y, b + 40, y, COL.leaf, 1.2));
    for (const k of [-26, -12, 2]) {
      parts.push(line(b + k, y, b + k + 12, y - 12, COL.leaf, 0.8), line(b + k, y, b + k + 12, y + 12, COL.leaf, 0.8));
      parts.push(line(b + k + 6, y - 6, b + k + 14, y - 4, COL.leaf, 0.5), line(b + k + 6, y + 6, b + k + 14, y + 4, COL.leaf, 0.5));
    }
    parts.push(small(a, y + 30, 'parallel', { anchor: 'middle', soft: true }), small(b, y + 30, 'a branching net', { anchor: 'middle', soft: true }));
  }
  // Stems.
  {
    const y = 228;
    const [a, b] = cols;
    parts.push(svg('circle', { cx: a, cy: y, r: 22, fill: '#e8efd8', stroke: COL.leaf }), svg('circle', { cx: b, cy: y, r: 22, fill: '#e8efd8', stroke: COL.leaf }));
    const scatter = [[-12, -8], [5, -14], [12, 2], [-4, 4], [-14, 9], [3, 14], [14, -9], [-6, -16], [8, 9], [-1, -4]];
    for (const [dx, dy] of scatter) parts.push(svg('circle', { cx: a + dx, cy: y + dy, r: 2.6, fill: COL.wood }));
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      parts.push(svg('circle', { cx: b + Math.cos(ang) * 14, cy: y + Math.sin(ang) * 14, r: 3, fill: COL.wood }));
    }
    parts.push(small(a + 30, y + 4, 'pipes scattered', { soft: true }), small(b + 30, y + 4, 'in a ring', { soft: true }));
  }
  // Flowers.
  {
    const y = 296;
    const flower = (cx: number, n: number, colour: string) => {
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(ang) * 14;
        const py = y + Math.sin(ang) * 14;
        parts.push(svg('ellipse', { cx: px, cy: py, rx: 10, ry: 6, fill: colour, transform: `rotate(${(ang * 180) / Math.PI} ${px} ${py})` }));
      }
      parts.push(svg('circle', { cx, cy: y, r: 5, fill: COL.light }));
    };
    flower(cols[0], 3, '#e8a0b8');
    flower(cols[1] - 22, 4, '#f2c94c');
    flower(cols[1] + 24, 5, '#e8a0b8');
    parts.push(small(cols[0] + 28, y + 4, 'threes', { soft: true }), small(cols[1], y + 30, 'fours or fives', { anchor: 'middle', soft: true }));
  }
  s.svg.append(...parts);
  return { node: s.node };
};
