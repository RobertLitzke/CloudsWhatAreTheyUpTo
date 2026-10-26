// The garden, drawn: a vegetable bed in the sun with the ground cut away under
// it, so the reader sees what the plants stand in. Sky and hedge at the top,
// the bed and its plants at ground level, then the soil in layers, with roots,
// a worm, stones and the pale threads of fungi. Flat, lightly geometric shapes
// in the site's palette; the same seed always draws the same garden.

import { svg } from 'lesson-kit/dom';
import { makeRng, type Rng } from 'lesson-kit/rng';

export const W = 400;

export interface GardenOptions {
  seed: number;
  /** Drawing height; the width is always 400. */
  h?: number;
  /** Where the ground is, as a share of the height from the top. */
  ground?: number;
  /** Morning is pale and green-gold; noon is bluer. */
  time?: 'morning' | 'noon';
  /** Where the plants go, from the first to the last; narrower for a picture that is cropped at the sides. */
  span?: [number, number];
  /** How the drawing fits its box (an SVG preserveAspectRatio). */
  align?: string;
}

const P = {
  skyTop: { morning: '#cfe2c6', noon: '#bcdbe6' },
  skyLow: { morning: '#f6ecd0', noon: '#eef3df' },
  sun: '#f7dc8a',
  hillFar: '#a9c391',
  hillNear: '#8fb07a',
  hedge: '#5a7f4a',
  hedgeDark: '#46683b',
  fence: '#f1e6c8',
  grass: '#7da35a',
  bed: '#5a3f28',
  mulch: '#7a5a38',
  topsoil: '#3d2b1c',
  topsoilLow: '#4c3523',
  subsoil: '#7b5838',
  deep: '#9a7a50',
  stone: '#9a9284',
  stoneDark: '#7d7568',
  speck: '#c9b48a',
  root: '#ecdfc3',
  fungus: '#f6eedb',
  worm: '#c98676',
  wormDark: '#a9685a',
  leaf: '#6c9b40',
  leafDark: '#4e7a2c',
  leafPale: '#9cc46a',
  tomato: '#d2492f',
  petal: '#f2b632',
  seedHead: '#6a4320',
  carrotTop: '#5e9a3a',
};

const f1 = (n: number) => n.toFixed(1);

/** A wavy horizontal line from x 0 to W around `y`, as path commands after an M. */
function wave(y: number, rng: Rng, amp: number, steps = 8): string {
  let d = `M0,${f1(y)}`;
  const dx = W / steps;
  for (let i = 1; i <= steps; i++) {
    const x = i * dx;
    const cy = y + (rng() - 0.5) * 2 * amp;
    d += ` Q${f1(x - dx / 2)},${f1(cy)} ${f1(x)},${f1(y + (rng() - 0.5) * amp)}`;
  }
  return d;
}

/** A band of ground from a wavy top edge down to `bottom`. */
function band(top: number, bottom: number, fill: string, rng: Rng, amp = 3): SVGElement {
  return svg('path', { d: `${wave(top, rng, amp)} L${W},${bottom} L0,${bottom} Z`, fill });
}

/** A root system from (x, y) down `depth`: a tap root and side roots that fork. */
function roots(x: number, y: number, depth: number, rng: Rng, spread: number): SVGElement {
  const g = svg('g', { fill: 'none', stroke: P.root, 'stroke-linecap': 'round', opacity: 0.85 });
  const grow = (x0: number, y0: number, angle: number, len: number, width: number, level: number) => {
    const x1 = x0 + Math.sin(angle) * len;
    const y1 = y0 + Math.cos(angle) * len;
    const bend = (rng() - 0.5) * len * 0.4;
    g.append(svg('path', { d: `M${f1(x0)},${f1(y0)} Q${f1((x0 + x1) / 2 + bend)},${f1((y0 + y1) / 2)} ${f1(x1)},${f1(y1)}`, 'stroke-width': f1(width) }));
    if (level >= 3 || len < 6) return;
    const kids = level === 0 ? 4 : 2;
    for (let k = 0; k < kids; k++) {
      const t = 0.35 + rng() * 0.55;
      const bx = x0 + (x1 - x0) * t;
      const by = y0 + (y1 - y0) * t;
      const side = k % 2 ? 1 : -1;
      grow(bx, by, angle + side * (0.5 + rng() * spread), len * (0.45 + rng() * 0.2), width * 0.6, level + 1);
    }
  };
  grow(x, y, (rng() - 0.5) * 0.2, depth, 2.2, 0);
  return g;
}

