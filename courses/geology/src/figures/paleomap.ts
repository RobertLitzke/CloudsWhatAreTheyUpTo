// The continents through time, from the PALEOMAP plate model (Scotese 2016),
// as tools/geo/paleomap.py packs it: present-day outlines, each carried by a
// plate, and every plate's rotation at steps of 10 million years from a
// billion years ago to 50 million years ahead. Between steps the rotations
// are blended, so a time slider moves the continents smoothly.
//
// Drawn on an Equal Earth world map whose centre follows the land (ancient
// longitude is not recorded in the rocks, so nothing is lost), or on a globe.

import { svg } from 'didactics/dom';
import raw from '../data/paleomap.json';

type LL = [number, number];
export type V3 = [number, number, number];
type Q = [number, number, number, number];

interface Ring { p: number; from: number; ring: LL[] }
interface Packed {
  ages: number[];
  plate: Record<string, number>;
  seq: number[][];
  land: Ring[];
  shelf: Ring[];
  anchors: Record<string, { p: number; lon: number; lat: number }>;
}
const D = raw as unknown as Packed;

/** Ages of the data's steps, million years ago, from the furthest ahead (negative) to the oldest. */
export const AGES = D.ages;
export const OLDEST = AGES[AGES.length - 1];
export const AHEAD = -AGES[0];

const rad = (d: number) => (d * Math.PI) / 180;
export const xyz = (lon: number, lat: number): V3 => [Math.cos(rad(lat)) * Math.cos(rad(lon)), Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat))];
export const lonLat = (v: V3): LL => [(Math.atan2(v[1], v[0]) * 180) / Math.PI, (Math.asin(Math.max(-1, Math.min(1, v[2]))) * 180) / Math.PI];

/** Each plate's rotations, undone from the packing: 4 numbers per age. */
const SEQ = D.seq.map((f) => {
  const out = new Float64Array(f.length);
  for (let i = 0; i < f.length; i++) out[i] = f[i] + (i >= 4 ? out[i - 4] : 0);
  for (let i = 0; i < out.length; i++) out[i] /= 1e4;
  return out;
});

/** The rotation that carries a present-day point on plate `p` to where it was `ma` million years ago. */
export function rotationAt(p: number, ma: number): Q {
  const s = SEQ[D.plate[String(p)] ?? -1];
  if (!s) return [1, 0, 0, 0];
  const x = Math.max(AGES[0], Math.min(OLDEST, ma));
  let i = Math.min(AGES.length - 2, Math.floor((x - AGES[0]) / (AGES[1] - AGES[0])));
  if (i < 0) i = 0;
  const k = (x - AGES[i]) / (AGES[i + 1] - AGES[i]);
  const q: Q = [0, 0, 0, 0];
  for (let j = 0; j < 4; j++) q[j] = s[i * 4 + j] * (1 - k) + s[i * 4 + 4 + j] * k;
  const n = Math.hypot(...q) || 1;
  return q.map((v) => v / n) as Q;
}

export function rotate([w, x, y, z]: Q, [vx, vy, vz]: V3): V3 {
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}

/** Present-day outlines as unit vectors, ready to rotate. */
interface Shape { p: number; from: number; pts: V3[] }
const shapes = (rings: Ring[]): Shape[] => rings.map((r) => ({ p: r.p, from: r.from, pts: r.ring.map(([lon, lat]) => xyz(lon, lat)) }));
export const LAND = shapes(D.land);
export const SHELF = shapes(D.shelf);

/** A named present-day point, carried by its plate, `ma` million years ago. */
export function anchor(name: string, ma: number): V3 {
  const a = D.anchors[name];
  if (!a) throw new Error(`no anchor ${name}`);
  return rotate(rotationAt(a.p, ma), xyz(a.lon, a.lat));
}
export const plateOf = (name: string) => D.anchors[name].p;

