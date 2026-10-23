// Option B: clouds painted pixel by pixel on a 2D canvas from a density
// field. Each cloud's outline is its puffs, roughened with billowy noise; each
// pixel is then lit by how much cloud lies between it and the sun, and darkened
// towards the flat base. No GPU and no library: plain JavaScript, a few hundred
// milliseconds for a whole sky, drawn once and kept as an image.

import { svg } from '../../src/app/dom';
import type { Palette } from '../../src/app/scene/landscape';
import { billow, fbm } from './noise';
import { grade, rampOf, type RGB } from './ramp';
import { SUN, type Cirrus, type Cloud, type Heap, type Layer, type Puff } from './scene';

const W = 400;
const H = 260;

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * The puffs as a relief seen from the front: how far each point's surface
 * stands out towards the viewer, the highest ball winning. Outside every
 * puff it goes negative, so noise added to it can push the outline in and out.
 */
function relief(puffs: Puff[], x: number, y: number, soft = 0): number {
  let best = -Infinity;
  for (const p of puffs) {
    const dx = (x - p.x) / p.r;
    const dy = (y - p.y) / (p.r * p.flat);
    const d2 = dx * dx + dy * dy;
    const v = d2 < 1 ? p.r * p.flat * Math.sqrt(1 - d2) : p.r * (1 - Math.sqrt(d2));
    // A smooth maximum rounds the creases where two puffs meet.
    if (soft > 0) {
      const h = Math.max(soft - Math.abs(v - best), 0) / soft;
      best = Math.max(v, best) + h * h * soft * 0.25;
    } else if (v > best) best = v;
  }
  return best;
}

interface Field {
  box: [number, number, number, number];
  density(x: number, y: number): number;
  shade(x: number, y: number, d: number, out: RGB): number;
}

interface Lumps {
  puffs: Puff[];
  /** Size of the cauliflower bumps, and how far they stand out, in scene units. */
  detail: number;
  amp: number;
  /** Nothing below this line (a flat base), if any. */
  base?: number;
  /** Extra thinning, 0..1, for ragged sheets. */
  thin?: (x: number, y: number) => number;
}

/** A heap or a sheet of cells: a lumpy relief, shaded as a surface and by the cloud between it and the sun. */
function lumpyField(L: Lumps, ramp: ReturnType<typeof rampOf>, box: Field['box'], centre: [number, number], depth: number, lightness: (y: number) => number): Field {
  const z = (x: number, y: number) => {
    if (L.base !== undefined && y > L.base) return -L.amp;
    let v = relief(L.puffs, x, y) + L.amp * ((billow(x / L.detail, y / L.detail, 3) - 0.5) * 2 + (fbm(x / (L.detail * 0.3), y / (L.detail * 0.3), 2) - 0.5) * 0.35);
    if (L.base !== undefined) v = Math.min(v, (L.base - y) * 2);
    return v;
  };
  // A smoother relief for the shading: light inside a cloud is soft, and only
  // the outline shows the fine bumps.
  const zs = (x: number, y: number) => relief(L.puffs, x, y, L.detail * 1.2) + L.amp * 0.6 * (billow(x / (L.detail * 1.6), y / (L.detail * 1.6), 2) - 0.5);
  const density = (x: number, y: number) => {
    const v = z(x, y);
    if (v <= 0) return 0;
    return smoothstep(0, L.amp * 1.2, v) * (L.thin ? L.thin(x, y) : 1);
  };
  const [lx, ly] = unit(SUN[0] - centre[0], SUN[1] - centre[1]);
  const n = Math.hypot(lx, ly, 0.6);
  const [Lx, Ly, Lz] = [lx / n, ly / n, 0.6 / n];
  const step = depth / 8;
  const e = L.detail * 0.3;
  return {
    box,
    density,
    shade(x, y, d, out) {
      // The surface's slope, from the relief either side.
      const v = zs(x, y);
      const gx = (zs(x + e, y) - v) / e;
      const gy = (zs(x, y + e) - v) / e;
      const m = Math.hypot(gx, gy, 1);
      const lam = Math.max(0, (-gx * Lx - gy * Ly + Lz) / m + 0.4) / 1.4;
      // Cloud between here and the sun.
      let od = 0;
      for (let k = 1; k <= 6; k++) od += density(x + lx * step * k, y + ly * step * k);
      const t = Math.exp(-od * 0.5);
      let l = (0.5 * lam + 0.5 * t) * lightness(y) + 0.08;
      // The sunlit rim: thin cloud the sun shines straight through.
      l += (1 - d) * t * 0.3;
      grade(ramp, clamp(l), out);
      return d;
    },
  };
}

