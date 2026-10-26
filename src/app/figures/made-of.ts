// Lesson 1, what soil is made of: a handful by volume, the three grain sizes
// side by side, the surface a rock gains as it is cut, texture by feel, the
// jar test, and the texture triangle read from a jar.

import { el, svg } from 'lesson-kit/dom';
import { label, note, redraw, small, still } from 'lesson-kit/draw';
import { makeRng } from 'lesson-kit/rng';
import { feelOf, HANDFUL, IN_THE_BED, mixOf, PARTICLES, SETTLED_BY, textureOf, TEXTURES, type Mix, type Particle, type Texture } from '../../core/soil';
import { drawJar, layerTops, type JarBox } from '../scene/jar';
import { COL, figure, frame, slider, tint } from './kit';

const f1 = (n: number) => n.toFixed(1);

// ---- A handful, by volume -----------------------------------------------------

/** A close look at a crumb of loam on the left, and the same handful as one bar on the right. */
export function handfulDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 210;
  const s = still(W, H);
  const rng = makeRng(4);
  const cx = 104;
  const cy = 105;
  const R = 88;
  const clip = svg('clipPath', { id: 'handful-clip' }, svg('circle', { cx, cy, r: R }));
  const inside = svg('g', { 'clip-path': 'url(#handful-clip)' }, svg('rect', { x: cx - R, y: cy - R, width: 2 * R, height: 2 * R, fill: COL.airPale }));
  // Grains on a jittered grid, each wrapped in a film of water, a few dark bits of organic matter between.
  for (let y = cy - R + 8; y < cy + R; y += 25) {
    for (let x = cx - R + 8 + ((y / 25) % 2) * 12; x < cx + R; x += 25) {
      const gx = x + (rng() - 0.5) * 8;
      const gy = y + (rng() - 0.5) * 8;
      const r = 9 + rng() * 3.5;
      inside.append(svg('circle', { cx: f1(gx), cy: f1(gy), r: f1(r + 3.4), fill: tint(COL.water, 0.55) }));
      const n = 7;
      const pts = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rng();
        const rr = r * (0.8 + rng() * 0.3);
        return `${f1(gx + Math.cos(a) * rr)},${f1(gy + Math.sin(a) * rr)}`;
      }).join(' ');
      inside.append(svg('polygon', { points: pts, fill: COL.mineral, stroke: '#7d6040', 'stroke-width': 0.7, 'stroke-linejoin': 'round' }));
      if (rng() < 0.12) inside.append(svg('ellipse', { cx: f1(gx + 12), cy: f1(gy + 11), rx: 5, ry: 2.6, fill: COL.organic, transform: `rotate(${f1(rng() * 180)} ${f1(gx + 12)} ${f1(gy + 11)})` }));
    }
  }
  s.svg.append(svg('defs', {}, clip), svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), inside, svg('circle', { cx, cy, r: R, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }));
  s.svg.append(small(cx, cy + R + 14, 'a crumb, magnified', { anchor: 'middle', soft: true }));

  // The bar: one handful split by volume.
  const bx = 250;
  const bw = 46;
  const top = 14;
  const bh = 180;
  const colours = { minerals: COL.mineral, 'organic matter': COL.organic, water: COL.water, air: COL.air } as const;
  let y = top;
  for (const { part, share } of HANDFUL) {
    const h = (bh * share) / 100;
    s.svg.append(svg('rect', { x: bx, y: f1(y), width: bw, height: f1(h), fill: colours[part] }));
    s.svg.append(label(bx + bw + 8, y + h / 2 + 4, `${part} ${share}%`, { fill: part === 'air' ? '#3f7f97' : colours[part], bold: true }));
    y += h;
  }
  s.svg.append(svg('rect', { x: bx, y: top, width: bw, height: bh, fill: 'none', stroke: COL.ink, 'stroke-width': 1.5 }));
  // Braces for the two halves.
  const brace = (y0: number, y1: number, text: string) => {
    const x = bx - 8;
    s.svg.append(
      svg('path', { d: `M${x},${y0 + 2} q-5,0 -5,5 v${f1((y1 - y0) / 2 - 9)} l-4,4 l4,4 v${f1((y1 - y0) / 2 - 9)} q0,5 5,5`, fill: 'none', stroke: COL.soft, 'stroke-width': 1.2 }),
      note(x - 14, (y0 + y1) / 2 + 3, text, { anchor: 'end', soft: true }),
    );
  };
  brace(top, top + bh / 2, 'solid');
  brace(top + bh / 2, top + bh, 'pores');
  return { node: s.node };
}

