// Earthquake waves traced through a round Earth, for the Deep Earth branch.
// The Earth is a stack of shells whose wave speed depends only on the radius,
// so each ray keeps its ray parameter p = r·sin(i)/v (Snell's law for a
// sphere) wherever it goes. Stepping along the ray, sin(i) = p·v(r)/r; where
// that would pass 1 the ray turns back up (a gentle turn in a speed gradient,
// a reflection at a jump). Pure numbers, no drawing, so it can be tested.

export const R_EARTH = 6371;

export interface EarthModel {
  /** Radius of the core, km (0 for none). */
  core: number;
  /** P speed at the top of the core, km/s; it rises by nearly half toward the centre. */
  coreSpeed: number;
  /** Radius of the inner core, km (0 for none). */
  inner: number;
  /** P speed in the inner core, km/s. */
  innerSpeed: number;
  /** 'P' waves, or 'S' waves, which a liquid core stops. */
  wave: 'P' | 'S';
}

export const REAL_EARTH: EarthModel = { core: 3480, coreSpeed: 8.0, inner: 1220, innerSpeed: 11.1, wave: 'P' };

/** Speed in the mantle at radius r: from the top (8.0 P, 4.5 S) rising fast at first, then slowly, to 13.7 P, 7.3 S at 2,890 km, then level. */
function mantleSpeed(r: number, wave: 'P' | 'S'): number {
  const f = Math.min(1, (R_EARTH - r) / 2890);
  return wave === 'P' ? 8.0 + 5.7 * f ** 0.3 : 4.5 + 2.8 * f ** 0.3;
}

/** Wave speed at radius r, km/s; 0 where the wave can't go (S in liquid). */
export function speed(m: EarthModel, r: number): number {
  if (r < m.inner) return m.wave === 'S' ? 0 : m.innerSpeed;
  if (r < m.core) return m.wave === 'S' ? 0 : m.coreSpeed * (1 + 0.45 * (1 - r / m.core));
  return mantleSpeed(r, m.wave);
}

export interface Ray {
  /** Points along the ray: [radius km, angle from the source in radians]. */
  path: [number, number][];
  /** Where it comes back to the surface, degrees from the source (folded to 0–180), or null if it never does. */
  lands: number | null;
  /** Whether it went into the core, and the inner core. */
  core: boolean;
  inner: boolean;
}

/** One ray leaving a surface source at `takeoff` radians from straight down. */
export function trace(m: EarthModel, takeoff: number, step = 12): Ray {
  const v0 = speed(m, R_EARTH - 1);
  const p = ((R_EARTH - 1) * Math.sin(takeoff)) / v0;
  let r = R_EARTH - 1;
  let th = 0;
  let down = true;
  let core = false;
  let inner = false;
  const path: [number, number][] = [[R_EARTH, 0]];
  for (let n = 0; n < 6000; n++) {
    const v = speed(m, r);
    if (v === 0) return { path, lands: null, core, inner };
    const s = Math.min(0.999999, (p * v) / Math.max(r, 1));
    const c = Math.sqrt(1 - s * s);
    let nr = r + (down ? -c : c) * step;
    const nv = speed(m, Math.max(nr, 0.5));
    // A ray that can't enter the next shell, or can't go deeper here, turns back up.
    if (down && (nv === 0 || (p * nv) / Math.max(nr, 1) >= 1 || nr <= 1)) {
      down = false;
      nr = r;
      if (nv === 0 && m.wave === 'S' && r <= m.core + step) return { path: [...path, [r, th]], lands: null, core, inner };
    }
    th += (s / Math.max(r, 1)) * step;
    r = nr;
    if (r < m.core) core = true;
    if (r < m.inner) inner = true;
    path.push([r, th]);
    if (!down && r >= R_EARTH) {
      let deg = ((th * 180) / Math.PI) % 360;
      if (deg > 180) deg = 360 - deg;
      return { path, lands: deg, core, inner };
    }
  }
  return { path, lands: null, core, inner };
}

/** Many rays, evenly spread in ray parameter, from straight down to grazing. */
export function fan(m: EarthModel, n = 360, step = 12): Ray[] {
  const out: Ray[] = [];
  for (let k = 0; k < n; k++) out.push(trace(m, Math.asin((k + 0.5) / n), step));
  return out;
}

/**
 * Which whole degrees from 0 to 180 some ray reaches; `bins[d]` counts the
 * rays landing between d and d+1, and `fromInner[d]` those that went into the inner core.
 */
export function arrivals(rays: Ray[]): { bins: number[]; fromInner: number[] } {
  const bins = new Array(181).fill(0);
  const fromInner = new Array(181).fill(0);
  for (const ray of rays) {
    if (ray.lands === null) continue;
    const d = Math.min(180, Math.floor(ray.lands));
    bins[d]++;
    if (ray.inner) fromInner[d]++;
  }
  return { bins, fromInner };
}

/** The shadow: the widest run of empty degrees past 60° (at least 3), as [from, to], or null if every distance gets a wave. */
export function shadow(bins: number[]): [number, number] | null {
  let best: [number, number] | null = null;
  let from = -1;
  for (let d = 60; d <= 171; d++) {
    const empty = d <= 170 && bins[d] === 0;
    if (empty && from < 0) from = d;
    if (!empty && from >= 0) {
      if (d - from >= 3 && (!best || d - from > best[1] - best[0])) best = [from, d];
      from = -1;
    }
  }
  return best;
}
