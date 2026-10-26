// Lesson 6, feeding plants: the parking spots on clay and humus that hold
// nutrients against the rain, the pH band chart, and where a shortage shows
// on a plant.

import { svg } from 'lesson-kit/dom';
import { label, redraw, small, still } from 'lesson-kit/draw';
import { makeRng } from 'lesson-kit/rng';
import { availability, cec, NAMES, NUTRIENTS, SIGNS, ALUMINIUM_PH, type Shortage } from '../../core/nutrients';
import { COL, figure, frame, slider, tint } from './kit';

const f1 = (n: number) => n.toFixed(1);

// ---- Parking spots --------------------------------------------------------------

export const parkingFigure = figure(['hold'], (_ctx, t) => {
  const W = 400;
  const H = 220;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  let clay = 10;
  let om = 2;
  let rain = 0;
  const paint = () => {
    const rng = makeRng(5);
    const c = cec(clay, om);
    const spots = Math.min(48, Math.round(c * 1.5));
    const shapes: SVGElement[] = [];
    // The surface: a clay plate and a lump of humus, with their spots along the top.
    const y = 150;
    shapes.push(svg('rect', { x: 20, y, width: 360, height: 26, rx: 6, fill: COL.clayPale, stroke: COL.clay }));
    const humusW = Math.min(170, 30 + om * 20);
    shapes.push(svg('rect', { x: 380 - humusW, y, width: humusW, height: 26, rx: 10, fill: COL.organic }));
    shapes.push(small(24, y + 42, 'clay', { fill: COL.clay, bold: true }), small(376, y + 42, 'humus', { anchor: 'end', fill: COL.organic, bold: true }));
    const parked = ['#c08a28', '#7c8a5c', '#6a4fa0'];
    for (let i = 0; i < spots; i++) {
      const x = 28 + (i * 344) / Math.max(1, spots - 1);
      shapes.push(svg('circle', { cx: f1(x), cy: y, r: 3, fill: COL.ink }));
      shapes.push(svg('circle', { cx: f1(x), cy: y - 8, r: 4.5, fill: parked[i % 3] }));
    }
    // Loose nitrate in the water between, washing down with the rain.
    const left = Math.exp(-rain / 4);
    for (let i = 0; i < 16; i++) {
      const gone = rng() > left;
      const x = 30 + rng() * 340;
      const yy = gone ? 200 + rng() * 14 : 40 + rng() * 80;
      if (!gone) shapes.push(svg('circle', { cx: f1(x), cy: f1(yy), r: 4, fill: 'none', stroke: COL.water, 'stroke-width': 2 }));
    }
    shapes.push(
      small(30, 20, 'held on the spots: calcium, magnesium, potassium', { fill: COL.ink, bold: true }),
      small(30, 32, 'loose in the water: nitrate', { fill: COL.water, bold: true }),
    );
    redraw(g, ...shapes);
    f.readout.textContent = `About ${Math.round(c)} parking spots' worth (cation exchange capacity ${Math.round(c)}). ${rain > 0 ? `After ${rain} cm of rain, ${Math.round(left * 100)}% of the loose nitrate is still in reach; what is parked stays.` : 'Slide the rain to see what washes out.'}`;
    if (t.goal === 'hold' && c >= 15) t.done();
  };
  f.controls.append(
    slider('Clay', 0, 50, 1, clay, (v) => `${v}%`, (v) => { clay = v; paint(); }, 'clay').node,
    slider('Organic matter', 0, 8, 0.5, om, (v) => `${v}%`, (v) => { om = v; paint(); }, 'organic').node,
    slider('Rain', 0, 20, 1, 0, (v) => `${v} cm`, (v) => { rain = v; paint(); }, 'water').node,
  );
  paint();
  return f.node;
});

// ---- pH -----------------------------------------------------------------------

