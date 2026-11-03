// Lesson 10, Peas in sterile sand: Hellriegel and Wilfarth's pots, a plant
// grown short of one element, and Liebig's barrel.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick, wrapped } from './kit';

const W = 400;

export type Crop = 'peas' | 'oats';
export type Pot = 'bare' | 'wash' | 'nitrate';

/** Growth after eight weeks in sterilised sand (1 = a well-fed plant), and whether the roots carry nodules. */
export function pot(crop: Crop, treatment: Pot): { growth: number; nodules: boolean } {
  if (treatment === 'nitrate') return { growth: 1, nodules: false };
  if (crop === 'peas' && treatment === 'wash') return { growth: 0.95, nodules: true };
  return { growth: 0.15, nodules: false };
}

const POTS: { id: Pot; name: string }[] = [
  { id: 'bare', name: 'Sterile sand, no nitrogen' },
  { id: 'wash', name: '+ a spoonful of soil wash' },
  { id: 'nitrate', name: '+ nitrate fertiliser' },
];

function plantIn(x: number, ground: number, growth: number, crop: Crop, nodules: boolean): SVGElement[] {
  const h = 20 + growth * 110;
  const green = growth > 0.5 ? COL.leaf : '#b8c46a';
  const out: SVGElement[] = [];
  if (crop === 'oats') {
    for (const dx of [-6, 0, 6]) out.push(svg('path', { d: `M${x + dx},${ground} q${dx},${-h * 0.5} ${dx * 2.5},${-h}`, stroke: green, 'stroke-width': 3, fill: 'none' }));
  } else {
    out.push(line(x, ground, x, ground - h, green, 2.5));
    for (let k = 0.25; k < 1; k += 0.22) {
      out.push(svg('ellipse', { cx: x - 8, cy: ground - h * k, rx: 7, ry: 4, fill: green }), svg('ellipse', { cx: x + 8, cy: ground - h * k - 3, rx: 7, ry: 4, fill: green }));
    }
  }
  // Roots below the sand line, with pink nodules where the bacteria live.
  for (const dx of [-12, 0, 12]) out.push(svg('path', { d: `M${x},${ground} q${dx * 0.5},12 ${dx},${22 + growth * 10}`, stroke: '#d9c49a', 'stroke-width': 1.5, fill: 'none' }));
  if (nodules) for (const [dx, dy] of [[-8, 14], [5, 18], [10, 26], [-4, 26]]) out.push(svg('circle', { cx: x + dx, cy: ground + dy, r: 2.8, fill: '#e08a9a', stroke: '#a24a5a', 'stroke-width': 0.6 }));
  return out;
}

