// Clouds as flat, cel-shaded vector: the look of the simplified drawings (the
// genus drawings on the home screen, lesson headers, journal and quizzes, and
// the simplified figures). Every lobe is a ball in three hard-edged tones
// (shade, mid, light), each tone the lobe's own shape moved towards the sun
// and clipped to it, so every lobe gets a crescent of shadow on its far side.
// Lobes are laid lowest first, so each one's shadow falls as a crease on the
// lobe below. Small bumps along the rims give the cauliflower edge. Plain
// shapes only: crisp at any size, and as cheap to animate as any drawing.

import { svg } from '../dom';
import { makeRng } from '../../core/rng';
import type { Palette } from '../scene/landscape';
import { SUN, heap as heapShape, type Cirrus, type Cloud, type Heap, type Layer, type Puff, type Sheet, cellPuffs } from './shapes';

/** The three tones a cloud is drawn in; every scene palette has them. */
export type Tones = Pick<Palette, 'cloudShade' | 'cloudMid' | 'cloudLight'>;

/** Which way the sun is, as a unit vector in the drawing's units (y down). */
export type Light = [x: number, y: number];

/** Sun high and to the right, as in most of the drawings. */
export const UPPER_RIGHT: Light = [0.6, -0.8];

let count = 0;

export function unit(x: number, y: number): Light {
  const n = Math.hypot(x, y) || 1;
  return [x / n, y / n];
}

interface Lobe {
  main: Puff;
  /** Small bumps on its upper rim: the cauliflower. */
  bumps: Puff[];
}

function lobes(puffs: Puff[], seed: number, base?: number): Lobe[] {
  const rng = makeRng(seed);
  return puffs.map((q) => {
    const bumps: Puff[] = [];
    if (q.r >= 5) {
      const n = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (1.15 + (0.7 * (i + 0.2 + rng() * 0.6)) / n);
        const r = q.r * (0.36 + 0.12 * rng());
        const y = q.y + Math.sin(a) * q.r * q.flat * 0.8;
        if (base !== undefined && y > base - r) continue;
        bumps.push({ x: q.x + Math.cos(a) * q.r * 0.8, y, z: q.z, r, flat: q.flat });
      }
    }
    return { main: q, bumps };
  });
}

function disc(q: Puff, dx: number, dy: number, k: number, fill: string): SVGElement {
  return svg('ellipse', { cx: (q.x + dx).toFixed(2), cy: (q.y + dy).toFixed(2), rx: (q.r * k).toFixed(2), ry: (q.r * q.flat * k).toFixed(2), fill });
}

/**
 * A lobe in three tones. Each tone is the lobe's whole shape (ball and bumps)
 * moved towards the sun and shrunk, clipped to the shape itself: what is left
 * of the darker tone underneath is the shadow on the far side.
 */
function lobe(L: Lobe, [lx, ly]: Light, t: Tones): SVGElement {
  const id = `cel${++count}`;
  const all = [L.main, ...L.bumps];
  const tone = (shift: number, k: number, fill: string) => svg('g', {}, ...all.map((q) => disc(q, lx * q.r * shift, ly * q.r * shift, k, fill)));
  return svg('g', { 'clip-path': `url(#${id})` },
    svg('clipPath', { id }, ...all.map((q) => disc(q, 0, 0, 1, '#000'))),
    tone(0, 1, t.cloudShade),
    tone(0.22, 1, t.cloudMid),
    tone(0.45, 0.84, t.cloudLight),
  );
}

export interface HeapOptions {
  light?: Light;
  /** A flat base along this line: nothing is drawn below it, and the bottom is in shade. */
  base?: number;
  /** How far up the shaded base reaches, in the drawing's units. */
  shadow?: number;
  /** Cauliflower bumps on the lobes. */
  bumps?: boolean;
  seed?: number;
}

/**
 * A heap of lobes in flat vector: cumulus, a tower, a row of stratocumulus.
 * Drawn as one body, not a pile of separate balls: the shade is the outline
 * of the whole heap, and only the lit tones are drawn lobe by lobe, so the
 * lobes part along soft creases in the mid tone and the deep shadow stays on
 * the far side and the base.
 */