/** Halfway between two points on the sphere. */
export function between(a: V3, b: V3, k = 0.5): V3 {
  const v: V3 = [a[0] * (1 - k) + b[0] * k, a[1] * (1 - k) + b[1] * k, a[2] * (1 - k) + b[2] * k];
  const n = Math.hypot(...v) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Distance between two points on the sphere, km. */
export const km = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 6371;

/** The outlines as they lay `ma` million years ago (only those that existed then). */
export function carried(list: Shape[], ma: number): { p: number; pts: V3[] }[] {
  const cache = new Map<number, Q>();
  const out: { p: number; pts: V3[] }[] = [];
  for (const s of list) {
    if (ma > s.from) continue;
    let q = cache.get(s.p);
    if (!q) cache.set(s.p, (q = rotationAt(s.p, ma)));
    const r = q;
    out.push({ p: s.p, pts: s.pts.map((v) => rotate(r, v)) });
  }
  return out;
}

// ---- Where to centre the map -------------------------------------------------------------

/** The longitude of the land's middle at each step, smoothed over ±40 Myr and unwrapped. */
const CENTRES: number[] = (() => {
  const raw = AGES.map((ma) => {
    let x = 0;
    let y = 0;
    for (const s of carried(LAND, ma)) for (const v of s.pts) { x += v[0]; y += v[1]; }
    return [x, y];
  });
  const sm = raw.map((_, i) => {
    let x = 0;
    let y = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(raw.length - 1, i + 4); j++) { x += raw[j][0]; y += raw[j][1]; }
    return (Math.atan2(y, x) * 180) / Math.PI;
  });
  for (let i = 1; i < sm.length; i++) {
    while (sm[i] - sm[i - 1] > 180) sm[i] -= 360;
    while (sm[i] - sm[i - 1] < -180) sm[i] += 360;
  }
  return sm;
})();

/** The map's central meridian for `ma`: the land's middle, but today's ordinary view (centred on 10° E) near the present. */
export function centreAt(ma: number): number {
  const x = Math.max(AGES[0], Math.min(OLDEST, ma));
  const i = Math.min(AGES.length - 2, Math.max(0, Math.floor((x - AGES[0]) / (AGES[1] - AGES[0]))));
  const k = (x - AGES[i]) / (AGES[i + 1] - AGES[i]);
  const c = CENTRES[i] * (1 - k) + CENTRES[i + 1] * k;
  // Blend to 10° E over the last 60 million years and the future, so today looks like an ordinary map.
  const today = 10 + 360 * Math.round((c - 10) / 360);
  const w = Math.max(0, Math.min(1, (ma - 0) / 60));
  return today * (1 - w) + c * w;
}