export const potsFigure = figure(['nodules'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let crop: Crop = 'peas';
  const seen = new Set<Crop>();
  const paint = () => {
    const shown = open();
    const ground = 150;
    const parts: SVGElement[] = [];
    POTS.forEach((p, i) => {
      const x = 70 + i * 130;
      const r = shown ? pot(crop, p.id) : { growth: 0.12, nodules: false };
      parts.push(
        svg('path', { d: `M${x - 40},${ground - 6} L${x - 32},${ground + 44} L${x + 32},${ground + 44} L${x + 40},${ground - 6} Z`, fill: '#b7653a', opacity: 0.85 }),
        svg('rect', { x: x - 38, y: ground - 6, width: 76, height: 10, fill: '#e8dcb5' }),
        ...plantIn(x, ground, r.growth, crop, r.nodules),
        ...wrapped(x - 56, 212, p.name, 22, { soft: true, size: 'small' }),
      );
    });
    redraw(g, label(14, 22, crop === 'peas' ? 'Peas' : 'Oats', { bold: true }), small(60, 22, shown ? 'after eight weeks' : 'sown', { soft: true }), ...parts);
    if (!shown) return;
    seen.add(crop);
    f.readout.textContent = crop === 'peas'
      ? 'Peas grow with nitrate, and also with a spoonful of soil wash and no nitrogen at all: their roots carry pink nodules. Something in the soil let them take nitrogen from the air.'
      : 'Oats grow only when given nitrate. The soil wash does nothing for them: whatever it carries works only with peas.';
    if (seen.size === 2) t.done();
  };
  const which = pick(['Peas', 'Oats'], 0, (i) => { crop = i ? 'oats' : 'peas'; paint(); });
  f.controls.append(which.node);
  const open = guessFirst(t, f, {
    ask: 'Peas and oats in sterilised sand with no nitrogen both starve. Add a spoonful of water shaken up with field soil, and no fertiliser. Which grows?',
    options: ['Both', 'Only the peas', 'Neither'],
    answer: 1,
    reveal: 'done',
    sliders: [],
    buttons: which.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- One element short -----------------------------------------------------------------------------

export const ELEMENTS = ['None', 'N', 'P', 'K', 'Mg', 'Fe', 'Ca'] as const;
export type Missing = (typeof ELEMENTS)[number];

/** The plant moves these out of old leaves into new ones when short, so the old leaves show it first. */
export const MOBILE = new Set<Missing>(['N', 'P', 'K', 'Mg']);

const SIGNS: Record<Missing, { name: string; says: string }> = {
  None: { name: 'Nothing missing', says: 'A full solution: dark green, upright, growing well.' },
  N: { name: 'No nitrogen', says: 'Small, and the oldest leaves turn yellow all over: the plant strips their nitrogen to build new ones.' },
  P: { name: 'No phosphorus', says: 'Stunted and dark, the older leaves tinged purple.' },
  K: { name: 'No potassium', says: 'Older leaves scorched brown along their edges.' },
  Mg: { name: 'No magnesium', says: 'Older leaves yellow between green veins: magnesium sits at the centre of every chlorophyll molecule.' },
  Fe: { name: 'No iron', says: 'The youngest leaves yellow between green veins. Iron can’t be moved out of old leaves, so the new ones go short.' },
  Ca: { name: 'No calcium', says: 'The growing tip is stunted and dies back; the old leaves look fine. Calcium can’t be moved either.' },
};

export const knopFigure = figure(['mobile'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let missing: Missing = 'None';
  const seen = new Set<Missing>();
  const paint = () => {
    const small_ = missing === 'N' || missing === 'P' ? 0.75 : 1;
    const cx = 100;
    const ground = 200;
    const h = 170 * small_;
    const leaves: SVGElement[] = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const age = 1 - i / (n - 1); // 1 = oldest, at the bottom
      const y = ground - 20 - (i / (n - 1)) * (h - 30);
      const side = i % 2 ? 1 : -1;
      const len = 26 + age * 12;
      let fill: string = COL.leaf;
      let vein: string = '#2f5a24';
      let edge = 'none';
      if (missing === 'N' && age > 0.4) fill = age > 0.75 ? '#e2cf5a' : '#b8c46a';
      if (missing === 'P') fill = age > 0.5 ? '#5a3f6e' : '#2f5a2a';
      if (missing === 'K' && age > 0.5) edge = '#8a5a2a';
      if (missing === 'Mg' && age > 0.5) { fill = '#e2cf5a'; vein = COL.leaf; }
      if (missing === 'Fe' && age < 0.4) { fill = '#eadc7a'; vein = COL.leaf; }
      if (missing === 'Ca' && age < 0.2) fill = '#8a6d4c';
      const tipX = cx + side * len;
      leaves.push(
        svg('path', { d: `M${cx},${y} Q${cx + side * len * 0.5},${y - 14} ${tipX},${y - 4} Q${cx + side * len * 0.5},${y + 8} ${cx},${y} Z`, fill, stroke: edge, 'stroke-width': edge === 'none' ? 0 : 3 }),
        line(cx, y, tipX, y - 4, vein, 1),
      );
    }
    redraw(g,
      line(30, ground, 170, ground, COL.soil, 2),
      line(cx, ground, cx, ground - h, missing === 'Ca' ? '#8a6d4c' : COL.leaf, 3),
      ...leaves,
      small(cx, ground - h - 6, missing === 'Ca' ? 'dead tip' : 'youngest', { anchor: 'middle', soft: true }),
      small(cx + 60, ground - 8, 'oldest', { soft: true }),
      label(200, 40, SIGNS[missing].name, { bold: true }),
      ...wrapped(200, 60, SIGNS[missing].says, 30, { soft: true }),
      ...wrapped(200, 170, 'Grown in water with every mineral but one, as Sachs and Knop did around 1860. A sketch of the classic signs.', 32, { soft: true, size: 'small' }),
    );
    if (missing !== 'None') seen.add(missing);
    f.readout.textContent = missing === 'None'
      ? 'Leave one element out of the solution and see where the plant shows it.'
      : MOBILE.has(missing)
        ? 'Old leaves first: when this element runs short, the plant moves it out of its old leaves to feed the new growth.'
        : 'Young growth first: this element is locked into the cells where it was first put, so the newest parts go without.';
    if ([...seen].some((m) => MOBILE.has(m)) && [...seen].some((m) => !MOBILE.has(m))) t.done();
  };
  const p = pick(ELEMENTS.map((e) => (e === 'None' ? 'Full' : `No ${e}`)), 0, (i) => { missing = ELEMENTS[i]; paint(); });
  f.controls.append(p.node);
  paint();
  return f.node;
});

// ---- Liebig's barrel -------------------------------------------------------------------------------------

export const barrelStill = () => {
  const s = still(W, 220);
  const staves = [
    { name: 'H₂O', h: 0.9 },
    { name: 'light', h: 0.95 },
    { name: 'P', h: 0.8 },
    { name: 'N', h: 0.45 },
    { name: 'K', h: 0.85 },
    { name: 'Ca', h: 0.9 },
    { name: 'Mg', h: 0.75 },
    { name: 'S', h: 0.88 },
  ];
  const x0 = 40;
  const bottom = 196;
  const tall = 150;
  const level = bottom - tall * Math.min(...staves.map((v) => v.h));
  const out: SVGElement[] = [
    svg('rect', { width: W, height: 220, fill: COL.paper }),
  ];
  staves.forEach((v, i) => {
    const x = x0 + i * 22;
    out.push(
      svg('rect', { x, y: bottom - tall * v.h, width: 20, height: tall * v.h, fill: v.name === 'N' ? '#c98a5a' : '#b8925e', stroke: '#6b4f2e', 'stroke-width': 1 }),
      small(x + 10, bottom - tall * v.h - 5, v.name, { anchor: 'middle', bold: v.name === 'N' }),
    );
  });
  out.push(
    svg('rect', { x: x0, y: level, width: staves.length * 22 - 2, height: bottom - level, fill: COL.water, opacity: 0.45 }),
    small(x0 + 4, bottom - 8, 'growth', { fill: '#ffffff', bold: true }),
    svg('path', { d: `M${x0 + 3 * 22 + 20},${level} q8,4 10,16`, stroke: COL.water, 'stroke-width': 2, fill: 'none' }),
    label(240, 60, 'Liebig’s barrel', { bold: true }),
    ...wrapped(240, 80, 'The barrel holds only as much as its shortest stave allows. Growth is set by whatever is scarcest, here nitrogen. Raising any other stave does nothing.', 26, { soft: true }),
  );
  s.svg.append(...out);
  return { node: s.node };
};