// ---- The three sizes ----------------------------------------------------------

/**
 * A clay plate the size of a pea (7 mm), a silt grain at the same scale (the
 * size of a grapefruit), and a grain of medium sand (a boulder taller than a
 * person, only its edge in the frame): sizes 1, 20 and 500.
 */
export function sizesDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 190;
  const s = still(W, H);
  const base = 150;
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), svg('line', { x1: 0, y1: base, x2: W, y2: base, stroke: COL.grid, 'stroke-width': 1.5 }));
  // Clay: a tiny flat plate.
  const clayX = 44;
  s.svg.append(
    svg('ellipse', { cx: clayX, cy: base - 1.2, rx: 3.5, ry: 1.2, fill: COL.clay }),
    label(clayX, base + 18, 'clay', { anchor: 'middle', bold: true, fill: COL.clay }),
    small(clayX, base + 30, 'a pea', { anchor: 'middle', soft: true }),
  );
  // Silt: twenty times as wide.
  const siltX = 130;
  const siltR = 35;
  s.svg.append(
    svg('circle', { cx: siltX, cy: base - siltR, r: siltR, fill: COL.silt }),
    svg('ellipse', { cx: siltX - 11, cy: base - siltR - 12, rx: 10, ry: 6, fill: '#fff', opacity: 0.2 }),
    label(siltX, base + 18, 'silt', { anchor: 'middle', bold: true, fill: COL.silt }),
    small(siltX, base + 30, 'a grapefruit', { anchor: 'middle', soft: true }),
  );
  // Sand: five hundred times the clay. Only the left side of it fits in the
  // frame, rising out of the ground and curving away up and out of the top.
  const sandR = 875;
  const sandX = 230 + sandR;
  const sandY = base + 300;
  s.svg.append(
    svg('defs', {}, svg('clipPath', { id: 'sizes-ground' }, svg('rect', { x: 0, y: 0, width: W, height: base }))),
    svg('circle', { cx: sandX, cy: sandY, r: sandR, fill: COL.sand, 'clip-path': 'url(#sizes-ground)' }),
    label(318, base + 18, 'sand', { anchor: 'middle', bold: true, fill: COL.sand }),
    small(318, base + 30, 'a boulder taller than a house', { anchor: 'middle', soft: true }),
    small(350, 96, 'its curve runs on', { anchor: 'middle', fill: '#fff' }),
    small(350, 108, 'out of the picture', { anchor: 'middle', fill: '#fff' }),
  );
  return { node: s.node };
}

// ---- The jar test -------------------------------------------------------------

/** The same jar of loam at the three times a gardener marks it: sand down, silt down, clay down. */
const JAR_TIMES: { t: number; when: string; down: string }[] = [
  { t: SETTLED_BY.sand, when: 'after 1 minute', down: 'sand is down' },
  { t: SETTLED_BY.silt, when: 'after 6 hours', down: 'silt is down' },
  { t: SETTLED_BY.clay, when: 'after 2 days', down: 'clay is down' },
];

