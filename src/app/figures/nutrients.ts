// Lesson 6, feeding plants: the parking spots on clay and humus that hold
// nutrients against the rain, the pH band chart, and where a shortage shows
// on a plant.

import { el, svg } from 'lesson-kit/dom';
import { label, redraw, small } from 'lesson-kit/draw';
import { makeRng } from 'lesson-kit/rng';
import { availability, cec, leastAt, NAMES, NUTRIENTS, scarceAt, SIGNS, ALUMINIUM_PH, type Shortage } from '../../core/nutrients';
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

export const phFigure = figure(['sweet'], (_ctx, t) => {
  const W = 400;
  const H = 290;
  const f = frame(W, H, 3);
  const bands = svg('g');
  const marker = svg('g');
  const x0 = 88;
  const x1 = 385;
  const X = (ph: number) => x0 + ((ph - 4) / 5) * (x1 - x0);
  const rowH = 20;
  const y0 = 16;
  const colourOf = (i: number) => (i < 3 ? COL.leaf : i < 6 ? COL.sand : COL.clay);
  // Each nutrient a band whose thickness is its availability.
  const all: SVGElement[] = [];
  NUTRIENTS.forEach((n, i) => {
    const yc = y0 + i * rowH + rowH / 2;
    const top: string[] = [];
    const bot: string[] = [];
    for (let ph = 4; ph <= 9.001; ph += 0.1) {
      const a = availability(n, ph) * (rowH / 2 - 1.5);
      top.push(`${f1(X(ph))},${f1(yc - a)}`);
      bot.unshift(`${f1(X(ph))},${f1(yc + a)}`);
    }
    all.push(svg('polygon', { points: [...top, ...bot].join(' '), fill: tint(colourOf(i), 0.75) }), label(x0 - 8, yc + 4, NAMES[n], { anchor: 'end' }));
  });
  const yb = y0 + NUTRIENTS.length * rowH + 4;
  for (let ph = 4; ph <= 9; ph++) all.push(small(X(ph), yb + 12, String(ph), { anchor: 'middle', soft: true }));
  all.push(small(X(4), yb + 24, 'acid', { soft: true }), small(X(9), yb + 24, 'alkaline', { anchor: 'end', soft: true }));
  all.push(svg('rect', { x: X(4), y: y0, width: X(ALUMINIUM_PH) - X(4), height: NUTRIENTS.length * rowH, fill: tint(COL.clay, 0.08) }));
  redraw(bands, ...all);
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), bands, marker);
  let ph = 5;
  const paint = () => {
    redraw(marker, svg('line', { x1: f1(X(ph)), y1: y0 - 4, x2: f1(X(ph)), y2: yb, stroke: COL.ink, 'stroke-width': 2 }), small(X(ph), yb + 24, `pH ${ph.toFixed(1)}`, { anchor: 'middle', bold: true }));
    const scarce = scarceAt(ph).map((n) => NAMES[n]);
    const least = leastAt(ph);
    const al = ph < ALUMINIUM_PH ? ' Aluminium dissolves and harms roots, too.' : '';
    f.readout.textContent = scarce.length
      ? `At pH ${ph.toFixed(1)}, hard to reach: ${scarce.join(', ')}.${al}`
      : least.a >= 0.65
        ? `At pH ${ph.toFixed(1)}, every band is wide: nothing is locked away. This is where most vegetables are happiest.`
        : `At pH ${ph.toFixed(1)}, all are within reach, though ${NAMES[least.n]} is getting scarce.`;
    if (t.goal === 'sweet' && least.a >= 0.65) t.done();
  };
  f.controls.append(slider('pH', 4, 9, 0.1, ph, (v) => v.toFixed(1), (v) => { ph = v; paint(); }, 'clay').node);
  paint();
  return f.node;
});

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

export const leafFigure = figure(['look'], (_ctx, t) => {
  const W = 400;
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  let at: Shortage | null = null;
  const seen = new Set<Shortage>();
  const paint = () => {
    const sign = at ? SIGNS[at] : null;
    const shapes: SVGElement[] = [svg('path', { d: 'M200,214 C198,150 202,90 200,24', stroke: COL.leaf, 'stroke-width': 4, fill: 'none' })];
    // Four pairs of leaves, oldest at the bottom.
    for (let i = 0; i < 4; i++) {
      const y = 196 - i * 46;
      const old = i < 2;
      const sick = sign && ((sign.where === 'old' && old) || (sign.where === 'new' && !old));
      const body = sick ? sign!.leaf : HEALTHY.leaf;
      const vein = sick ? sign!.vein : HEALTHY.vein;
      const edge = sick ? sign!.edge : undefined;
      const size = 1.3 - i * 0.18;
      shapes.push(leaf(198, y, -1, size, body, vein, edge), leaf(202, y - 10, 1, size, body, vein, edge));
    }
    shapes.push(small(300, 196, 'oldest leaves', { soft: true }), small(300, 66, 'newest leaves', { soft: true }));
    if (at) shapes.push(label(20, 30, NAMES[at], { bold: true }), small(20, 44, sign!.where === 'old' ? 'shows first on old leaves' : 'shows first on new leaves', { soft: true }));
    redraw(g, ...shapes);
    f.readout.textContent = sign ? `${sign.looks} ${sign.cause}` : 'A healthy plant. Pick a nutrient to see how a plant short of it looks.';
    if (t.goal === 'look' && seen.size >= 3) t.done();
  };
  const chips = SHORTAGES.map((s) => el('button.chip', { type: 'button', onclick: () => {
    at = s;
    seen.add(s);
    chips.forEach((c, i) => c.classList.toggle('on', SHORTAGES[i] === s));
    paint();
  } }, NAMES[s]));
  f.controls.append(el('div.chips', {}, chips));
  paint();
  return f.node;
});
