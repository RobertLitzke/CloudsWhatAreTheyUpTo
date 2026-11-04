// Lesson K1, Counting stamens: eight drawn flowers sorted by Linnaeus's count
// of stamens, and then by family, and the two sortings disagree.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick } from './kit';

const W = 400;

export type Bloom = { name: string; stamens: number; cls: string; family: string; petals: number; color: string };

/** Each flower's stamens, Linnaeus's class for it, and its family today. */
export const BLOOMS: Bloom[] = [
  { name: 'Sage', stamens: 2, cls: 'Two stamens', family: 'Mint family', petals: 0, color: '#8e6cc0' },
  { name: 'Lilac', stamens: 2, cls: 'Two stamens', family: 'Olive family', petals: 4, color: '#b79ad8' },
  { name: 'Rosemary', stamens: 2, cls: 'Two stamens', family: 'Mint family', petals: 0, color: '#7f9ad0' },
  { name: 'Lady’s mantle', stamens: 4, cls: 'Four stamens', family: 'Rose family', petals: 4, color: '#c9d46a' },
  { name: 'Lily', stamens: 6, cls: 'Six stamens', family: 'Lily family', petals: 6, color: '#f0a060' },
  { name: 'Barberry', stamens: 6, cls: 'Six stamens', family: 'Barberry family', petals: 6, color: '#f2c94c' },
  { name: 'Apple', stamens: 20, cls: 'Twenty or more', family: 'Rose family', petals: 5, color: '#f4d4dc' },
  { name: 'Strawberry', stamens: 20, cls: 'Twenty or more', family: 'Rose family', petals: 5, color: '#f7f2ea' },
];

/** The flowers grouped by `key`, groups in order of first appearance. */
export function sortBy(key: 'cls' | 'family'): [string, Bloom[]][] {
  const m = new Map<string, Bloom[]>();
  for (const b of BLOOMS) m.set(b[key], [...(m.get(b[key]) ?? []), b]);
  return [...m];
}

function bloom(b: Bloom, x: number, y: number): SVGElement[] {
  const out: SVGElement[] = [];
  if (b.petals === 0) {
    // A two-lipped mint flower.
    out.push(
      svg('ellipse', { cx: x, cy: y - 5, rx: 5, ry: 7, fill: b.color }),
      svg('ellipse', { cx: x, cy: y + 6, rx: 9, ry: 4.5, fill: b.color }),
    );
  } else {
    for (let k = 0; k < b.petals; k++) {
      const a = (k / b.petals) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * 8;
      const py = y + Math.sin(a) * 8;
      out.push(svg('ellipse', { cx: px, cy: py, rx: 7, ry: 4.2, fill: b.color, stroke: COL.soft, 'stroke-width': 0.4, transform: `rotate(${(a * 180) / Math.PI} ${px} ${py})` }));
    }
  }
  const n = Math.min(b.stamens, 14);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.3;
    const r = b.stamens >= 20 ? 6 : 5;
    out.push(line(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, '#a8922e', 0.8), svg('circle', { cx: x + Math.cos(a) * r, cy: y + Math.sin(a) * r, r: 1.3, fill: '#a8922e' }));
  }
  return out;
}

export const sortFigure = figure(['both'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let by: 'cls' | 'family' = 'cls';
  let sawFamily = false;
  const paint = () => {
    const shown = open();
    const groups = sortBy(shown ? by : 'cls');
    const parts: SVGElement[] = [];
    const rowH = Math.min(46, 226 / groups.length);
    groups.forEach(([name, list], i) => {
      const y = 24 + i * rowH + rowH / 2;
      parts.push(svg('rect', { x: 6, y: y - rowH / 2 + 2, width: 388, height: rowH - 4, rx: 6, fill: COL.grid, opacity: 0.35 }));
      parts.push(small(14, y + 4, name, { bold: true }));
      list.forEach((b, j) => {
        const x = 150 + j * 82;
        parts.push(...bloom(b, x, y - 4), small(x, y + 16, b.name, { anchor: 'middle', soft: true }));
      });
    });
    redraw(g,
      label(10, 16, by === 'cls' || !open() ? 'Linnaeus’s classes, by stamens' : 'Families', { bold: true }),
      ...parts,
    );
    if (!shown) return;
    if (by === 'family') sawFamily = true;
    f.readout.textContent = by === 'cls'
      ? 'Counting stamens is quick and anyone can do it. But it puts lilac with sage, and the lily, a monocot, with the barberry, a eudicot.'
      : 'By family, sage and rosemary stay together, but lilac goes to the olives, and lady’s mantle, with only four stamens, joins the apple and the strawberry in the rose family.';
    if (sawFamily) t.done();
  };
  const which = pick(['By stamens', 'By family'], 0, (i) => { by = i ? 'family' : 'cls'; paint(); });
  f.controls.append(which.node);
  const open = guessFirst(t, f, {
    ask: 'Lady’s mantle has four stamens; apples and strawberries have twenty or more. Which family is lady’s mantle in?',
    options: ['The rose family, with apples', 'A family of its own', 'The mint family'],
    answer: 0,
    reveal: 'done',
    sliders: [],
    buttons: which.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