/** Three jars of one loam, at one minute, six hours and two days, each with a pencil mark at the top of what has settled. */
export function jarDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 230;
  const s = still(W, H);
  const mix = mixOf(40, 20);
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }));
  JAR_TIMES.forEach(({ t, when, down }, i) => {
    const box: JarBox = { x: 22 + i * 130, y: 14, w: 86, h: 170 };
    s.svg.append(drawJar(box, mix, t));
    const tops = layerTops(box, mix, t);
    for (const p of PARTICLES) {
      if (t < SETTLED_BY[p]) continue;
      const y = tops[p];
      s.svg.append(svg('line', { x1: box.x + box.w - 2, y1: f1(y), x2: box.x + box.w + 9, y2: f1(y), stroke: COL[p], 'stroke-width': 2 }));
    }
    s.svg.append(
      label(box.x + box.w / 2, box.y + box.h + 18, when, { anchor: 'middle', bold: true }),
      small(box.x + box.w / 2, box.y + box.h + 31, down, { anchor: 'middle', fill: COL[PARTICLES[i]], bold: true }),
    );
  });
  return { node: s.node };
}

// ---- The texture triangle -----------------------------------------------------

/** A pale fill for each class, by its group: golds for the sandy ones, greens for loams, terracottas for the clays. */
const FILL: Record<Texture, string> = {
  'sand': '#f3e1b2',
  'loamy sand': '#efd9a0',
  'sandy loam': '#ead08f',
  'loam': '#d9e5b9',
  'silt loam': '#cfdfae',
  'silt': '#e1e8c8',
  'sandy clay loam': '#f1d2b4',
  'clay loam': '#ecc6a7',
  'silty clay loam': '#e9cfb9',
  'sandy clay': '#e6b897',
  'silty clay': '#e3c1a8',
  'clay': '#dca988',
};

/**
 * Each class's region on the triangle, as corners given by (sand, clay): the
 * boundaries textureOf in core/soil.ts tests, drawn as polygons.
 */
export const REGIONS: Record<Texture, [number, number][]> = {
  'sand': [[100, 0], [85, 0], [90, 10]],
  'loamy sand': [[90, 10], [85, 0], [70, 0], [85, 15]],
  'sandy loam': [[85, 15], [70, 0], [50, 0], [43, 7], [52, 7], [52, 20], [80, 20]],
  'loam': [[43, 7], [52, 7], [52, 20], [45, 27], [23, 27]],
  'silt loam': [[50, 0], [20, 0], [8, 12], [0, 12], [0, 27], [23, 27], [43, 7]],
  'silt': [[20, 0], [0, 0], [0, 12], [8, 12]],
  'sandy clay loam': [[80, 20], [52, 20], [45, 27], [45, 35], [65, 35]],
  'clay loam': [[45, 27], [20, 27], [20, 40], [45, 40]],
  'silty clay loam': [[20, 27], [0, 27], [0, 40], [20, 40]],
  'sandy clay': [[65, 35], [45, 35], [45, 55]],
  'silty clay': [[20, 40], [0, 40], [0, 60]],
  'clay': [[45, 40], [20, 40], [0, 60], [0, 100], [45, 55]],
};

/** Where each class's name sits, as a mix; read off the USDA triangle. */
const NAME_AT: Record<Texture, [number, number, string?]> = {
  'sand': [92, 2],
  'loamy sand': [82, 5, 'loamy\nsand'],
  'sandy loam': [65, 10, 'sandy\nloam'],
  'loam': [41, 18],
  'silt loam': [20, 14, 'silt loam'],
  'silt': [7, 5],
  'sandy clay loam': [60, 27, 'sandy clay\nloam'],
  'clay loam': [33, 33, 'clay\nloam'],
  'silty clay loam': [10, 33, 'silty clay\nloam'],
  'sandy clay': [52, 42, 'sandy\nclay'],
  'silty clay': [7, 47, 'silty\nclay'],
  'clay': [22, 60],
};