export function celHeap(puffs: Puff[], t: Tones, o: HeapOptions = {}): SVGElement {
  const [lx, ly] = o.light ?? UPPER_RIGHT;
  const id = `cel${++count}`;
  const ls = (o.bumps === false ? puffs.map((main) => ({ main, bumps: [] })) : lobes(puffs, o.seed ?? count, o.base))
    // Lowest first, so each lobe's crease falls on the one below it.
    .sort((a, b) => b.main.y + b.main.r * b.main.flat - (a.main.y + a.main.r * a.main.flat));
  const all = ls.flatMap((L) => [L.main, ...L.bumps]);
  let x0 = Infinity, x1 = -Infinity, top = Infinity, bottom = -Infinity;
  for (const q of all) {
    x0 = Math.min(x0, q.x - q.r);
    x1 = Math.max(x1, q.x + q.r);
    top = Math.min(top, q.y - q.r * q.flat);
    bottom = Math.max(bottom, q.y + q.r * q.flat);
  }
  const base = o.base ?? bottom;
  const h = base - top;
  // The outline: every lobe, cut along the base. The cut is not a ruler line
  // but a row of shallow scallops, the undersides of the lowest lobes, and
  // its ends curve up into the sides, so the heap does not look sliced off.
  const round = Math.min(h * 0.25, (x1 - x0) * 0.15);
  const n = Math.max(3, Math.round((x1 - x0) / (h * 0.45)));
  const sw = (x1 - x0) / n;
  const dip = Math.min(h * 0.05, sw * 0.18);
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(x0 - 1)},${f(top - 1)} H${f(x1 + 1)} V${f(base - round - dip)} Q${f(x1 + 1)},${f(base - dip)} ${f(x1 + 1 - round)},${f(base - dip)}`;
  for (let i = n - 1; i >= 0; i--) {
    const xa = Math.max(x0 + round, x0 + sw * i);
    if (xa >= x1 - round) continue;
    d += ` Q${f((xa + Math.min(x1 - round, xa + sw)) / 2)},${f(base + dip)} ${f(xa)},${f(base - dip * (i === 0 ? 1 : 0.2))}`;
  }
  d += ` Q${f(x0 - 1)},${f(base - dip)} ${f(x0 - 1)},${f(base - round - dip)} Z`;
  const outline = svg('clipPath', o.base === undefined ? { id: `${id}o` } : { id: `${id}o`, 'clip-path': `url(#${id}b)` },
    ...all.map((q) => disc(q, 0, 0, 1, '#000')));
  const box = svg('clipPath', { id: `${id}b` }, svg('path', { d }));
  const lit = svg('g', {}, ...ls.map((L) => {
    const qs = [L.main, ...L.bumps];
    return svg('g', {},
      ...qs.map((q) => disc(q, lx * q.r * 0.2, ly * q.r * 0.2, 1, t.cloudMid)),
      // The low lobes, in the heap's own shadow, catch no direct light.
      ...qs.filter((q) => q.y < base - h * 0.38).map((q) => disc(q, lx * q.r * 0.48, ly * q.r * 0.48, 0.78, t.cloudLight)));
  }));
  const parts: SVGElement[] = [svg('rect', { x: x0 - 1, y: top - 1, width: x1 - x0 + 2, height: base - top + 2, fill: t.cloudShade }), lit];
  if (o.base !== undefined) {
    // The base in shadow: a gently rolling edge a little way up, with a band
    // of mid tone above it where the light fades into it.
    const y0 = base - (o.shadow ?? h * 0.2) * 0.7;
    const edge = (dy: number, amp: number) => {
      const pts: string[] = [];
      for (let i = 0; i <= 24; i++) {
        const x = x0 + ((x1 - x0) * i) / 24;
        pts.push(`${x.toFixed(1)},${(y0 + dy + Math.sin(i * 0.9 + x0 * 0.1) * amp).toFixed(1)}`);
      }
      return pts.join(' ');
    };
    const band = h * 0.05;
    parts.push(
      svg('polygon', { points: `${edge(-band, h * 0.02)} ${x1},${base + 1} ${x0},${base + 1}`, fill: t.cloudMid }),
      svg('polygon', { points: `${edge(0, h * 0.025)} ${x1},${base + 1} ${x0},${base + 1}`, fill: t.cloudShade }),
    );
  }
  return svg('g', {}, box, outline, svg('g', { 'clip-path': `url(#${id}o)` }, ...parts));
}

