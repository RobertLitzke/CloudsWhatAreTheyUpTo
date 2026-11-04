// Lesson K2, Using a key: a drawn specimen named by walking an either-or key,
// wrong turns and all; and a key you can enter anywhere, ticking features
// until one plant is left. The drawn plants are reused in later K lessons.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { button, COL, figure, frame, pick } from './kit';

const W = 400;

export type Specimen = {
  id: string;
  name: string;
  leaves: 'opposite' | 'alternate' | 'basal';
  leaf: 'simple' | 'pinnate' | 'palmate' | 'grass';
  petals: number;
  lipped: boolean;
  color: string;
};

/** Eight common plants of the Pacific Northwest, drawn simply. */
export const PLANTS: Specimen[] = [
  { id: 'rose', name: 'Nootka rose', leaves: 'alternate', leaf: 'pinnate', petals: 5, lipped: false, color: '#e58aa6' },
  { id: 'fireweed', name: 'Fireweed', leaves: 'alternate', leaf: 'simple', petals: 4, lipped: false, color: '#c94f9a' },
  { id: 'selfheal', name: 'Self-heal', leaves: 'opposite', leaf: 'simple', petals: 5, lipped: true, color: '#8e6cc0' },
  { id: 'camas', name: 'Common camas', leaves: 'basal', leaf: 'grass', petals: 6, lipped: false, color: '#5b6fc4' },
  { id: 'lupine', name: 'Bigleaf lupine', leaves: 'alternate', leaf: 'palmate', petals: 5, lipped: true, color: '#6f6fd0' },
  { id: 'snowberry', name: 'Snowberry', leaves: 'opposite', leaf: 'simple', petals: 5, lipped: false, color: '#f0c4cc' },
  { id: 'elderberry', name: 'Red elderberry', leaves: 'opposite', leaf: 'pinnate', petals: 5, lipped: false, color: '#efe6c4' },
  { id: 'currant', name: 'Flowering currant', leaves: 'alternate', leaf: 'simple', petals: 5, lipped: false, color: '#d65a7a' },
];

export const plant = (id: string) => PLANTS.find((p) => p.id === id)!;

type Lead = { text: string; to: number | string };
export type Couplet = { n: number; a: Lead; b: Lead; test: (p: Specimen) => 'a' | 'b' };

/** An either-or key to the eight plants. A lead goes to another couplet's number, or names a plant by id. */
export const KEY: Couplet[] = [
  { n: 1, a: { text: 'Leaves narrow, parallel-veined, all from the base', to: 'camas' }, b: { text: 'Leaves net-veined, on a leafy stem', to: 2 }, test: (p) => (p.leaves === 'basal' ? 'a' : 'b') },
  { n: 2, a: { text: 'Leaves opposite, in pairs', to: 3 }, b: { text: 'Leaves alternate, one at each node', to: 5 }, test: (p) => (p.leaves === 'opposite' ? 'a' : 'b') },
  { n: 3, a: { text: 'Leaves compound, of several leaflets', to: 'elderberry' }, b: { text: 'Leaves simple, in one piece', to: 4 }, test: (p) => (p.leaf !== 'simple' ? 'a' : 'b') },
  { n: 4, a: { text: 'Flower two-lipped', to: 'selfheal' }, b: { text: 'Flower the same all round', to: 'snowberry' }, test: (p) => (p.lipped ? 'a' : 'b') },
  { n: 5, a: { text: 'Leaves compound', to: 6 }, b: { text: 'Leaves simple', to: 7 }, test: (p) => (p.leaf !== 'simple' ? 'a' : 'b') },
  { n: 6, a: { text: 'Leaflets spread from one point, like fingers', to: 'lupine' }, b: { text: 'Leaflets in two rows along a stalk', to: 'rose' }, test: (p) => (p.leaf === 'palmate' ? 'a' : 'b') },
  { n: 7, a: { text: 'Four petals', to: 'fireweed' }, b: { text: 'Five petals', to: 'currant' }, test: (p) => (p.petals === 4 ? 'a' : 'b') },
];

/** Where the key takes a plant if every question is answered right: the leads chosen, ending at its name. */
export function walk(p: Specimen): { path: string[]; name: string } {
  let at: number | string = 1;
  const path: string[] = [];
  while (typeof at === 'number') {
    const c = KEY.find((k) => k.n === at)!;
    const side = c.test(p);
    path.push(`${c.n}${side}`);
    at = c[side].to;
  }
  return { path, name: at };
}

