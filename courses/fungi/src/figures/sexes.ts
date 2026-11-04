// Lesson 5, Twenty thousand sexes: how the number of mating types at one or
// two genes sets the chance a stranger, or a sibling, is a possible mate; and
// a still of a mushroom's life cycle with its two-nucleus stage.

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, pick, slider, wrapped } from './kit';

const W = 400;

/**
 * Chances that two mycelia can mate, with `n` equally common versions of each
 * mating-type gene. With one gene (bipolar) they must differ at it; with two
 * genes (tetrapolar) they must differ at both. Siblings come from one
 * mushroom, whose two parents carried different versions: half of siblings
 * differ at a given gene.
 */
export function mateChance(n: number, genes: 1 | 2): { stranger: number; sibling: number; types: number } {
  const differ = 1 - 1 / n;
  return genes === 1
    ? { stranger: differ, sibling: 0.5, types: n }
    : { stranger: differ * differ, sibling: 0.25, types: n * n };
}

export const matingFigure = figure(['many'], (_ctx, t) => {
  const f = frame(W, 196, 3);
  const g = svg('g');
  f.svg.append(g);
  let n = 2;
  let genes: 1 | 2 = 1;
  let sawMany = false;
  const paint = () => {
    const c = mateChance(n, genes);
    // A grid of 10 x 10 strangers, coloured by whether they can mate with ours.
    const dots: SVGElement[] = [];
    const yes = Math.round(c.stranger * 100);
    for (let i = 0; i < 100; i++) {
      const x = 22 + (i % 10) * 15;
      const y = 44 + Math.floor(i / 10) * 13;
      dots.push(svg('circle', { cx: x, cy: y, r: 4.5, fill: i < yes ? COL.matA : COL.grid, stroke: i < yes ? 'none' : COL.soft, 'stroke-width': 0.6 }));
    }
    const bar = (y: number, name: string, v: number, col: string) => [
      small(200, y, name, { bold: true }),
      svg('rect', { x: 200, y: y + 6, width: 180, height: 12, fill: COL.grid, rx: 2 }),
      svg('rect', { x: 200, y: y + 6, width: 180 * v, height: 12, fill: col, rx: 2 }),
      small(380, y, `${Math.round(v * 100)}%`, { anchor: 'end' }),
    ];
    redraw(g,
      label(14, 22, '100 strangers met in the soil', { bold: true }),
      ...dots,
      ...bar(56, 'A stranger can mate with it', c.stranger, COL.matA),
      ...bar(100, 'A sibling can mate with it', c.sibling, COL.matB),
      label(200, 156, `${c.types.toLocaleString('en-US')} mating types`, { bold: true }),
      ...wrapped(200, 172, genes === 1 ? `One mating-type gene with ${n} versions` : `Two mating-type genes, ${n} versions of each`, 34, { soft: true }),
    );
    if (n >= 100) sawMany = true;
    f.readout.textContent = n <= 2
      ? genes === 1
        ? 'Two types, like two sexes: half of all strangers, and half of siblings, are possible mates.'
        : 'Two genes with two versions each: only a quarter of strangers will do, no better than siblings.'
      : c.stranger > 0.95
        ? `With ${c.types.toLocaleString('en-US')} types, almost any stranger is a mate (${Math.round(c.stranger * 100)}%), but still only ${Math.round(c.sibling * 100)}% of siblings: many types make outcrossing easy and inbreeding rare.`
        : `More versions make a random stranger more likely to differ: ${Math.round(c.stranger * 100)}% can mate. Siblings stay at ${Math.round(c.sibling * 100)}%, however many versions there are.`;
    if (sawMany && genes === 2) t.done();
  };
  const ns = slider('Versions of each gene', 2, 400, 1, n, (v) => `${v}`, (v) => { n = v; paint(); }, 'matA');
  const gs = pick(['One gene', 'Two genes'], 0, (i) => { genes = (i + 1) as 1 | 2; paint(); });
  f.controls.append(gs.node, ns.node);
  paint();
  return f.node;
});

