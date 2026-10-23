// Option D: flat vector, cel-shaded. Every lobe is a ball in three hard-edged
// tones (shade, mid, light), each tone the lobe's own disc moved
// towards the sun and clipped to it, so every lobe gets a crescent of shadow
// on its far side. Lobes are laid lowest first, so each one's shadow falls as
// a crease on the lobe below. Small bumps along the rims give the cauliflower
// edge without any filter. Plain shapes only: crisp at any size, and as cheap
// to animate as today's drawings.

import { svg } from '../../src/app/dom';
import { makeRng } from '../../src/core/rng';
import type { Palette } from '../../src/app/scene/landscape';
import { SUN, type Cirrus, type Cloud, type Heap, type Layer, type Puff } from './scene';

let count = 0;

function unit(x: number, y: number): [number, number] {
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
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (1.15 + 0.7 * (i + 0.2 + rng() * 0.6) / n);
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
  return svg('ellipse', { cx: q.x + dx, cy: q.y + dy, rx: q.r * k, ry: q.r * q.flat * k, fill });
}

/**
 * A lobe in three tones. Each tone is the lobe's whole shape (ball and bumps)
 * moved towards the sun and shrunk, clipped to the shape itself: what is left
 * of the darker tone underneath is the shadow on the far side.
 */
function lobe(L: Lobe, lx: number, ly: number, p: Palette, defs: SVGElement): SVGElement {
  const id = `flat${++count}`;
  const all = [L.main, ...L.bumps];
  defs.append(svg('clipPath', { id }, ...all.map((q) => disc(q, 0, 0, 1, '#000'))));
  const tone = (shift: number, k: number, fill: string) => svg('g', {}, ...all.map((q) => disc(q, lx * q.r * shift, ly * q.r * shift, k, fill)));
  return svg('g', { 'clip-path': `url(#${id})` },
    tone(0, 1, p.cloudShade),
    tone(0.3, 1, p.cloudMid),
    tone(0.55, 0.8, p.cloudLight),
  );
}

function heap(c: Heap, p: Palette, defs: SVGElement): SVGElement {
  const id = `flat${++count}`;
  const [lx, ly] = unit(SUN[0] - c.cx, SUN[1] - (c.base - c.h / 2));
  const ls = lobes(c.puffs, count, c.base).sort((a, b) => b.main.y + b.main.r - (a.main.y + a.main.r));
  defs.append(svg('clipPath', { id: `${id}b` }, svg('rect', { x: c.cx - c.w, y: c.base - c.h * 2, width: c.w * 2, height: c.h * 2 })));
  defs.append(svg('clipPath', { id: `${id}u` }, ...ls.flatMap((L) => [L.main, ...L.bumps]).map((q) => disc(q, 0, 0, 1, '#000'))));
  // The base in shadow: a wavy hard edge a quarter of the way up.
  const y0 = c.base - c.h * 0.24;
  const pts: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const x = c.cx - c.w * 0.7 + (c.w * 1.4 * i) / 24;
    pts.push(`${x.toFixed(1)},${(y0 + Math.sin(i * 1.7 + c.cx) * c.h * 0.04 + (x - c.cx) * ly * 0.06).toFixed(1)}`);
  }
  const shadow = svg('polygon', { points: `${pts.join(' ')} ${c.cx + c.w},${c.base + 2} ${c.cx - c.w},${c.base + 2}`, fill: p.cloudShade, opacity: 0.55 });
  return svg('g', { 'clip-path': `url(#${id}b)` },
    ...ls.map((L) => lobe(L, lx, ly, p, defs)),
    svg('g', { 'clip-path': `url(#${id}u)` }, shadow),
  );
}

function layer(c: Layer, p: Palette, defs: SVGElement): SVGElement {
  const [lx, ly] = unit(SUN[0] - (c.x0 + c.x1) / 2, SUN[1] - (c.top + c.bottom) / 2);
  const cells = [...c.puffs].sort((a, b) => a.y - b.y);
  return svg('g', {}, ...cells.map((q) => lobe({ main: q, bumps: [] }, lx * 0.6, ly * 0.6 + 0.3, p, defs)));
}

function cirrus(c: Cirrus, p: Palette): SVGElement {
  const rng = makeRng(9);
  const g = svg('g', { opacity: 0.9 });
  for (const s of c.strands) {
    // The strand as a filled outline, then fine fibres along it.
    const side = (sgn: number, k: number, dy: number) => s.pts.map(([x, y, hw], i) => {
      const [ax, ay] = s.pts[Math.max(0, i - 1)];
      const [bx, by] = s.pts[Math.min(s.pts.length - 1, i + 1)];
      const [tx, ty] = unit(bx - ax, by - ay);
      return `${(x - ty * hw * k * sgn).toFixed(1)},${(y + dy + tx * hw * k * sgn).toFixed(1)}`;
    });
    g.append(
      svg('polygon', { points: [...side(1, 1.5, 0.6), ...side(-1, 1.5, 0.6).reverse()].join(' '), fill: p.cloudMid, opacity: 0.7 }),
      svg('polygon', { points: [...side(1, 1.1, -0.3), ...side(-1, 1.1, -0.3).reverse()].join(' '), fill: p.cloudLight, opacity: 0.85 }),
    );
    for (let f = 0; f < 3; f++) {
      const off = (rng() - 0.5) * 2.4;
      const from = Math.floor(rng() * 4);
      const pts = s.pts.slice(from).map(([x, y]) => `${x.toFixed(1)},${(y + off).toFixed(1)}`);
      g.append(svg('polyline', { points: pts.join(' '), fill: 'none', stroke: p.cloudLight, 'stroke-width': 0.5, 'stroke-linecap': 'round' }));
    }
  }
  return g;
}

/** The clouds as SVG to lay over a scene's sky. */
export function flatClouds(clouds: Cloud[], p: Palette): { node: SVGElement; ms: number } {
  const t0 = performance.now();
  const defs = svg('defs');
  const g = svg('g', {}, defs);
  for (const c of clouds) g.append(c.kind === 'heap' ? heap(c, p, defs) : c.kind === 'layer' ? layer(c, p, defs) : cirrus(c, p));
  return { node: g, ms: performance.now() - t0 };
}
