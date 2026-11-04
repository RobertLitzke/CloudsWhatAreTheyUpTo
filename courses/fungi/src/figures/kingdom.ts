// Lesson 2, Closer to us than to plants: where fungi sit among living
// things, sorted by looks (Linnaeus) and by shared proteins and genes
// (Baldauf and Palmer, 1993, and since), and a still of three cells.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { clado, type Clade } from './clado';
import { COL, figure, frame, guessFirst, pick, wrapped } from './kit';

const W = 400;

const FUNGI = COL.cap;
const PLANT = COL.leaf;
const ANIMAL = COL.matB;
const OTHER = COL.soft;

/** Linnaeus's sorting: two kingdoms, and everything that does not move goes with the plants. */
export const BY_LOOKS: Clade = {
  kids: [
    { label: 'Plants (Linnaeus, 1753)', kids: [
      { label: 'Flowering plants', color: PLANT },
      { label: 'Ferns and mosses', color: PLANT },
      { label: 'Algae', color: PLANT },
      { label: 'Fungi', color: FUNGI },
      { label: 'Water moulds', color: OTHER },
      { label: 'Slime moulds', color: OTHER },
    ] },
    { label: 'Animals', kids: [
      { label: 'Animals', color: ANIMAL },
    ] },
  ],
};

/** The tree from shared genes: fungi and animals are each other's closest kin; water moulds sit with brown seaweeds. */
export const BY_GENES: Clade = {
  kids: [
    { kids: [
      { label: 'Plants', note: 'with green and red algae', color: PLANT },
      { label: 'Water moulds', note: 'kin of brown seaweeds', color: OTHER },
    ] },
    { kids: [
      { label: 'Slime moulds', note: 'kin of amoebas', color: OTHER },
      { label: 'One spore tail', kids: [
        { label: 'Fungi', note: 'chitin walls, absorb food', color: FUNGI, bold: true },
        { label: 'Animals', note: 'swallow food', color: ANIMAL, bold: true },
      ] },
    ] },
  ],
};

export const relativesFigure = figure(['genes'], (_ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  let view = 0;
  const paint = () => {
    const tree = view === 0 ? BY_LOOKS : BY_GENES;
    const drawn = clado(tree, { x: 24, y: view === 0 ? 30 : 34, w: W - 24, gap: view === 0 ? 24 : 40, ink: COL.ink, labelAt: 210 });
    redraw(g,
      label(14, 16, view === 0 ? 'Sorted by looks: does it move?' : 'Sorted by shared genes and proteins', { bold: true }),
      ...drawn.parts,
    );
    if (!open()) return;
    f.readout.textContent = view === 0
      ? 'Linnaeus put fungi among the plants, because they stand still and grow from the ground. Water moulds and slime moulds went in too.'
      : 'Fungi and animals share a common ancestor that plants do not: their nearest relatives are each other. The water moulds, long called fungi, turned out to be kin of brown seaweeds.';
    if (view === 1) t.done();
  };
  const views = pick(['By looks (1753)', 'By genes (1993 on)'], 0, (i) => { view = i; paint(); });
  f.controls.append(views.node);
  const open = guessFirst(t, f, {
    ask: 'Compare the genes and proteins of a mushroom with those of an oak and a horse. Which is the mushroom closer to?',
    options: ['The oak', 'The horse', 'Equally far from both'],
    answer: 1,
    sliders: [],
    buttons: views.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

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