/** Pale fungal threads wandering between roots. */
function hyphae(x: number, y: number, rng: Rng): SVGElement {
  const g = svg('g', { fill: 'none', stroke: P.fungus, 'stroke-width': 0.5, opacity: 0.55 });
  for (let i = 0; i < 6; i++) {
    let px = x + (rng() - 0.5) * 30;
    let py = y + (rng() - 0.5) * 16;
    let d = `M${f1(px)},${f1(py)}`;
    for (let s = 0; s < 4; s++) {
      px += (rng() - 0.5) * 22;
      py += (rng() - 0.3) * 10;
      d += ` T${f1(px)},${f1(py)}`;
    }
    g.append(svg('path', { d }));
  }
  return g;
}

/** An earthworm: a fat curved line in segments, with a darker band (the saddle). */
function worm(x: number, y: number, len: number, rng: Rng): SVGElement {
  const pts: [number, number][] = [];
  const phase = rng() * 6;
  for (let i = 0; i <= 16; i++) pts.push([x + (i / 16) * len, y + Math.sin(phase + i / 2.6) * 4]);
  const d = 'M' + pts.map(([a, b]) => `${f1(a)},${f1(b)}`).join(' L');
  const g = svg('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    svg('path', { d, stroke: P.worm, 'stroke-width': 4.2 }),
  );
  // The saddle, a third of the way along.
  const s = pts.slice(5, 7);
  g.append(svg('path', { d: 'M' + s.map(([a, b]) => `${f1(a)},${f1(b)}`).join(' L'), stroke: P.wormDark, 'stroke-width': 4.6 }));
  for (let i = 1; i < 16; i += 1) {
    const [a, b] = pts[i];
    g.append(svg('line', { x1: f1(a), y1: f1(b - 1.6), x2: f1(a), y2: f1(b + 1.6), stroke: P.wormDark, 'stroke-width': 0.4, opacity: 0.6 }));
  }
  return g;
}

/** A stone: a rounded irregular polygon with a highlight. */
function stone(x: number, y: number, r: number, rng: Rng): SVGElement {
  const n = 7;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.75 + rng() * 0.35);
    return `${f1(x + Math.cos(a) * rr * 1.3)},${f1(y + Math.sin(a) * rr)}`;
  }).join(' ');
  return svg('g', {},
    svg('polygon', { points: pts, fill: P.stone, stroke: P.stoneDark, 'stroke-width': 0.6, 'stroke-linejoin': 'round' }),
    svg('ellipse', { cx: f1(x - r * 0.3), cy: f1(y - r * 0.3), rx: f1(r * 0.4), ry: f1(r * 0.2), fill: '#b9b2a4', opacity: 0.8 }),
  );
}

// ---- Plants ----------------------------------------------------------------

function lettuce(x: number, y: number, s: number): SVGElement {
  const g = svg('g', {});
  const leaves = [[-9, -4, -30], [9, -4, 30], [-5, -8, -12], [5, -8, 12], [0, -10, 0]] as const;
  leaves.forEach(([dx, dy, rot], i) =>
    g.append(svg('ellipse', { cx: f1(x + dx * s), cy: f1(y + dy * s), rx: f1(7 * s), ry: f1(10 * s), fill: i < 2 ? P.leafDark : i < 4 ? P.leaf : P.leafPale, transform: `rotate(${rot} ${f1(x + dx * s)} ${f1(y + dy * s)})` })),
  );
  return g;
}

function carrot(x: number, y: number, s: number): SVGElement {
  const g = svg('g', { stroke: P.carrotTop, 'stroke-width': 1.2, fill: 'none', 'stroke-linecap': 'round' });
  for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) {
    const tx = x + Math.sin(a) * 18 * s;
    const ty = y - Math.cos(a) * 20 * s;
    g.append(svg('path', { d: `M${f1(x)},${f1(y)} Q${f1((x + tx) / 2)},${f1(ty + 6 * s)} ${f1(tx)},${f1(ty)}` }));
    g.append(svg('circle', { cx: f1(tx), cy: f1(ty), r: f1(2.6 * s), fill: P.carrotTop, stroke: 'none' }));
  }
  // The orange shoulder of the root, just showing.
  g.append(svg('path', { d: `M${f1(x - 3 * s)},${f1(y)} L${f1(x + 3 * s)},${f1(y)} L${f1(x)},${f1(y + 16 * s)} Z`, fill: '#e07a2c', stroke: 'none' }));
  return g;
}

