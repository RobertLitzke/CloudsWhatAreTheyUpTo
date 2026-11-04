// Lesson C2, Corn has no wild ancestor: teosinte turned into maize one trait
// at a time, each change set by one or a few genes.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, toggles } from './kit';

const W = 400;

export const TRAITS = [
  { id: 'stalk', name: 'One main stalk', gene: 'tb1', says: 'A more active teosinte branched1 keeps side branches short, so the plant puts its sugar into a few big ears on one stalk instead of many small ones on many branches.' },
  { id: 'naked', name: 'Naked kernels', gene: 'tga1', says: 'One changed letter in teosinte glume architecture1 leaves the stony case soft and small, so the kernel sits exposed on the cob and can be eaten or ground without cracking.' },
  { id: 'stays', name: 'Ear stays whole', gene: 'several', says: 'The ear no longer falls apart when ripe. Good for a farmer gathering it; fatal for a wild plant, so maize now depends on people to sow it.' },
  { id: 'rows', name: 'Many rows', gene: 'many', says: 'Teosinte has one row of kernels on each side; slow selection by farmers over thousands of years, through many genes of small effect, gave cobs of eight to twenty rows.' },
] as const;

export const cornFigure = figure(['maize'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let on = [false, false, false, false];
  let last = -1;
  const paint = () => {
    const shown = open();
    const [stalk, naked, stays, rows] = shown ? on : [false, false, false, false];
    const parts: SVGElement[] = [];
    const base = 220;
    const cx = 90;
    // The plant.
    parts.push(line(cx, base, cx, 40, COL.leaf, 3));
    const branches = stalk ? [] : [-1, 1, -1, 1, -1];
    branches.forEach((d, i) => {
      const y = 190 - i * 30;
      parts.push(line(cx, y, cx + d * 40, y - 30, COL.leaf, 2));
      parts.push(svg('ellipse', { cx: cx + d * 44, cy: y - 34, rx: 3, ry: 8, fill: '#c9a46a' }));
    });
    for (const [y, d] of [[170, 1], [140, -1], [110, 1], [80, -1]] as const) parts.push(svg('path', { d: `M${cx},${y} q${d * 30},-10 ${d * 50},10`, stroke: '#7fae5c', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }));
    if (stalk) parts.push(svg('ellipse', { cx: cx + 10, cy: 130, rx: 8, ry: 22, fill: '#e8d8a0', stroke: COL.leaf }));
    parts.push(svg('path', { d: `M${cx},40 l-8,-16 M${cx},40 l8,-16 M${cx},40 l0,-20`, stroke: '#c9a46a', 'stroke-width': 1.5, fill: 'none' }));
    // The ear, close up.
    const ex = 270;
    const ey = 120;
    const len = rows ? 140 : 100;
    const cols = rows ? 6 : 1;
    const per = rows ? 14 : 8;
    parts.push(small(ex, 30, 'One ear, close up', { anchor: 'middle', bold: true }));
    if (rows) parts.push(svg('rect', { x: ex - 26, y: ey - len / 2, width: 52, height: len, rx: 24, fill: '#efe2b0', stroke: COL.wood, 'stroke-width': 0.6 }));
    for (let k = 0; k < per; k++) {
      const y = ey - len / 2 + 6 + (k * (len - 12)) / per;
      for (let c = 0; c < cols; c++) {
        const x = rows ? ex - 20 + c * 8 : ex + (k % 2 ? 4 : -4);
        const dx = stays || rows ? 0 : (k % 3) * 2;
        parts.push(svg('rect', { x: x - (rows ? 4 : 6) + dx, y, width: rows ? 8 : 12, height: (len - 12) / per - 1, rx: 2, fill: naked ? '#f2c94c' : '#8a7a5a', stroke: naked ? '#c9a227' : '#5a4a3a', 'stroke-width': 0.6 }));
      }
    }
    if (!stays && !rows) parts.push(small(ex + 20, ey + len / 2 + 14, 'falls apart when ripe', { soft: true }));
    parts.push(
      small(ex, 222, naked ? 'kernels bare' : 'each kernel in a stony case', { anchor: 'middle', soft: true }),
      label(16, 22, on.every(Boolean) && shown ? 'Maize' : on.some(Boolean) && shown ? 'Part way' : 'Teosinte', { bold: true }),
      small(16, 236, 'Drawn simply, not to scale.', { soft: true }),
    );
    redraw(g, ...parts);
    if (!shown) return;
    f.readout.textContent = last < 0
      ? 'Teosinte: a bushy grass with many small ears, each a single row of five to twelve hard-cased kernels that fall apart when ripe. Turn on the changes one at a time.'
      : on[last] ? `${TRAITS[last].says}` : `Back to the teosinte form of this trait.`;
    if (on.every(Boolean)) t.done();
  };
  const sw = toggles(TRAITS.map((x) => x.name), on, (s) => { last = s.findIndex((v, i) => v !== on[i]); on = s; paint(); });
  f.controls.append(sw.node);
  const open = guessFirst(t, f, {
    ask: 'Teosinte looks nothing like maize. When George Beadle crossed the two and grew thousands of their grandchildren, how many genes did he estimate made most of the difference?',
    options: ['Four or five', 'Hundreds', 'Just one'],
    answer: 0,
    reveal: 'done',
    sliders: [],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