// ---- Equal Earth -------------------------------------------------------------------------

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;
/** Equal Earth, for longitude and latitude in radians: x in about ±2.71, y in about ±1.32. */
function equalEarth(lam: number, phi: number): [number, number] {
  const th = Math.asin(M * Math.sin(phi));
  const t2 = th * th;
  const t6 = t2 * t2 * t2;
  const x = (2 * Math.sqrt(3) * lam * Math.cos(th)) / (3 * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  const y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [x, y];
}
const XMAX = equalEarth(Math.PI, 0)[0];
const YMAX = equalEarth(0, Math.PI / 2)[1];
export const WORLD_ASPECT = XMAX / YMAX;

export interface WorldView {
  /** Screen point for a point on the sphere, with the map centred on `lon0`. */
  at: (v: V3) => [number, number];
  /** Screen point for longitude (relative to the centre) and latitude, degrees. */
  ll: (dlon: number, lat: number) => [number, number];
  /** The map's outline, as a path. */
  outline: string;
  /** A filled path through closed rings, broken at the map's edge and copied round it. */
  rings: (rings: V3[][]) => string;
  /** A line of latitude. */
  parallel: (lat: number) => string;
}

/** An Equal Earth world map `w` wide, its top-left corner at (x0, y0), centred on longitude `lon0`. */
export function worldView(x0: number, y0: number, w: number, lon0: number): WorldView {
  const s = w / 2 / XMAX;
  const cx = x0 + w / 2;
  const cy = y0 + YMAX * s;
  const ll = (dlon: number, lat: number): [number, number] => {
    const [x, y] = equalEarth(rad(dlon), rad(lat));
    return [cx + x * s, cy - y * s];
  };
  const rel = (lon: number) => ((((lon - lon0) % 360) + 540) % 360) - 180;
  const at = (v: V3) => {
    const [lon, lat] = lonLat(v);
    return ll(rel(lon), lat);
  };
  const edge: string[] = [];
  for (let lat = -90; lat <= 90; lat += 5) edge.push(ll(180, lat).map((n) => n.toFixed(1)).join(','));
  for (let lat = 90; lat >= -90; lat -= 5) edge.push(ll(-180, lat).map((n) => n.toFixed(1)).join(','));
  const outline = `M${edge.join('L')}Z`;
  const f = (n: number) => n.toFixed(1);
  const rings = (list: V3[][]) => {
    let d = '';
    for (const pts of list) {
      // Unwrap the longitudes so the ring is continuous; a ring round a pole gains 360°.
      const lls: LL[] = [];
      let prev = 0;
      for (let i = 0; i < pts.length; i++) {
        const [lon, lat] = lonLat(pts[i]);
        let r = rel(lon);
        if (i) {
          while (r - prev > 180) r -= 360;
          while (r - prev < -180) r += 360;
        }
        lls.push([r, lat]);
        prev = r;
      }
      let back = lls[0][0] - lls[lls.length - 1][0];
      while (back > 180) back -= 360;
      while (back < -180) back += 360;
      if (Math.abs(lls[lls.length - 1][0] + back - lls[0][0]) > 180) {
        // The ring goes round a pole: close it along the pole itself.
        const pole = lls.reduce((a, b) => a + b[1], 0) > 0 ? 90 : -90;
        lls.push([lls[lls.length - 1][0], pole], [lls[0][0], pole]);
      }
      let lo = Infinity;
      let hi = -Infinity;
      for (const [x] of lls) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
      for (const off of [-360, 0, 360]) {
        if (hi + off < -180 || lo + off > 180) continue;
        d += lls.map(([x, y], i) => {
          const [px, py] = ll(x + off, y);
          return `${i ? 'L' : 'M'}${f(px)},${f(py)}`;
        }).join('') + 'Z';
      }
    }
    return d;
  };
  const parallel = (lat: number) => `M${f(ll(-180, lat)[0])},${f(ll(-180, lat)[1])}L${f(ll(180, lat)[0])},${f(ll(180, lat)[1])}`;
  return { at, ll, outline, rings, parallel };
}

let clipCount = 0;
/** A clip path for the map's outline, to put in the drawing once; returns its url(). */
export function worldClip(s: SVGSVGElement, view: WorldView): string {
  const id = `world-clip-${++clipCount}`;
  const defs = svg('defs', {}, svg('clipPath', { id }, svg('path', { d: view.outline })));
  s.append(defs);
  return `url(#${id})`;
}

// ---- A globe -----------------------------------------------------------------------------

/** An orthographic globe of radius r centred at (cx, cy), looking down on `centre`. */
export function globeView(cx: number, cy: number, r: number, centre: V3) {
  const [lon0, lat0] = lonLat(centre).map(rad);
  const at = (v: V3): [number, number, boolean] => {
    const [lonD, latD] = lonLat(v);
    const lon = rad(lonD);
    const lat = rad(latD);
    const cosc = Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(lon - lon0);
    const x = Math.cos(lat) * Math.sin(lon - lon0);
    const y = Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(lon - lon0);
    return [cx + r * x, cy - r * y, cosc > 0];
  };
  /** Closed rings on the near side (rings wholly on the far side are left out; ones across the rim are drawn squashed onto it). */
  const rings = (list: V3[][]) => {
    let d = '';
    for (const pts of list) {
      const ps = pts.map(at);
      if (!ps.some((p) => p[2])) continue;
      d += ps.map(([x, y, front], i) => {
        let px = x;
        let py = y;
        if (!front) {
          // Push hidden points out to the rim.
          const dx = x - cx;
          const dy = y - cy;
          const n = Math.hypot(dx, dy) || 1;
          px = cx + (dx / n) * r;
          py = cy + (dy / n) * r;
        }
        return `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
      }).join('') + 'Z';
    }
    return d;
  };
  return { at, rings };
}

/** Paths for the land and shelf of the plates in `plates` (or all), `ma` million years ago. */
export function drawn(rings: (r: V3[][]) => string, ma: number, pick: (p: number) => boolean = () => true) {
  return {
    shelf: rings(carried(SHELF, ma).filter((s) => pick(s.p)).map((s) => s.pts)),
    land: rings(carried(LAND, ma).filter((s) => pick(s.p)).map((s) => s.pts)),
  };
}

/** Plates that moved with `p` at `ma` (their rotations then nearly the same). */
export function movingWith(p: number, ma: number): Set<number> {
  const q = rotationAt(p, ma);
  const out = new Set<number>();
  for (const id of Object.keys(D.plate)) {
    const r = rotationAt(Number(id), ma);
    const dotq = Math.abs(q[0] * r[0] + q[1] * r[1] + q[2] * r[2] + q[3] * r[3]);
    if (dotq > Math.cos(rad(1.5))) out.add(Number(id));
  }
  return out;
}

export const PALEOMAP_CREDIT = 'Continents: PALEOMAP plate model, C. R. Scotese (2016), CC BY 3.0, via GPlates';