/** A drawn plant standing on `base`, centred on `cx`, `s` times full size (full is about 150 high). */
export function drawPlant(p: Specimen, cx: number, base: number, s = 1): SVGElement[] {
  const out: SVGElement[] = [];
  const green = '#7fae5c';
  const top = base - 150 * s;
  const leaf = (x: number, y: number, dir: number) => {
    if (p.leaf === 'simple') {
      const lx = x + dir * 18 * s;
      out.push(svg('ellipse', { cx: lx, cy: y - 4 * s, rx: 16 * s, ry: 6.5 * s, fill: green, stroke: COL.leaf, 'stroke-width': 0.8, transform: `rotate(${-dir * 18} ${lx} ${y - 4 * s})` }));
    } else if (p.leaf === 'pinnate') {
      const ex = x + dir * 36 * s;
      const ey = y - 10 * s;
      out.push(line(x, y, ex, ey, COL.leaf, 1));
      for (const f of [0.35, 0.65]) {
        const px = x + (ex - x) * f;
        const py = y + (ey - y) * f;
        for (const side of [-1, 1]) out.push(svg('ellipse', { cx: px + dir * 2 * s, cy: py + side * 6 * s, rx: 6 * s, ry: 3.2 * s, fill: green, stroke: COL.leaf, 'stroke-width': 0.6 }));
      }
      out.push(svg('ellipse', { cx: ex + dir * 4 * s, cy: ey, rx: 6 * s, ry: 3.2 * s, fill: green, stroke: COL.leaf, 'stroke-width': 0.6 }));
    } else if (p.leaf === 'palmate') {
      const hx = x + dir * 22 * s;
      const hy = y - 8 * s;
      out.push(line(x, y, hx, hy, COL.leaf, 1));
      for (let k = 0; k < 7; k++) {
        const a = (-90 + (k - 3) * 30) * (Math.PI / 180);
        const lx = hx + Math.cos(a) * 9 * s;
        const ly = hy + Math.sin(a) * 9 * s;
        out.push(svg('ellipse', { cx: lx, cy: ly, rx: 9 * s, ry: 2.6 * s, fill: green, stroke: COL.leaf, 'stroke-width': 0.5, transform: `rotate(${(a * 180) / Math.PI} ${lx} ${ly})` }));
      }
    }
  };
  const flower = (x: number, y: number, r: number) => {
    if (p.lipped) {
      out.push(
        svg('ellipse', { cx: x, cy: y - 5 * r, rx: 5 * r, ry: 7 * r, fill: p.color, stroke: COL.soft, 'stroke-width': 0.5 }),
        svg('ellipse', { cx: x, cy: y + 5 * r, rx: 9 * r, ry: 4.5 * r, fill: p.color, stroke: COL.soft, 'stroke-width': 0.5 }),
      );
      return;
    }
    for (let k = 0; k < p.petals; k++) {
      const a = (k / p.petals) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * 8 * r;
      const py = y + Math.sin(a) * 8 * r;
      out.push(svg('ellipse', { cx: px, cy: py, rx: 7 * r, ry: 4 * r, fill: p.color, stroke: COL.soft, 'stroke-width': 0.5, transform: `rotate(${(a * 180) / Math.PI} ${px} ${py})` }));
    }
    out.push(svg('circle', { cx: x, cy: y, r: 2.6 * r, fill: COL.light }));
  };
  if (p.leaves === 'basal') {
    for (const k of [-2, -1, 0, 1, 2]) {
      out.push(svg('path', { d: `M${cx},${base} q${k * 14 * s},${-40 * s} ${k * 26 * s + 4},${-(80 - Math.abs(k) * 12) * s}`, fill: 'none', stroke: green, 'stroke-width': 3.2 * s + 0.8, 'stroke-linecap': 'round' }));
    }
    out.push(line(cx, base, cx, top, COL.leaf, 1.6));
    flower(cx, top, s);
    flower(cx - 9 * s, top + 22 * s, s);
    flower(cx + 9 * s, top + 44 * s, s);
    return out;
  }
  out.push(line(cx, base, cx, top + 8 * s, COL.leaf, 1.8));
  [0.28, 0.5, 0.72].forEach((f, i) => {
    const y = base - 150 * s * f;
    if (p.leaves === 'opposite') {
      leaf(cx, y, -1);
      leaf(cx, y, 1);
    } else leaf(cx, y, i % 2 ? -1 : 1);
  });
  flower(cx, top, s * 1.15);
  return out;
}

// ---- Walking the key ---------------------------------------------------------------------------------