function heapField(c: Heap, p: Palette): Field {
  const detail = Math.max(2.5, c.h * 0.13);
  return lumpyField(
    { puffs: c.puffs, detail, amp: detail * 0.55, base: c.base },
    rampOf(p),
    [c.cx - c.w * 0.75, c.base - c.h * 1.3, c.cx + c.w * 0.75, c.base + 1],
    [c.cx, c.base - c.h / 2],
    c.h,
    // Darker towards the flat base, which the sun never reaches.
    (y) => 0.5 + 0.55 * clamp((c.base - y) / (c.h * 0.55)),
  );
}

function layerField(c: Layer, p: Palette): Field {
  const r = c.puffs.reduce((s, q) => s + q.r, 0) / c.puffs.length;
  return lumpyField(
    {
      puffs: c.puffs,
      detail: r * 0.35,
      amp: r * 0.3,
      // The sheet thins out towards its ragged ends.
      thin: (x, y) => 0.4 + 0.6 * smoothstep(0.3, 0.55, fbm(x / 45, y / 25, 3)),
    },
    rampOf(p),
    [c.x0 - 10, c.top - 10, c.x1 + 10, c.bottom + 10],
    [(c.x0 + c.x1) / 2, (c.top + c.bottom) / 2],
    r * 2,
    () => 0.95,
  );
}

function cirrusField(c: Cirrus, p: Palette): Field {
  const ramp = rampOf(p);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of c.strands) for (const [x, y] of s.pts) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const density = (x: number, y: number) => {
    let best = 0;
    for (const s of c.strands) {
      for (let i = 1; i < s.pts.length; i++) {
        const [ax, ay, aw] = s.pts[i - 1];
        const [bx, by, bw] = s.pts[i];
        const vx = bx - ax, vy = by - ay;
        const t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy));
        const dx = x - ax - vx * t, dy = y - ay - vy * t;
        const hw = aw + (bw - aw) * t;
        const v = 1 - Math.sqrt(dx * dx + dy * dy) / (hw * 1.8);
        if (v > best) best = v;
      }
    }
    if (best <= 0) return 0;
    // Fibres: noise stretched along the strands.
    const fibre = fbm(x / 26 + y * 0.15, y / 1.3, 4);
    return clamp(best * 1.4) * (0.25 + 0.95 * smoothstep(0.38, 0.72, fibre));
  };
  return {
    box: [x0 - 8, y0 - 8, x1 + 8, y1 + 8],
    density,
    shade(_x, _y, d, out) {
      grade(ramp, 0.82 + 0.18 * (1 - d), out);
      return clamp(d * 0.85);
    },
  };
}

function unit(x: number, y: number): [number, number] {
  const n = Math.hypot(x, y) || 1;
  return [x / n, y / n];
}

/** The clouds as one image to lay over a scene's sky, and how long they took. */
export function paintClouds(clouds: Cloud[], p: Palette, scale = 3): { node: SVGElement; ms: number } {
  const t0 = performance.now();
  const cw = W * scale;
  const ch = H * scale;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(cw, ch);
  // Straight colour and alpha, composited cloud over cloud, farthest first.
  const col = new Float32Array(cw * ch * 3);
  const alp = new Float32Array(cw * ch);
  const c: RGB = [0, 0, 0];
  for (const cloud of clouds) {
    const f = cloud.kind === 'heap' ? heapField(cloud, p) : cloud.kind === 'layer' ? layerField(cloud, p) : cirrusField(cloud, p);
    const [bx0, by0, bx1, by1] = f.box;
    const px0 = Math.max(0, Math.floor(bx0 * scale)), px1 = Math.min(cw, Math.ceil(bx1 * scale));
    const py0 = Math.max(0, Math.floor(by0 * scale)), py1 = Math.min(ch, Math.ceil(by1 * scale));
    for (let py = py0; py < py1; py++) {
      for (let px = px0; px < px1; px++) {
        const x = (px + 0.5) / scale;
        const y = (py + 0.5) / scale;
        const d = f.density(x, y);
        if (d <= 0.002) continue;
        const a = f.shade(x, y, d, c);
        const i = py * cw + px;
        const ao = alp[i];
        const an = a + ao * (1 - a);
        for (let k = 0; k < 3; k++) col[i * 3 + k] = (c[k] * a + col[i * 3 + k] * ao * (1 - a)) / an;
        alp[i] = an;
      }
    }
  }
  for (let i = 0; i < cw * ch; i++) {
    img.data[i * 4] = col[i * 3];
    img.data[i * 4 + 1] = col[i * 3 + 1];
    img.data[i * 4 + 2] = col[i * 3 + 2];
    img.data[i * 4 + 3] = alp[i] * 255;
  }
  g.putImageData(img, 0, 0);
  const ms = performance.now() - t0;
  return { node: svg('image', { href: canvas.toDataURL(), x: 0, y: 0, width: W, height: H }), ms };
}
