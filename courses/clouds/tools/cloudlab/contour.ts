// Option E: flat vector traced from the painted light. The canvas painter's
// density and brightness (option B) are sampled on a grid, smoothed, cut into
// five tone bands, and each band traced into SVG paths (marching squares).
// The result is posterised vector art whose shapes come from real light: the
// shadows fall where cloud blocks the sun, not where a rule puts them. The
// tracing costs time once per figure; what ships to the page is plain paths.

import { svg } from 'didactics/dom';
import type { Palette } from '../../src/app/scene/landscape';
import { fieldOf } from '../../src/app/clouds/paint';
import { grade, rampOf, type RGB } from '../../src/app/clouds/ramp';
import type { Cloud } from '../../src/app/clouds/shapes';

/** Brightness cut points: everything at or above each is drawn in that band's tone. */
const BANDS = [0, 0.34, 0.5, 0.64, 0.78, 0.9];
const EDGE = 0.3;

// Segments for each marching-squares case, as pairs of edges: 0 top, 1 right,
// 2 bottom, 3 left. Corners: 8 top left, 4 top right, 2 bottom right, 1 bottom left.
const CASES: number[][] = [
  [], [3, 2], [2, 1], [3, 1], [0, 1], [3, 0, 2, 1], [0, 2], [3, 0],
  [3, 0], [0, 2], [3, 2, 0, 1], [0, 1], [3, 1], [2, 1], [3, 2], [],
];

/** Closed outlines of where `v` >= 0 on a grid of nx x ny points, as one SVG path. */
function trace(v: Float32Array, nx: number, ny: number, x0: number, y0: number, res: number): string {
  const pt = new Map<number, [number, number]>();
  const link = new Map<number, number[]>();
  const at = (i: number, j: number) => v[j * nx + i];
  // Each edge gets a key and the point where the field crosses zero on it.
  const edge = (i: number, j: number, e: number): number => {
    let key: number, a: [number, number], b: [number, number];
    if (e === 0) { key = (j * nx + i) * 2; a = [i, j]; b = [i + 1, j]; }
    else if (e === 2) { key = ((j + 1) * nx + i) * 2; a = [i, j + 1]; b = [i + 1, j + 1]; }
    else if (e === 3) { key = (j * nx + i) * 2 + 1; a = [i, j]; b = [i, j + 1]; }
    else { key = (j * nx + i + 1) * 2 + 1; a = [i + 1, j]; b = [i + 1, j + 1]; }
    if (!pt.has(key)) {
      const va = at(a[0], a[1]), vb = at(b[0], b[1]);
      const t = va / (va - vb);
      pt.set(key, [x0 + (a[0] + (b[0] - a[0]) * t) * res, y0 + (a[1] + (b[1] - a[1]) * t) * res]);
    }
    return key;
  };
  const join = (a: number, b: number) => {
    (link.get(a) ?? link.set(a, []).get(a)!).push(b);
    (link.get(b) ?? link.set(b, []).get(b)!).push(a);
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const c = (at(i, j) >= 0 ? 8 : 0) | (at(i + 1, j) >= 0 ? 4 : 0) | (at(i + 1, j + 1) >= 0 ? 2 : 0) | (at(i, j + 1) >= 0 ? 1 : 0);
      const segs = CASES[c];
      for (let k = 0; k < segs.length; k += 2) join(edge(i, j, segs[k]), edge(i, j, segs[k + 1]));
    }
  }
  // Walk the links into loops; drop specks.
  const seen = new Set<number>();
  let d = '';
  for (const start of link.keys()) {
    if (seen.has(start)) continue;
    const loop: [number, number][] = [];
    let prev = -1, cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      loop.push(pt.get(cur)!);
      const next = link.get(cur)!.find((n) => n !== prev && !seen.has(n));
      if (next === undefined) break;
      prev = cur;
      cur = next;
    }
    let area = 0;
    for (let k = 0; k < loop.length; k++) {
      const [ax, ay] = loop[k], [bx, by] = loop[(k + 1) % loop.length];
      area += ax * by - bx * ay;
    }
    if (Math.abs(area) / 2 < 1.5) continue;
    d += `M${loop.filter((_, k) => k % 2 === 0).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;
  }
  return d;
}

/** Box blur, in place, `r` cells each way. */
function blur(v: Float32Array, nx: number, ny: number, r: number): void {
  const tmp = new Float32Array(v.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) {
        const ii = pass === 0 ? i + k : i, jj = pass === 0 ? j : j + k;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        s += v[jj * nx + ii]; n++;
      }
      tmp[j * nx + i] = s / n;
    }
    v.set(tmp);
  }
}

/** The clouds as SVG to lay over a scene's sky, and how long they took to trace. */
export function contourClouds(clouds: Cloud[], p: Palette, res = 0.5): { node: SVGElement; ms: number } {
  const t0 = performance.now();
  const ramp = rampOf(p);
  const g = svg('g');
  const c: RGB = [0, 0, 0];
  for (const cloud of clouds) {
    const f = fieldOf(cloud, p);
    const [bx0, by0, bx1, by1] = f.box;
    const nx = Math.ceil((bx1 - bx0) / res) + 3;
    const ny = Math.ceil((by1 - by0) / res) + 3;
    const x0 = bx0 - res, y0 = by0 - res;
    const dens = new Float32Array(nx * ny);
    const light = new Float32Array(nx * ny);
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const x = x0 + i * res, y = y0 + j * res;
      const d = f.density(x, y);
      dens[j * nx + i] = d;
      light[j * nx + i] = d > 0.02 ? f.light(x, y, d) : 0;
    }
    // Bands are broad, flat shapes: smooth the light so they don't follow every speck.
    blur(light, nx, ny, Math.round(1.2 / res));
    blur(dens, nx, ny, 1);
    const cirrus = cloud.kind === 'cirrus';
    const bands = cirrus ? [0, 0.88] : BANDS;
    const field = new Float32Array(nx * ny);
    const layer = svg('g', { opacity: cirrus ? 0.85 : 1 });
    bands.forEach((cut, k) => {
      const edge = cirrus ? 0.12 : EDGE;
      for (let n = 0; n < field.length; n++) field[n] = Math.min(dens[n] - edge, light[n] - cut + (k === 0 ? 1 : 0));
      // Edges of the grid are always outside, so every outline closes.
      for (let i = 0; i < nx; i++) { field[i] = -1; field[(ny - 1) * nx + i] = -1; }
      for (let j = 0; j < ny; j++) { field[j * nx] = -1; field[j * nx + nx - 1] = -1; }
      const d = trace(field, nx, ny, x0, y0, res);
      if (!d) return;
      // Each band in the tone of its lower cut, nudged up so the bands step clearly.
      grade(ramp, Math.min(1, (bands[k] + (bands[k + 1] ?? 1)) / 2 + 0.02), c);
      layer.append(svg('path', { d, fill: `rgb(${c.map(Math.round).join(',')})`, 'fill-rule': 'evenodd' }));
    });
    g.append(layer);
  }
  return { node: g, ms: performance.now() - t0 };
}