function tomato(x: number, y: number, s: number): SVGElement {
  const top = y - 62 * s;
  const g = svg('g', {},
    svg('line', { x1: f1(x + 5 * s), y1: f1(y + 4), x2: f1(x + 5 * s), y2: f1(top - 6 * s), stroke: '#b8925c', 'stroke-width': 2 }),
    svg('path', { d: `M${f1(x)},${f1(y)} Q${f1(x - 4 * s)},${f1((y + top) / 2)} ${f1(x)},${f1(top)}`, stroke: P.leafDark, 'stroke-width': 2, fill: 'none' }),
  );
  for (let i = 0; i < 5; i++) {
    const ly = y - (12 + i * 11) * s;
    const side = i % 2 ? 1 : -1;
    g.append(svg('ellipse', { cx: f1(x + side * 9 * s), cy: f1(ly), rx: f1(9 * s), ry: f1(4.5 * s), fill: i % 2 ? P.leaf : P.leafDark, transform: `rotate(${side * -25} ${f1(x + side * 9 * s)} ${f1(ly)})` }));
  }
  for (const [dx, dy] of [[-6, -26], [7, -38], [-4, -48]]) {
    g.append(svg('circle', { cx: f1(x + dx * s), cy: f1(y + dy * s), r: f1(4.2 * s), fill: P.tomato }));
  }
  return g;
}

function sunflower(x: number, y: number, s: number): SVGElement {
  const top = y - 96 * s;
  const g = svg('g', {},
    svg('path', { d: `M${f1(x)},${f1(y)} Q${f1(x + 6 * s)},${f1((y + top) / 2)} ${f1(x)},${f1(top)}`, stroke: P.leafDark, 'stroke-width': 2.4, fill: 'none' }),
  );
  for (const [dy, side] of [[-30, -1], [-52, 1], [-70, -1]] as const) {
    const lx = x + side * 10 * s;
    const ly = y + dy * s;
    g.append(svg('ellipse', { cx: f1(lx), cy: f1(ly), rx: f1(11 * s), ry: f1(5.5 * s), fill: P.leaf, transform: `rotate(${side * -30} ${f1(lx)} ${f1(ly)})` }));
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.append(svg('ellipse', { cx: f1(x + Math.cos(a) * 10 * s), cy: f1(top + Math.sin(a) * 10 * s), rx: f1(5.5 * s), ry: f1(2.4 * s), fill: P.petal, transform: `rotate(${f1((a * 180) / Math.PI)} ${f1(x + Math.cos(a) * 10 * s)} ${f1(top + Math.sin(a) * 10 * s)})` }));
  }
  g.append(svg('circle', { cx: f1(x), cy: f1(top), r: f1(6.5 * s), fill: P.seedHead }));
  return g;
}

type Plant = 'lettuce' | 'carrot' | 'tomato' | 'sunflower';
const DRAW: Record<Plant, (x: number, y: number, s: number) => SVGElement> = { lettuce, carrot, tomato, sunflower };
/** How deep each plant's roots go, as a share of the soil shown. */
const ROOT_DEPTH: Record<Plant, number> = { lettuce: 0.3, carrot: 0.4, tomato: 0.7, sunflower: 0.85 };