/**
 * A cumulus of any shape in flat vector, flat base at `base`: a dome when it
 * is wider than tall, a tower of turrets, each a dome rising out of the one
 * below, when it is taller.
 */
export function celCumulus(cx: number, base: number, width: number, height: number, t: Tones, seed = 1, light: Light = UPPER_RIGHT): SVGElement {
  const rng = makeRng(seed);
  if (height <= width * 0.9) {
    return celHeap(heapShape(cx, base, width, height, seed, false).puffs, t, { base, seed, light });
  }
  // A tower: a column of lobes in pairs, bulging out a little to either side,
  // under a cauliflower crown. One heap, so every lobe's shadow creases the
  // one below it, as on the dome.
  const crownH = width * 0.55;
  const rowH = width * 0.42;
  const rows = Math.max(1, Math.round((height - crownH * 0.6) / rowH));
  const step = (height - crownH * 0.6) / rows;
  const puffs: Puff[] = [];
  for (let k = 0; k < rows; k++) {
    const y = base - (k + 0.55) * step;
    const r = width * (0.33 + 0.05 * rng());
    const side = k & 1 ? 1 : -1;
    puffs.push({ x: cx + side * width * (0.13 + 0.05 * rng()), y, z: 0, r, flat: 1 });
    puffs.push({ x: cx - side * width * (0.11 + 0.05 * rng()), y: y - step * 0.45, z: 0, r: r * 0.92, flat: 1 });
  }
  puffs.push(...heapShape(cx + (rng() - 0.5) * width * 0.1, base - height + crownH, width * 1.05, crownH, seed, false).puffs);
  return celHeap(puffs, t, { base, seed, light, shadow: Math.min(height * 0.12, width * 0.3) });
}

/**
 * An anvil in flat bands: a wedge from tip `x0` to tip `x1`, thickest where
 * the tower feeds it (from `c0` to `c1`), its top along `top`. The underside
 * in shade, a lit body, and a bright sunward upper edge.
 */
export function celAnvil(x0: number, x1: number, c0: number, c1: number, top: number, bottom: number, t: Tones): SVGElement {
  const h = bottom - top;
  const pt = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const at = (k: number) => [pt(c0, top + h * k), pt(x0, top + h * 0.3 * k + h * 0.15), pt(x0 + (c0 - x0) * 0.4, top + h * 0.05), pt(x1, top), pt(c1, top + h * k)].join(' ');
  return svg('g', {},
    svg('polygon', { points: at(1), fill: t.cloudShade }),
    svg('polygon', { points: at(0.65), fill: t.cloudMid }),
    svg('polygon', { points: [pt(c0 - (c0 - x0) * 0.3, top + h * 0.2), pt(x0 + (c0 - x0) * 0.4, top + h * 0.05), pt(x1, top), pt(x1 - (x1 - c1) * 0.25, top + h * 0.12), pt(c1, top + h * 0.3)].join(' '), fill: t.cloudLight }),
  );
}

/** A sheet of cells, such as altocumulus: small flattened lobes with no bumps, each with its own shade. */
export function celCells(puffs: Puff[], t: Tones, light: Light = UPPER_RIGHT): SVGElement {
  const cells = [...puffs].sort((a, b) => a.y - b.y);
  // Cells are lit more from above than from the side.
  const l = unit(light[0] * 0.6, light[1] * 0.6 - 0.5);
  return svg('g', {}, ...cells.map((q) => lobe({ main: q, bumps: [] }, [l[0] * 0.8, l[1] * 0.8], t)));
}