export const keyFigure = figure(['keyed'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  const order = ['rose', 'selfheal', 'fireweed', 'elderberry', 'lupine', 'camas', 'currant', 'snowberry'];
  let which = 0;
  let at: number | string = 1;
  let path: string[] = [];
  const named = new Set<string>();
  const a = button('', () => choose('a'), false);
  const b = button('', () => choose('b'), false);
  const again = button('Start again', () => { at = 1; path = []; paint(); });
  const next = button('Another plant', () => { which = (which + 1) % order.length; at = 1; path = []; paint(); });
  const choose = (side: 'a' | 'b') => {
    if (typeof at !== 'number') return;
    const c = KEY.find((k) => k.n === at)!;
    path.push(`${c.n}${side}`);
    at = c[side].to;
    paint();
  };
  const paint = () => {
    const p = plant(order[which]);
    const parts: SVGElement[] = [...drawPlant(p, 90, 200, 1.05)];
    parts.push(small(90, 214, 'Drawn simply. What is it?', { anchor: 'middle', soft: true }));
    parts.push(label(190, 24, 'The key', { bold: true }));
    parts.push(small(190, 42, path.length ? `Leads taken: ${path.join(', ')}` : 'Start at couplet 1.', { soft: true }));
    if (typeof at === 'number') {
      const c = KEY.find((k) => k.n === at)!;
      parts.push(
        small(190, 72, `Couplet ${c.n}. Which is true`, { bold: true }),
        small(190, 88, 'of this plant? Choose below.', { bold: true }),
      );
      a.textContent = c.a.text;
      b.textContent = c.b.text;
      a.disabled = b.disabled = false;
      f.readout.textContent = 'Answer each question about the plant on the left. Each answer leads to another couplet, or to a name.';
    } else {
      const name = plant(at).name;
      const right = at === p.id;
      parts.push(label(190, 84, `The key says: ${name}`, { bold: true, fill: right ? COL.good : COL.bad }));
      a.disabled = b.disabled = true;
      if (right) {
        named.add(p.id);
        f.readout.textContent = `${name}, keyed in ${path.length} steps. ${named.size >= 2 ? 'A key never needs a picture of every plant, only the right questions in the right order.' : 'Try another plant.'}`;
      } else {
        const good = walk(p).path;
        const wrong = path.findIndex((x, i) => x !== good[i]);
        f.readout.textContent = `A wrong turn at couplet ${path[wrong].slice(0, -1)}: look again at the plant and compare ${path[wrong].slice(0, -1)}a with ${path[wrong].slice(0, -1)}b. A key can only be as right as each answer. Start again.`;
      }
    }
    redraw(g, ...parts);
    if (named.size >= 2) t.done();
  };
  const row = document.createElement('div');
  row.className = 'chips';
  row.append(again, next);
  f.controls.append(a, b, row);
  paint();
  return f.node;
});

// ---- A key you can enter anywhere --------------------------------------------------------------------

export type Ticks = { leaves: 'any' | Specimen['leaves']; leaf: 'any' | 'simple' | 'compound'; flower: 'any' | 'round' | 'lipped'; petals: 'any' | 4 | 5 | 6 };

/** The plants that fit every ticked feature. */
export function fits(t: Ticks): Specimen[] {
  return PLANTS.filter((p) =>
    (t.leaves === 'any' || p.leaves === t.leaves)
    && (t.leaf === 'any' || (t.leaf === 'simple' ? p.leaf === 'simple' : p.leaf === 'pinnate' || p.leaf === 'palmate'))
    && (t.flower === 'any' || (t.flower === 'lipped') === p.lipped)
    && (t.petals === 'any' || p.petals === t.petals));
}

export const multiFigure = figure(['one'], (_ctx, t) => {
  const f = frame(W, 250, 2);
  const g = svg('g');
  f.svg.append(g);
  const ticks: Ticks = { leaves: 'any', leaf: 'any', flower: 'any', petals: 'any' };
  const paint = () => {
    const left = new Set(fits(ticks).map((p) => p.id));
    const parts: SVGElement[] = [];
    PLANTS.forEach((p, i) => {
      const cx = 50 + (i % 4) * 100;
      const base = 112 + Math.floor(i / 4) * 120;
      const on = left.has(p.id);
      const grp = svg('g', { opacity: on ? 1 : 0.15 });
      grp.append(...drawPlant(p, cx, base - 6, 0.55));
      parts.push(grp, small(cx, base + 8, p.name, { anchor: 'middle', bold: on, soft: !on }));
    });
    redraw(g, ...parts);
    f.readout.textContent = left.size === 1
      ? `Only ${PLANTS.find((p) => left.has(p.id))!.name} fits. You could have ticked the features in any order.`
      : left.size === 0
        ? 'Nothing fits: one of the ticks is wrong for every plant here.'
        : `${left.size} plants fit. Tick what you can see, in any order.`;
    if (left.size === 1) t.done();
  };
  const rows = [
    pick(['Leaves: any', 'opposite', 'alternate', 'from the base'], 0, (i) => { ticks.leaves = (['any', 'opposite', 'alternate', 'basal'] as const)[i]; paint(); }),
    pick(['Leaf: any', 'simple', 'compound'], 0, (i) => { ticks.leaf = (['any', 'simple', 'compound'] as const)[i]; paint(); }),
    pick(['Flower: any', 'round', 'two-lipped'], 0, (i) => { ticks.flower = (['any', 'round', 'lipped'] as const)[i]; paint(); }),
    pick(['Petals: any', '4', '5', '6'], 0, (i) => { ticks.petals = (['any', 4, 5, 6] as const)[i]; paint(); }),
  ];
  f.controls.append(...rows.map((r) => r.node));
  paint();
  return f.node;
});