/** A mix from the heights of the three layers in a settled jar, in whole percent. */
export function mixFromLayers(sand: number, silt: number, clay: number): Mix | null {
  const total = sand + silt + clay;
  if (total <= 0) return null;
  return mixOf(Math.round((100 * sand) / total), Math.round((100 * clay) / total));
}

/**
 * The texture triangle read from a jar: set the three layers as a ruler on
 * the jar would find them, and the mix lands on the triangle with its name.
 */
export const triangleFigure = figure(['loam', 'clay', 'sand'], (_ctx, t) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 3);
  // Sand 100% at the bottom left, silt at the bottom right, clay at the top.
  const L = 270;
  const x0 = 116;
  const yb = 262;
  const hgt = (L * Math.sqrt(3)) / 2;
  const at = (sand: number, clay: number): [number, number] => {
    const silt = 100 - sand - clay;
    return [x0 + (silt * L + clay * (L / 2)) / 100, yb - (clay * hgt) / 100];
  };
  const regions = svg('g', {}, ...TEXTURES.map((c) => svg('polygon', {
    points: REGIONS[c].map(([sd, cl]) => at(sd, cl).map(f1).join(',')).join(' '),
    fill: FILL[c],
    stroke: '#fff',
    'stroke-width': 0.8,
    'stroke-linejoin': 'round',
  })));
  const names = svg('g', {}, ...TEXTURES.map((c) => {
    const [s, cl, text] = NAME_AT[c];
    const [x, y] = at(s, cl);
    const lines = (text ?? c).split('\n');
    return svg('g', {}, ...lines.map((ln, i) => small(x, y + i * 10 - (lines.length - 1) * 5 + 3, ln, { anchor: 'middle', soft: true })));
  }));
  const [ax, ay] = at(100, 0);
  const [bx, by] = at(0, 0);
  const [cx, cy] = at(0, 100);
  const outline = svg('polygon', { points: `${ax},${ay} ${bx},${by} ${f1(cx)},${f1(cy)}`, fill: 'none', stroke: COL.ink, 'stroke-width': 1.6, 'stroke-linejoin': 'round' });
  // Ticks every 20 on each side, and what each side measures.
  const ticks = svg('g', {});
  for (let v = 20; v < 100; v += 20) {
    const [sx, sy] = at(v, 0);
    ticks.append(small(sx, sy + 12, String(v), { anchor: 'middle', soft: true }));
    const [lx, ly] = at(100 - v, v);
    ticks.append(small(lx - 5, ly + 3, String(v), { anchor: 'end', soft: true }));
    const [rx, ry] = at(0, 100 - v);
    ticks.append(small(rx + 5, ry + 3, String(v), { soft: true }));
  }
  ticks.append(
    note(x0 + L / 2, yb + 26, '← more sand', { anchor: 'middle', fill: COL.sand, bold: true }),
    note(x0 + L / 2 - 12, yb - hgt - 4, 'more clay ↑', { anchor: 'end', fill: COL.clay, bold: true }),
    note(x0 + L * 0.8 + 8, yb - hgt * 0.62, 'more silt ↘', { fill: COL.silt, bold: true }),
  );
  const jar = svg('g');
  const dot = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), regions, outline, names, ticks, jar, dot);

  // The jar, drawn at 1.6 drawing units to the millimetre, with a ruler up its side.
  const box = { x: 14, y: 66, w: 62, h: 214 };
  const MM = 1.6;
  const layers = { sand: 28, silt: 6, clay: 6 };
  const paint = () => {
    const floor = box.y + box.h - 4;
    const shapes: SVGElement[] = [svg('rect', { x: box.x + 3, y: box.y + 12, width: box.w - 6, height: floor - box.y - 12, fill: COL.waterPale })];
    let top = floor;
    for (const p of PARTICLES) {
      const h = layers[p] * MM;
      top -= h;
      shapes.push(svg('rect', { x: box.x + 3, y: f1(top), width: box.w - 6, height: f1(h), fill: COL[p] }));
      if (h > 0) shapes.push(svg('line', { x1: box.x + box.w - 2, y1: f1(top), x2: box.x + box.w + 8, y2: f1(top), stroke: COL[p], 'stroke-width': 2 }));
    }
    for (let mm = 0; mm <= 120; mm += 10) {
      const y = floor - mm * MM;
      shapes.push(svg('line', { x1: box.x - 4, y1: f1(y), x2: box.x + (mm % 50 ? 2 : 6), y2: f1(y), stroke: COL.soft, 'stroke-width': 0.8 }));
    }
    shapes.push(
      svg('rect', { x: box.x + 5, y: box.y - 2, width: box.w - 10, height: 9, rx: 2, fill: '#8a8f7a' }),
      svg('path', { d: `M${box.x + 1},${box.y + 8} V${box.y + box.h - 7} Q${box.x + 1},${box.y + box.h} ${box.x + 8},${box.y + box.h} H${box.x + box.w - 8} Q${box.x + box.w - 1},${box.y + box.h} ${box.x + box.w - 1},${box.y + box.h - 7} V${box.y + 8}`, fill: 'none', stroke: COL.ink, 'stroke-width': 2, 'stroke-linejoin': 'round' }),
      small(box.x + box.w / 2, box.y - 10, 'your jar', { anchor: 'middle', bold: true }),
    );
    redraw(jar, ...shapes);
    const mix = mixFromLayers(layers.sand, layers.silt, layers.clay);
    if (!mix) {
      redraw(dot);
      f.readout.textContent = 'Set the height of each layer in the jar.';
      return;
    }
    const texture = textureOf(mix);
    const [x, y] = at(mix.sand, mix.clay);
    redraw(dot,
      svg('circle', { cx: f1(x), cy: f1(y), r: 7, fill: COL.ink, opacity: 0.15 }),
      svg('circle', { cx: f1(x), cy: f1(y), r: 4.5, fill: COL.ink, stroke: '#fff', 'stroke-width': 1.5 }),
    );
    f.readout.textContent = `Sand ${mix.sand}%, silt ${mix.silt}%, clay ${mix.clay}%: a ${texture}. ${IN_THE_BED[feelOf(texture)]}`;
    if (t.goal === texture) t.done();
  };
  const layer = (p: Particle) => slider(`${p[0].toUpperCase()}${p.slice(1)} layer`, 0, 40, 1, layers[p], (v) => `${v} mm`, (v) => { layers[p] = v; paint(); }, p);
  f.controls.append(...PARTICLES.map((p) => layer(p).node));
  paint();
  return f.node;
});