// ---- A mushroom's life (still) ---------------------------------------------------------------------

export const cycleStill = () => {
  const s = still(W, 270);
  const parts: SVGElement[] = [];
  const nucleus = (x: number, y: number, c: string) => svg('circle', { cx: x, cy: y, r: 3.2, fill: c });
  const hypha = (x1: number, y1: number, x2: number, y2: number) => line(x1, y1, x2, y2, COL.hypha, 6, { 'stroke-linecap': 'round', opacity: 0.6 });
  // 1. Two spores of different mating types.
  parts.push(
    svg('ellipse', { cx: 40, cy: 40, rx: 7, ry: 10, fill: COL.matA }), svg('ellipse', { cx: 70, cy: 40, rx: 7, ry: 10, fill: COL.matB }),
    small(55, 18, '1. Spores', { anchor: 'middle', bold: true }),
    small(55, 64, 'one nucleus each', { anchor: 'middle', soft: true }),
  );
  // 2. Each grows a hypha; they meet and fuse.
  parts.push(
    hypha(120, 30, 170, 46), hypha(220, 30, 176, 46),
    nucleus(136, 35, COL.matA), nucleus(204, 35, COL.matB),
    small(172, 18, '2. Two mycelia meet and fuse', { anchor: 'middle', bold: true }),
    small(172, 64, 'only if their mating types differ', { anchor: 'middle', soft: true }),
  );
  // 3. The two-nucleus mycelium, with clamps.
  parts.push(hypha(270, 40, 380, 40));
  for (const x of [288, 324, 360]) parts.push(nucleus(x, 40, COL.matA), nucleus(x + 10, 40, COL.matB), svg('path', { d: `M${x + 18},40 q4,-10 10,0`, stroke: COL.hypha, 'stroke-width': 1.5, fill: 'none' }));
  parts.push(
    small(325, 18, '3. Two nuclei in every cell', { anchor: 'middle', bold: true }),
    small(325, 64, 'it can live like this for years', { anchor: 'middle', soft: true }),
    arrow(92, 40, 112, 36, COL.ink, 1.2), arrow(232, 40, 262, 40, COL.ink, 1.2),
    arrow(330, 74, 330, 110, COL.ink, 1.2),
  );
  // 4. A mushroom; 5. on its gills nuclei fuse and divide into four spores.
  parts.push(
    svg('rect', { x: 322, y: 160, width: 14, height: 54, fill: '#efe6cf', stroke: COL.cap }),
    svg('path', { d: 'M286,164 Q329,110 372,164 Z', fill: COL.cap }),
    small(330, 232, '4. A mushroom, built of', { anchor: 'middle', bold: true }),
    small(330, 244, 'two-nucleus hyphae', { anchor: 'middle', bold: true }),
    arrow(280, 170, 230, 170, COL.ink, 1.2),
  );
  // The basidium.
  const bx = 160;
  parts.push(
    svg('path', { d: `M${bx - 16},220 L${bx - 16},166 Q${bx},140 ${bx + 16},166 L${bx + 16},220`, fill: '#f6eedb', stroke: COL.hypha, 'stroke-width': 1.5 }),
    svg('circle', { cx: bx, cy: 190, r: 6, fill: COL.spore }),
    ...[-12, -4, 4, 12].map((dx) => line(bx + dx * 0.6, 152, bx + dx, 136, COL.hypha, 1.5)),
    ...[-12, -4, 4, 12].map((dx, i) => svg('ellipse', { cx: bx + dx * 1.3, cy: 128, rx: 4, ry: 6, fill: i % 2 ? COL.matB : COL.matA })),
    small(bx, 240, '5. On the gills: the two nuclei', { anchor: 'middle', bold: true }),
    small(bx, 252, 'fuse, then divide into four spores', { anchor: 'middle', bold: true }),
    arrow(120, 140, 60, 76, COL.ink, 1.2),
    small(60, 120, 'spores', { anchor: 'middle', soft: true }),
    small(60, 132, 'shed', { anchor: 'middle', soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};