/** The garden as an SVG with class "scene". */
export function makeGarden(o: GardenOptions): SVGSVGElement {
  const H = o.h ?? 260;
  const time = o.time ?? 'morning';
  const rng = makeRng(o.seed);
  const gy = H * (o.ground ?? 0.5);
  const soilH = H - gy;
  const id = `g${o.seed}`;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'scene', role: 'img', 'aria-label': 'A vegetable bed in the sun, with the soil cut away beneath it', preserveAspectRatio: o.align ? `${o.align} slice` : 'xMidYMid slice' }) as SVGSVGElement;
  root.append(
    svg('defs', {},
      svg('linearGradient', { id: `${id}-sky`, x1: 0, y1: 0, x2: 0, y2: 1 },
        svg('stop', { offset: 0, 'stop-color': P.skyTop[time] }),
        svg('stop', { offset: 1, 'stop-color': P.skyLow[time] })),
      svg('radialGradient', { id: `${id}-sun` },
        svg('stop', { offset: 0, 'stop-color': '#fff6d8', 'stop-opacity': 0.9 }),
        svg('stop', { offset: 1, 'stop-color': '#fff6d8', 'stop-opacity': 0 })),
      svg('linearGradient', { id: `${id}-soil`, x1: 0, y1: 0, x2: 0, y2: 1 },
        svg('stop', { offset: 0, 'stop-color': P.topsoil }),
        svg('stop', { offset: 1, 'stop-color': P.topsoilLow })),
    ),
    svg('rect', { x: 0, y: 0, width: W, height: gy + 2, fill: `url(#${id}-sky)` }),
  );

  // The sun, low on one side.
  const sx = rng() < 0.5 ? 70 + rng() * 40 : 290 + rng() * 40;
  const sy = gy * (0.22 + rng() * 0.12);
  root.append(
    svg('circle', { cx: f1(sx), cy: f1(sy), r: 46, fill: `url(#${id}-sun)` }),
    svg('circle', { cx: f1(sx), cy: f1(sy), r: 15, fill: P.sun }),
  );

  // Hills, then a hedge with a fence in front.
  root.append(band(gy - 44, gy + 1, P.hillFar, rng, 10), band(gy - 26, gy + 1, P.hillNear, rng, 7));
  const hedge = svg('g', {});
  for (let x = -10; x < W + 20; x += 14 + rng() * 10) {
    const r = 10 + rng() * 9;
    hedge.append(svg('circle', { cx: f1(x), cy: f1(gy - 10 - rng() * 4), r: f1(r), fill: rng() < 0.4 ? P.hedgeDark : P.hedge }));
  }
  hedge.append(svg('rect', { x: 0, y: f1(gy - 12), width: W, height: 13, fill: P.hedge }));
  root.append(hedge);
  const fence = svg('g', { fill: P.fence, opacity: 0.9 });
  for (let x = 6; x < W; x += 16) fence.append(svg('path', { d: `M${x},${f1(gy)} v-20 l3,-4 l3,4 v20 Z` }));
  fence.append(svg('rect', { x: 0, y: f1(gy - 15), width: W, height: 2.2 }), svg('rect', { x: 0, y: f1(gy - 7), width: W, height: 2.2 }));
  root.append(fence);

  // The soil, in layers: dark crumbly topsoil, brown subsoil, then paler, stonier ground.
  const soil = svg('g', {});
  soil.append(
    svg('rect', { x: 0, y: f1(gy), width: W, height: f1(soilH), fill: `url(#${id}-soil)` }),
    band(gy + soilH * 0.5, H, P.subsoil, rng, 4),
    band(gy + soilH * 0.82, H, P.deep, rng, 3),
  );
  // Grains and crumbs: pale specks thick near the top, stones lower down.
  for (let i = 0; i < 220; i++) {
    const y = gy + 4 + Math.pow(rng(), 0.8) * (soilH - 6);
    const x = rng() * W;
    const deep = (y - gy) / soilH;
    soil.append(svg('circle', { cx: f1(x), cy: f1(y), r: f1(0.5 + rng() * (deep > 0.5 ? 1.1 : 0.8)), fill: deep > 0.5 ? '#b89a6c' : P.speck, opacity: f1(0.35 + rng() * 0.4) }));
  }
  for (let i = 0; i < 9; i++) soil.append(stone(rng() * W, gy + soilH * (0.55 + rng() * 0.4), 3 + rng() * 5, rng));
  root.append(soil);

  // The bed: a low mound of mulch along the ground, with the grass at the edges.
  root.append(
    svg('path', { d: `M0,${f1(gy + 2)} L${W},${f1(gy + 2)} L${W},${f1(gy - 3)} L0,${f1(gy - 3)} Z`, fill: P.grass }),
    svg('path', { d: `M30,${f1(gy + 2)} Q60,${f1(gy - 9)} 200,${f1(gy - 9)} Q340,${f1(gy - 9)} 370,${f1(gy + 2)} Z`, fill: P.mulch }),
    svg('path', { d: `M30,${f1(gy + 2)} Q60,${f1(gy - 4)} 200,${f1(gy - 4)} Q340,${f1(gy - 4)} 370,${f1(gy + 2)} Z`, fill: P.bed }),
  );

  // The plants, each with its roots in the cutaway.
  const rows: Plant[] = ['lettuce', 'carrot', 'tomato', 'carrot', 'lettuce', 'sunflower', 'lettuce', 'carrot'];
  const order = rows.map((p, i) => ({ p, k: rng() + (p === 'sunflower' || p === 'tomato' ? i * 0.02 : 0) })).sort((a, b) => a.k - b.k).map((r) => r.p);
  const under = svg('g', {});
  const over = svg('g', {});
  order.forEach((p, i) => {
    const [a, b] = o.span ?? [52, W - 52];
    const x = a + (i * (b - a)) / (order.length - 1) + (rng() - 0.5) * 10;
    const y = gy - 5;
    const s = 0.9 + rng() * 0.25;
    under.append(roots(x, gy, soilH * ROOT_DEPTH[p], rng, p === 'carrot' ? 0.2 : 0.7));
    if (i % 3 === 1) under.append(hyphae(x + 14, gy + soilH * 0.35, rng));
    over.append(DRAW[p](x, y, s));
  });
  root.append(under, over);
  root.append(worm(60 + rng() * (W - 180), gy + soilH * (0.25 + rng() * 0.15), 48, rng));
  return root;
}