// ---- Surface ------------------------------------------------------------------

/** One cubic centimetre of rock cut into grains of each width (mm), and its total surface (6 cm² over the width in cm). */
const CUTS: { mm: number; name: string; colour: string; like: string }[] = [
  { mm: 10, name: 'one cube, 1 cm', colour: COL.mineral, like: 'a postage stamp' },
  { mm: 1, name: 'coarse sand, 1 mm', colour: COL.sand, like: 'a playing card' },
  { mm: 0.01, name: 'silt, 0.01 mm', colour: COL.silt, like: 'a doormat' },
  { mm: 0.001, name: 'clay, 0.001 mm', colour: COL.clay, like: 'a big rug' },
];

/** A surface in square centimetres, said simply. */
function sayArea(cm2: number): string {
  return cm2 >= 1000 ? `${+(cm2 / 10000).toPrecision(2)} m²` : `${Math.round(cm2)} cm²`;
}

/**
 * The surface of a sugar cube's worth (1 cm³) of rock, cut into grains of
 * sand, silt and clay, drawn as squares to scale: each tenfold cut makes ten
 * times the surface, so clay's square dwarfs the rest.
 */
export function surfaceDiagram(): { node: HTMLElement } {
  const W = 400;
  const H = 220;
  const s = still(W, H);
  s.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }));
  // Squares share their bottom left corner; clay's is 196 units on a side.
  const x0 = 12;
  const yb = 208;
  const k = 196 / Math.sqrt(6 / 0.0001);
  for (const c of [...CUTS].reverse()) {
    const side = Math.max(2, k * Math.sqrt(6 / (c.mm / 10)));
    s.svg.append(svg('rect', { x: x0, y: f1(yb - side), width: f1(side), height: f1(side), fill: tint(c.colour, 0.3), stroke: c.colour, 'stroke-width': 1.2 }));
  }
  // A row of words for each, with a leader to its square's top right corner.
  CUTS.forEach((c, i) => {
    const cm2 = 6 / (c.mm / 10);
    const side = Math.max(2, k * Math.sqrt(cm2));
    const y = 160 - i * 44;
    const tx = 236;
    s.svg.append(
      svg('path', { d: `M${f1(x0 + side)},${f1(yb - side)} L${tx - 8},${y - 4}`, stroke: c.colour, 'stroke-width': 0.8, fill: 'none' }),
      label(tx, y - 4, c.name, { bold: true, fill: c.colour }),
      small(tx, y + 10, `${sayArea(cm2)}, about ${c.like}`, { soft: true }),
    );
  });
  return { node: s.node };
}

