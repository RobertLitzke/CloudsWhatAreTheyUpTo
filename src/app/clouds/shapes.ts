// Clouds described once, as shapes in a drawing's own units, for every way of
// drawing them: in flat vector (flat.ts), ray-marched on the GPU (volume.ts),
// or painted on a canvas when there is no GPU (paint.ts).
//
// A heap is a stack of puffs (spheres) with a flat base; a layer is a sheet of
// small flattened puffs (altocumulus, stratocumulus); cirrus is a few strands,
// each a line with a width, ending in a falling hook; a sheet is an even slab
// (stratus, fog, altostratus, a cirrostratus veil).

import { makeRng } from '../../core/rng';

export interface Puff {
  x: number;
  y: number;
  /** Depth, towards the viewer negative; only the volume renderer uses it. */
  z: number;
  r: number;
  /** Vertical squash: 1 is round, 0.5 a lens twice as wide as tall. */
  flat: number;
}

export interface Heap {
  kind: 'heap';
  /** How thick the cloud is, 1 for an ordinary cumulus; less lets more light through. */
  density?: number;
  cx: number;
  base: number;
  w: number;
  h: number;
  puffs: Puff[];
}

export interface Layer {
  kind: 'layer';
  density?: number;
  /** Size of the bumps eaten into each puff; large is smooth (mammatus), small is cauliflower. */
  detail?: number;
  top: number;
  bottom: number;
  x0: number;
  x1: number;
  puffs: Puff[];
}

export interface Strand {
  /** The strand's spine, head first, and its half width at each point. */
  pts: [x: number, y: number, hw: number][];
}

export interface Cirrus {
  kind: 'cirrus';
  strands: Strand[];
}

export interface Sheet {
  kind: 'sheet';
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  /** 0..1: a thin veil to a thick grey blanket. */
  density: number;
  /** Size of the lumps on its top and base, in the drawing's units. */
  detail?: number;
}

/**
 * A sheet of cells on a grid, made up on the fly rather than listed, so it can
 * hold thousands of pieces: altocumulus, cirrocumulus, stratocumulus, a
 * supercooled layer. Rows alternate half a cell, and every cell is nudged a
 * little and sized a little differently, by `seed`.
 */
export interface Cells {
  kind: 'cells';
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  /** Distance between cell centres. */
  size: number;
  /** Radius of each piece. */
  r: number;
  /** Vertical squash of a piece. */
  flat: number;
  density: number;
  seed: number;
  /** A hole cut in the sheet (a fallstreak hole): centre and radii. */
  hole?: [x: number, y: number, rx: number, ry: number];
}

export type Cloud = Heap | Layer | Cirrus | Sheet | Cells;

