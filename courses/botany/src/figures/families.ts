// Lessons K3 and K4: ten families' signatures, drawn simply (still); and the
// deadly look-alikes side by side (still).

import { svg } from 'didactics/dom';
import { label, line, small, still } from 'didactics/draw';
import { COL, wrapped } from './kit';

const W = 400;
const GREEN = '#7fae5c';

const petal = (x: number, y: number, a: number, rx: number, ry: number, fill: string, d = 0) => {
  const px = x + Math.cos(a) * d;
  const py = y + Math.sin(a) * d;
  return svg('ellipse', { cx: px, cy: py, rx, ry, fill, stroke: COL.soft, 'stroke-width': 0.4, transform: `rotate(${(a * 180) / Math.PI} ${px} ${py})` });
};
const ring = (x: number, y: number, n: number, rx: number, ry: number, fill: string, d: number, turn = -Math.PI / 2) =>
  Array.from({ length: n }, (_, k) => petal(x, y, turn + (k / n) * Math.PI * 2, rx, ry, fill, d));

/** A small drawing of each family's signature, centred on x, y. */
export const GLYPHS: Record<string, (x: number, y: number) => SVGElement[]> = {
  rose: (x, y) => [...ring(x, y, 5, 9, 6, '#f4c4d0', 9), ...Array.from({ length: 14 }, (_, k) => svg('circle', { cx: x + Math.cos(k) * 4.5, cy: y + Math.sin(k * 1.7) * 4.5, r: 1.2, fill: '#c9a227' }))],
  pea: (x, y) => [
    svg('ellipse', { cx: x, cy: y - 8, rx: 11, ry: 9, fill: '#b4a0e0', stroke: COL.soft, 'stroke-width': 0.4 }),
    svg('ellipse', { cx: x - 6, cy: y + 5, rx: 6, ry: 5, fill: '#9c86d6' }),
    svg('ellipse', { cx: x + 6, cy: y + 5, rx: 6, ry: 5, fill: '#9c86d6' }),
    svg('path', { d: `M${x - 4},${y + 4} q4,10 8,0 Z`, fill: '#7a64b8' }),
    svg('path', { d: `M${x + 18},${y + 12} q14,-2 22,-14 q-10,6 -22,8 Z`, fill: GREEN, stroke: COL.leaf, 'stroke-width': 0.6 }),
  ],
  mint: (x, y) => [
    svg('ellipse', { cx: x - 4, cy: y - 6, rx: 5, ry: 7, fill: '#b48ad8' }),
    svg('ellipse', { cx: x - 2, cy: y + 6, rx: 9, ry: 4, fill: '#b48ad8' }),
    svg('rect', { x: x + 16, y: y - 7, width: 14, height: 14, fill: '#e8efd8', stroke: COL.leaf }),
    small(x + 23, y + 20, 'stem', { anchor: 'middle', soft: true }),
  ],
  aster: (x, y) => [...ring(x, y, 14, 7, 2.6, '#f2c94c', 11), svg('circle', { cx: x, cy: y, r: 7, fill: '#8a5a2a' })],
  carrot: (x, y) => {
    const out: SVGElement[] = [];
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + 0.35 + (k / 6) * (Math.PI - 0.7);
      const ex = x + Math.cos(a) * 18;
      const ey = y + 10 + Math.sin(a) * 18;
      out.push(line(x, y + 12, ex, ey, COL.leaf, 0.8));
      for (let j = 0; j < 3; j++) out.push(svg('circle', { cx: ex + (j - 1) * 2.5, cy: ey - 1, r: 1.6, fill: '#f6f2e6', stroke: COL.soft, 'stroke-width': 0.3 }));
    }
    out.push(line(x, y + 12, x, y + 22, COL.leaf, 1.2));
    return out;
  },
  mustard: (x, y) => [...ring(x, y, 4, 8, 5, '#f2dc4c', 8, -Math.PI / 4), svg('circle', { cx: x, cy: y, r: 2.4, fill: COL.leaf }), line(x + 18, y + 10, x + 34, y - 10, COL.leaf, 2.2)],
  buttercup: (x, y) => [...ring(x, y, 5, 8, 6, '#f6d33c', 8), ...Array.from({ length: 7 }, (_, k) => svg('circle', { cx: x + Math.cos(k) * 2.6, cy: y + Math.sin(k) * 2.6, r: 1.6, fill: '#7fae5c' }))],
  heath: (x, y) => [
    svg('path', { d: `M${x - 18},${y - 12} q18,-8 36,0`, fill: 'none', stroke: COL.wood, 'stroke-width': 1.2 }),
    ...[-12, 0, 12].map((dx) => svg('path', { d: `M${x + dx - 5},${y - 6} q5,-4 10,0 l-1,12 q-4,3 -8,0 Z`, fill: '#f4d4dc', stroke: COL.soft, 'stroke-width': 0.5 })),
  ],
  grass: (x, y) => [
    line(x, y + 18, x, y - 16, '#a8b86a', 1.4),
    ...[-12, -4, 4, 12].flatMap((dy, i) => [svg('ellipse', { cx: x + (i % 2 ? 5 : -5), cy: y + dy, rx: 5, ry: 2.4, fill: '#c9cf8a', transform: `rotate(${i % 2 ? -30 : 30} ${x + (i % 2 ? 5 : -5)} ${y + dy})` })]),
    svg('circle', { cx: x + 26, cy: y + 4, r: 6, fill: '#e8efd8', stroke: COL.leaf }),
  ],
  lily: (x, y) => [...ring(x, y, 3, 11, 4.5, '#f0a060', 10), ...ring(x, y, 3, 9, 4, '#f4b880', 8, Math.PI / 2), svg('circle', { cx: x, cy: y, r: 2.4, fill: COL.leaf })],
};