/** Each nutrient a band whose thickness is how easily roots reach it, from pH 4 to 9, with the range most vegetables like picked out. */
export function phDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 300;
  const s = still(W, H);
  const x0 = 88;
  const x1 = 385;
  const X = (ph: number) => x0 + ((ph - 4) / 5) * (x1 - x0);
  const rowH = 20;
  const y0 = 30;
  const yb = y0 + NUTRIENTS.length * rowH + 4;
  const colourOf = (i: number) => (i < 3 ? COL.leaf : i < 6 ? COL.sand : COL.clay);
  s.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }),
    // Where most vegetables do best, and where aluminium poisons roots.
    svg('rect', { x: X(6), y: y0 - 6, width: X(7) - X(6), height: yb - y0 + 6, fill: tint(COL.good, 0.14) }),
    small((X(6) + X(7)) / 2, y0 - 12, 'most vegetables', { anchor: 'middle', fill: COL.good, bold: true }),
    svg('rect', { x: X(4), y: y0 - 6, width: X(ALUMINIUM_PH) - X(4), height: yb - y0 + 6, fill: tint(COL.clay, 0.08) }),
    small((X(4) + X(ALUMINIUM_PH)) / 2, y0 - 12, 'aluminium harms roots', { anchor: 'middle', fill: COL.clay }),
  );
  NUTRIENTS.forEach((n, i) => {
    const yc = y0 + i * rowH + rowH / 2;
    const top: string[] = [];
    const bot: string[] = [];
    for (let ph = 4; ph <= 9.001; ph += 0.1) {
      const a = availability(n, ph) * (rowH / 2 - 1.5);
      top.push(`${f1(X(ph))},${f1(yc - a)}`);
      bot.unshift(`${f1(X(ph))},${f1(yc + a)}`);
    }
    s.svg.append(svg('polygon', { points: [...top, ...bot].join(' '), fill: tint(colourOf(i), 0.75) }), label(x0 - 8, yc + 4, NAMES[n], { anchor: 'end' }));
  });
  for (let ph = 4; ph <= 9; ph++) s.svg.append(small(X(ph), yb + 12, String(ph), { anchor: 'middle', soft: true }));
  s.svg.append(small(X(4), yb + 24, 'acid', { soft: true }), small((X(4) + X(9)) / 2, yb + 24, 'pH', { anchor: 'middle', soft: true }), small(X(9), yb + 24, 'alkaline', { anchor: 'end', soft: true }));
  return { node: s.node };
}

// ---- Where it shows -------------------------------------------------------------

/** A leaf at (x, y), pointing `dir` (-1 left, 1 right), coloured as a sign of a shortage. */
function leaf(x: number, y: number, dir: number, size: number, body: string, vein: string, edge?: string): SVGElement {
  const L = 44 * size * dir;
  const Wd = 15 * size;
  const g = svg('g');
  g.append(svg('path', { d: `M${x},${y} q${f1(L / 2)},${f1(-Wd)} ${f1(L)},0 q${f1(-L / 2)},${f1(Wd)} ${f1(-L)},0 z`, fill: body, stroke: edge ?? 'none', 'stroke-width': edge ? 3 : 0, 'stroke-linejoin': 'round' }));
  g.append(svg('path', { d: `M${x},${y} L${f1(x + L * 0.95)},${y}`, stroke: vein, 'stroke-width': 1.6 }));
  for (let k = 1; k <= 3; k++) {
    const vx = x + (L * k) / 4.2;
    g.append(svg('path', { d: `M${f1(vx)},${y} l${f1(L * 0.12)},${f1(-Wd * 0.5)} M${f1(vx)},${y} l${f1(L * 0.12)},${f1(Wd * 0.5)}`, stroke: vein, 'stroke-width': 1.1 }));
  }
  return g;
}

const SHORTAGES: Shortage[] = ['N', 'P', 'K', 'Mg', 'Fe', 'Ca'];
const HEALTHY = { leaf: COL.leaf, vein: '#4f7a33' };

/** Six plants side by side, each short of one nutrient: the older two pairs of leaves are at the bottom. */
export function leafDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 300;
  const s = still(W, H);
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }));
  SHORTAGES.forEach((n, k) => {
    const sign = SIGNS[n];
    const cx = 68 + (k % 3) * 132;
    const base = 120 + Math.floor(k / 3) * 146;
    s.svg.append(svg('path', { d: `M${cx},${base} L${cx},${base - 104}`, stroke: COL.leaf, 'stroke-width': 3 }));
    for (let i = 0; i < 4; i++) {
      const y = base - 12 - i * 26;
      const sick = (sign.where === 'old') === (i < 2);
      const body = sick ? sign.leaf : HEALTHY.leaf;
      const vein = sick ? sign.vein : HEALTHY.vein;
      const edge = sick ? sign.edge : undefined;
      const size = 0.95 - i * 0.12;
      s.svg.append(leaf(cx - 2, y, -1, size, body, vein, edge), leaf(cx + 2, y - 6, 1, size, body, vein, edge));
    }
    s.svg.append(
      label(cx, base + 15, NAMES[n], { anchor: 'middle', bold: true }),
      small(cx, base + 27, sign.where === 'old' ? 'old leaves first' : 'new leaves first', { anchor: 'middle', soft: true }),
    );
  });
  return { node: s.node };
}