/** Cirrus strands: a broad ribbon in two tones with fine fibres along it. */
export function celCirrus(c: Cirrus, t: Tones, seed = 9): SVGElement {
  const rng = makeRng(seed);
  const g = svg('g', { opacity: 0.9 });
  for (const s of c.strands) {
    const side = (sgn: number, k: number, dy: number) => s.pts.map(([x, y, hw], i) => {
      const [ax, ay] = s.pts[Math.max(0, i - 1)];
      const [bx, by] = s.pts[Math.min(s.pts.length - 1, i + 1)];
      const [tx, ty] = unit(bx - ax, by - ay);
      return `${(x - ty * hw * k * sgn).toFixed(1)},${(y + dy + tx * hw * k * sgn).toFixed(1)}`;
    });
    g.append(
      svg('polygon', { points: [...side(1, 1.5, 0.6), ...side(-1, 1.5, 0.6).reverse()].join(' '), fill: t.cloudMid, opacity: 0.7 }),
      svg('polygon', { points: [...side(1, 1.1, -0.3), ...side(-1, 1.1, -0.3).reverse()].join(' '), fill: t.cloudLight, opacity: 0.85 }),
    );
    for (let f = 0; f < 3; f++) {
      const off = (rng() - 0.5) * 2.4;
      const from = Math.floor(rng() * 4);
      const pts = s.pts.slice(from).map(([x, y]) => `${x.toFixed(1)},${(y + off).toFixed(1)}`);
      g.append(svg('polyline', { points: pts.join(' '), fill: 'none', stroke: t.cloudLight, 'stroke-width': 0.5, 'stroke-linecap': 'round' }));
    }
  }
  return g;
}

/** A sheet in flat bands: a rolling lit top, the body, and a shaded, ragged base. */
export function celSheet(c: Sheet, t: Tones, seed = 5): SVGElement {
  const rng = makeRng(seed);
  const d = c.detail ?? Math.max(2, (c.bottom - c.top) * 0.3);
  const n = Math.max(4, Math.round((c.x1 - c.x0) / (d * 2)));
  const xs = Array.from({ length: n + 1 }, (_, i) => c.x0 + ((c.x1 - c.x0) * i) / n);
  const edge = (y: number, amp: number) => xs.map((x) => [x, y + (rng() - 0.5) * amp] as const);
  const top = edge(c.top, d);
  const lit = edge(c.top + d * 0.9, d * 0.8);
  const shade = edge(c.bottom - d * 0.9, d * 0.8);
  const bot = edge(c.bottom, d * 0.6);
  const poly = (a: readonly (readonly [number, number])[], b: readonly (readonly [number, number])[], fill: string, opacity = 1) =>
    svg('polygon', { points: [...a, ...[...b].reverse()].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), fill, opacity });
  const o = 0.35 + 0.65 * c.density;
  return svg('g', { opacity: o },
    poly(top, bot, t.cloudMid),
    poly(top, lit, t.cloudLight),
    poly(shade, bot, t.cloudShade, 0.6 + 0.4 * c.density),
  );
}

function heap(c: Heap, t: Tones): SVGElement {
  return celHeap(c.puffs, t, { light: unit(SUN[0] - c.cx, SUN[1] - (c.base - c.h / 2)), base: c.base, shadow: c.h * 0.24 });
}

function layer(c: Layer, t: Tones): SVGElement {
  return celCells(c.puffs, t, unit(SUN[0] - (c.x0 + c.x1) / 2, SUN[1] - (c.top + c.bottom) / 2));
}

/** A described sky in flat vector, lit from the scene's sun (the cloud lab's test sky). */
export function flatClouds(clouds: Cloud[], p: Palette): { node: SVGElement; ms: number } {
  const t0 = performance.now();
  const g = svg('g', {}, ...clouds.map((c) => (c.kind === 'heap' ? heap(c, p) : c.kind === 'layer' ? layer(c, p) : c.kind === 'sheet' ? celSheet(c, p) : c.kind === 'cells' ? celCells(cellPuffs(c), p) : celCirrus(c, p))));
  return { node: g, ms: performance.now() - t0 };
}