export const FAMILIES: { id: keyof typeof GLYPHS; name: string; sign: string }[] = [
  { id: 'rose', name: 'Rose', sign: '5 petals, many stamens; toothed leaves with small flaps at the base' },
  { id: 'pea', name: 'Pea', sign: 'banner, wings and keel; seeds in a pod; often compound leaves' },
  { id: 'mint', name: 'Mint', sign: 'square stems, opposite leaves, two-lipped flowers, a smell when crushed' },
  { id: 'aster', name: 'Aster', sign: 'a head of many tiny flowers that looks like one flower' },
  { id: 'carrot', name: 'Carrot', sign: 'tiny flowers in an umbrella; hollow stems; finely cut leaves' },
  { id: 'mustard', name: 'Mustard', sign: '4 petals in a cross, 6 stamens (4 long, 2 short); thin pods' },
  { id: 'buttercup', name: 'Buttercup', sign: 'many stamens and many separate carpels in a knob at the centre' },
  { id: 'heath', name: 'Heath', sign: 'hanging urn- or bell-shaped flowers; woody, often evergreen' },
  { id: 'grass', name: 'Grass', sign: 'hollow, round, jointed stems; tiny green flowers in spikelets' },
  { id: 'lily', name: 'Lily-like', sign: 'parts in threes; parallel veins; many grow from bulbs' },
];