/** A cell sheet as a list of puffs, for the renderers that need one. */
export function cellPuffs(c: Cells): Puff[] {
  const out: Puff[] = [];
  const rowH = c.size * 0.8;
  for (let j = Math.floor(c.top / rowH); j * rowH <= c.bottom; j++) {
    for (let i = Math.floor(c.x0 / c.size) - 1; i * c.size <= c.x1; i++) {
      const h1 = cellHash(i, j, c.seed);
      const h2 = cellHash(i + 31, j + 17, c.seed);
      const x = (i + 0.5 + (j & 1) * 0.5 + (h1 - 0.5) * 0.35) * c.size;
      const y = (j + 0.5 + (h2 - 0.5) * 0.3) * rowH;
      if (x < c.x0 || x > c.x1 || y < c.top || y > c.bottom) continue;
      if (c.hole) {
        const [hx, hy, rx, ry] = c.hole;
        if (((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2 < 1) continue;
      }
      out.push({ x, y, z: 0, r: c.r * (0.8 + 0.4 * h1), flat: c.flat });
    }
  }
  return out;
}

/** The same hash as the shader's, so both renderers place the same cells. */
export function cellHash(i: number, j: number, seed: number): number {
  const v = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Where the sun is, in scene units; light comes from here. */
export const SUN: [number, number] = [340, 52];

/** A heap of cumulus: lobes along a domed outline over a few big filling puffs. `inner` adds lobes bulging out of the face, for the volume renderer. */
export function heap(cx: number, base: number, w: number, h: number, seed: number, inner = true): Heap {
  const rng = makeRng(seed);
  const puffs: Puff[] = [];
  // The outline is a dome, a little off-centre, steeper on the sunless side.
  const peak = cx - w * 0.06;
  const top = (x: number) => {
    const u = Math.min(1, Math.abs(x - peak) / (x < peak ? w * 0.48 : w * 0.54));
    return base - h * Math.pow(1 - Math.pow(u, 2.4), 0.55);
  };
  // Lobes along the top: bigger near the crown, their tops on the outline.
  let x = cx - w / 2 + h * 0.08;
  while (x < cx + w / 2 - h * 0.05) {
    const u = Math.abs(x - peak) / (w / 2);
    const r = h * (0.16 + 0.16 * (1 - u)) * (0.8 + 0.4 * rng());
    const y = Math.min(base - r * 0.3, top(x) + r * 0.95);
    puffs.push({ x, y, z: (rng() - 0.5) * r, r, flat: 1 });
    // A second lobe just inside, bulging towards the viewer.
    if (inner && r > h * 0.18) puffs.push({ x: x + (rng() - 0.5) * r * 0.6, y: y + r * (0.7 + 0.4 * rng()), z: -r * 0.5, r: r * (0.75 + 0.2 * rng()), flat: 1 });
    x += r * (0.9 + 0.4 * rng());
  }
  // Filling: big puffs inside the body, and a row along the base.
  const fill = Math.max(2, Math.round(w / (h * 0.5)));
  for (let i = 0; i < fill; i++) {
    const fx = cx - w * 0.36 + (w * 0.72 * i) / Math.max(1, fill - 1);
    const r = Math.min(h * 0.32, (base - top(fx)) * 0.5);
    puffs.push({ x: fx, y: base - r * 0.6, z: (rng() - 0.5) * r, r, flat: 1 });
  }
  return { kind: 'heap', cx, base, w, h, puffs };
}

export function layer(x0: number, x1: number, top: number, bottom: number, seed: number): Layer {
  const rng = makeRng(seed);
  const puffs: Puff[] = [];
  // Rows of cells, smaller and closer together towards the top: the far side
  // of the sheet seen at a slant.
  const rows = 4;
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    const y = top + (bottom - top) * t;
    const r = 3.2 + 3.4 * t;
    const step = r * 2.5;
    // A ragged patch: rows begin and end at different places.
    const a = x0 + rng() * 22 + (1 - t) * 14;
    const b = x1 - rng() * 22;
    for (let x = a; x < b; x += step * (0.85 + 0.3 * rng())) {
      if (rng() < 0.12) continue;
      puffs.push({ x: x + (rng() - 0.5) * r, y: y + (rng() - 0.5) * r * 0.5, z: (rng() - 0.5) * 10, r: r * (0.8 + 0.4 * rng()), flat: 0.55 });
    }
  }
  return { kind: 'layer', top, bottom, x0, x1, puffs };
}

export function cirrus(x0: number, x1: number, y: number, seed: number): Cirrus {
  const rng = makeRng(seed);
  const strands: Strand[] = [];
  for (let i = 0; i < 6; i++) {
    const sx = x0 + (x1 - x0) * (i / 6) + rng() * 16;
    const sy = y + (rng() - 0.5) * 18;
    const len = 46 + rng() * 40;
    const pts: Strand['pts'] = [];
    // The head drifts right and holds its height; the falling tail trails
    // back to the left and droops, as fall streaks do in wind shear.
    for (let k = 0; k <= 16; k++) {
      const u = k / 16;
      pts.push([sx + len * (1 - u), sy + 14 * u * u + 2 * Math.sin(u * 5 + i), 0.6 + 2.2 * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - u * 0.6)]);
    }
    strands.push({ pts });
  }
  return { kind: 'cirrus', strands };
}

/** The test sky: cirrus high up, a patch of altocumulus, and three heaps of fair-weather cumulus. */
export function testSky(): Cloud[] {
  return [
    cirrus(20, 230, 40, 3),
    layer(176, 392, 92, 120, 5),
    heap(232, 182, 34, 14, 11),
    heap(306, 180, 62, 32, 7),
    heap(118, 176, 118, 78, 2),
  ];
}