// ---- Texture by feel ----------------------------------------------------------

/** The texture by feel key (after Thien, 1979): a few questions about a wet ball of soil. */
interface FeelStep {
  ask: string;
  answers: { say: string; next: string | Texture }[];
}

const FEEL: Record<string, FeelStep> = {
  ball: { ask: 'Wet a walnut-sized lump and squeeze it. Does it stay in a ball?', answers: [
    { say: 'No, it falls apart', next: 'sand' },
    { say: 'Yes', next: 'ribbon' },
  ] },
  ribbon: { ask: 'Push it out between thumb and finger into a flat ribbon. Does a ribbon form?', answers: [
    { say: 'No', next: 'loamy sand' },
    { say: 'Yes', next: 'length' },
  ] },
  length: { ask: 'How long does the ribbon get before it breaks?', answers: [
    { say: 'Under 2.5 cm (1 in)', next: 'weak' },
    { say: '2.5 to 5 cm', next: 'medium' },
    { say: 'Over 5 cm (2 in)', next: 'strong' },
  ] },
  weak: { ask: 'Rub a wet pinch in your palm. How does it feel?', answers: [
    { say: 'Very gritty', next: 'sandy loam' },
    { say: 'Very smooth', next: 'silt loam' },
    { say: 'Neither', next: 'loam' },
  ] },
  medium: { ask: 'Rub a wet pinch in your palm. How does it feel?', answers: [
    { say: 'Very gritty', next: 'sandy clay loam' },
    { say: 'Very smooth', next: 'silty clay loam' },
    { say: 'Neither', next: 'clay loam' },
  ] },
  strong: { ask: 'Rub a wet pinch in your palm. How does it feel?', answers: [
    { say: 'Very gritty', next: 'sandy clay' },
    { say: 'Very smooth', next: 'silty clay' },
    { say: 'Neither', next: 'clay' },
  ] },
};

const isTexture = (s: string): s is Texture => (TEXTURES as readonly string[]).includes(s);

/** The texture triangle drawn small, with one class picked out. */
function miniTriangle(g: SVGElement, pick: Texture | null): void {
  const L = 170;
  const x0 = 210;
  const yb = 190;
  const hgt = (L * Math.sqrt(3)) / 2;
  const at = (sand: number, clay: number): string => {
    const silt = 100 - sand - clay;
    return `${f1(x0 + (silt * L + clay * (L / 2)) / 100)},${f1(yb - (clay * hgt) / 100)}`;
  };
  redraw(g, ...TEXTURES.map((c) => svg('polygon', {
    points: REGIONS[c].map(([s, cl]) => at(s, cl)).join(' '),
    fill: c === pick ? COL.ink : FILL[c],
    stroke: '#fff',
    'stroke-width': 0.8,
  })), small(x0, yb + 14, 'sand', { fill: COL.sand, bold: true }), small(x0 + L, yb + 14, 'silt', { anchor: 'end', fill: COL.silt, bold: true }), small(x0 + L / 2, yb - hgt - 6, 'clay', { anchor: 'middle', fill: COL.clay, bold: true }));
}