export const familiesStill = () => {
  const s = still(W, 410);
  const parts: SVGElement[] = [];
  FAMILIES.forEach((fam, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x0 = 6 + col * 198;
    const y0 = 6 + row * 80;
    parts.push(
      svg('rect', { x: x0, y: y0, width: 190, height: 74, rx: 6, fill: COL.grid, opacity: 0.3 }),
      ...GLYPHS[fam.id](x0 + 30, y0 + 38),
      label(x0 + 70, y0 + 18, fam.name, { bold: true }),
      ...wrapped(x0 + 70, y0 + 33, fam.sign, 22, { soft: true, size: 'note' }, 11),
    );
  });
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- The deadly look-alikes (still) ------------------------------------------------------------------

export const alikeStill = () => {
  const s = still(W, 390);
  const parts: SVGElement[] = [];
  // Camas and death camas.
  const star = (x: number, y: number, r: number, fill: string) => ring(x, y, 6, r, r * 0.36, fill, r * 0.9);
  const camas = (x: number, flower: string, r: number, n: number) => {
    const out: SVGElement[] = [];
    for (const k of [-2, -1, 1, 2]) out.push(svg('path', { d: `M${x},170 q${k * 6},-30 ${k * 14},-70`, fill: 'none', stroke: GREEN, 'stroke-width': 4, 'stroke-linecap': 'round' }));
    out.push(line(x, 170, x, 70, COL.leaf, 1.4));
    for (let j = 0; j < n; j++) out.push(...star(x + (j % 2 ? 6 : -6), 66 + j * (r * 1.8), r, flower));
    out.push(svg('ellipse', { cx: x, cy: 184, rx: 9, ry: 12, fill: '#efe2c4', stroke: COL.wood }));
    return out;
  };
  parts.push(
    label(10, 18, 'Camas and death camas', { bold: true }),
    ...camas(70, '#5b6fc4', 9, 4),
    small(70, 214, 'Common camas', { anchor: 'middle', bold: true }),
    ...wrapped(10, 228, 'blue to violet stars, 2 to 4 cm across', 19, { soft: true, size: 'note' }, 11),
    ...camas(180, '#f1ead0', 4, 9),
    small(180, 214, 'Death camas', { anchor: 'middle', bold: true, fill: COL.bad }),
    ...wrapped(130, 228, 'many small cream flowers in a dense spike', 19, { soft: true, size: 'note' }, 11),
    ...wrapped(10, 284, 'Out of flower, leaves and bulbs look the same.', 40, { fill: COL.bad, size: 'note' }, 11),
  );
  // The carrot-family trio.
  const trio: [string, string, string, boolean][] = [
    ['Queen Anne’s lace', 'hairy stem, no spots; often one dark floret at the centre', '#7fae5c', false],
    ['Poison hemlock', 'smooth stem with purple blotches; tall; musty smell', '#7fae5c', true],
    ['Water hemlock', 'in wet ground; chambered base; most toxic of all', '#7fae5c', true],
  ];
  parts.push(label(252, 18, 'Carrot family', { bold: true }));
  trio.forEach(([name, says, , bad], i) => {
    const y = 50 + i * 112;
    const x = 268;
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + 0.35 + (k / 6) * (Math.PI - 0.7);
      parts.push(line(x, y + 14, x + Math.cos(a) * 16, y + 14 + Math.sin(a) * 16, COL.leaf, 0.7), svg('circle', { cx: x + Math.cos(a) * 16, cy: y + 13 + Math.sin(a) * 16, r: 3, fill: '#f6f2e6', stroke: COL.soft, 'stroke-width': 0.3 }));
    }
    if (i === 0) parts.push(svg('circle', { cx: x, cy: y + 2, r: 2, fill: '#5a2a4a' }));
    parts.push(line(x, y + 14, x, y + 70, COL.leaf, 2.4));
    if (i === 1) for (const dy of [26, 40, 54]) parts.push(svg('ellipse', { cx: x, cy: y + dy, rx: 2, ry: 3, fill: '#7a3b6e' }));
    if (i === 0) for (const dy of [24, 34, 44, 54, 64]) parts.push(line(x, y + dy, x - 3, y + dy - 2, COL.leaf, 0.6), line(x, y + dy + 4, x + 3, y + dy + 2, COL.leaf, 0.6));
    if (i === 2) {
      parts.push(svg('rect', { x: x - 7, y: y + 66, width: 14, height: 20, rx: 4, fill: '#efe2c4', stroke: COL.wood }));
      for (const dy of [71, 76, 81]) parts.push(line(x - 7, y + dy, x + 7, y + dy, COL.wood, 0.6));
    }
    parts.push(
      small(292, y + 6, name, { bold: true, fill: bad ? COL.bad : undefined }),
      ...wrapped(292, y + 20, says, 17, { soft: true, size: 'note' }, 11),
    );
  });
  parts.push(...wrapped(10, 336, 'Drawn simply. These drawings are for telling the plants apart on a page, not for deciding what to eat.', 44, { soft: true, size: 'note' }, 12));
  s.svg.append(...parts);
  return { node: s.node };
};