export const feelFigure = figure(['name'], (_ctx, t) => {
  const W = 400;
  const H = 210;
  const f = frame(W, H, 3);
  const tri = svg('g');
  const hand = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), hand, tri);
  const row = el('div.chips');
  const again = el('button.btn.btn-small.btn-ghost', { type: 'button' }, 'Start again') as HTMLButtonElement;
  f.controls.append(row, again);

  /** The lump on a ruler: a ball, crumbs if it fell apart, or a ribbon pushed out to `ribbon` (0 to 3: none, short, medium, long). */
  const drawHand = (ribbon: number, ball: boolean) => {
    const x0 = 24;
    const y = 120;
    const cm = 26;
    const parts: SVGElement[] = [svg('rect', { x: x0, y: y + 14, width: cm * 6.5, height: 18, rx: 2, fill: '#efe2c0', stroke: COL.soft })];
    for (let i = 0; i <= 6; i++) {
      parts.push(svg('line', { x1: x0 + 6 + i * cm, y1: y + 14, x2: x0 + 6 + i * cm, y2: y + 22, stroke: COL.soft }));
      parts.push(small(x0 + 6 + i * cm, y + 30, String(i), { anchor: 'middle', soft: true }));
    }
    parts.push(small(x0 + cm * 6.5, y + 44, 'cm', { anchor: 'end', soft: true }));
    if (!ball && ribbon === 0) {
      for (let i = 0; i < 12; i++) parts.push(svg('circle', { cx: x0 + 14 + (i % 6) * 9, cy: y + 4 - Math.floor(i / 6) * 7, r: 3.5, fill: COL.sand }));
    } else if (ribbon === 0) {
      parts.push(svg('circle', { cx: x0 + 26, cy: y - 8, r: 20, fill: COL.soil }));
    } else {
      const len = [0, 1.8, 3.8, 6][ribbon] * cm;
      parts.push(svg('circle', { cx: x0 + 14, cy: y - 6, r: 14, fill: COL.soil }));
      parts.push(svg('path', { d: `M${x0 + 20},${y - 2} h${f1(len)} l-2,8 h${f1(-len + 2)} z`, fill: COL.soil }));
      parts.push(small(x0 + 26 + len / 2, y - 16, ['', 'weak ribbon', 'medium ribbon', 'strong ribbon'][ribbon], { anchor: 'middle', soft: true }));
    }
    redraw(hand, ...parts);
  };

  const go = (at: string) => {
    if (isTexture(at)) {
      miniTriangle(tri, at);
      f.readout.textContent = `It is a ${at}. ${IN_THE_BED[feelOf(at)]} A jar test will tell you the mix more exactly.`;
      row.replaceChildren();
      if (t.goal === 'name') t.done();
      return;
    }
    const step = FEEL[at];
    f.readout.textContent = step.ask;
    drawHand(at === 'ball' ? 0 : at === 'ribbon' ? 0 : at === 'length' ? 1 : at === 'weak' ? 1 : at === 'medium' ? 2 : 3, at !== 'ball');
    row.replaceChildren(...step.answers.map((a) => el('button.chip', { type: 'button', onclick: () => {
      if (a.next === 'sand') drawHand(0, false);
      go(a.next);
    } }, a.say)));
  };
  again.addEventListener('click', () => {
    miniTriangle(tri, null);
    go('ball');
  });
  miniTriangle(tri, null);
  go('ball');
  return f.node;
});
