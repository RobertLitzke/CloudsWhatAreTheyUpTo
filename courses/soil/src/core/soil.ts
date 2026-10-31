// What soil is made of, as numbers: the three mineral particle sizes, the
// twelve USDA texture classes they name, and how fast each size settles out of
// water in a jar. Pure TypeScript, no DOM, so it can be tested without a browser.

export type Particle = 'sand' | 'silt' | 'clay';

export const PARTICLES: readonly Particle[] = ['sand', 'silt', 'clay'];

/** USDA size limits, in millimetres across, with how each one feels between the fingers. */
export const SIZES: Record<Particle, { minMm: number; maxMm: number; feel: string }> = {
  sand: { minMm: 0.05, maxMm: 2, feel: 'gritty' },
  silt: { minMm: 0.002, maxMm: 0.05, feel: 'silky, like flour' },
  clay: { minMm: 0, maxMm: 0.002, feel: 'sticky when wet, hard when dry' },
};

/** A soil's mineral part, as percentages of sand, silt and clay that add up to 100. */
export interface Mix {
  sand: number;
  silt: number;
  clay: number;
}

/** A mix from sand and clay; silt is what is left. */
export function mixOf(sand: number, clay: number): Mix {
  const s = Math.max(0, Math.min(100, sand));
  const c = Math.max(0, Math.min(100 - s, clay));
  return { sand: s, silt: 100 - s - c, clay: c };
}

export const TEXTURES = [
  'sand', 'loamy sand', 'sandy loam', 'loam', 'silt loam', 'silt',
  'sandy clay loam', 'clay loam', 'silty clay loam', 'sandy clay', 'silty clay', 'clay',
] as const;
export type Texture = (typeof TEXTURES)[number];

/**
 * The USDA texture class of a mix, by the boundaries of the soil texture
 * triangle (USDA Soil Survey Manual). Tested in the order the classes are
 * listed, so a point on a shared edge goes to the first class it fits.
 */
export function textureOf(m: Mix): Texture {
  const { sand: S, silt: Si, clay: C } = m;
  if (Si + 1.5 * C < 15) return 'sand';
  if (Si + 2 * C < 30) return 'loamy sand';
  if ((C >= 7 && C < 20 && S > 52) || (C < 7 && Si < 50)) return 'sandy loam';
  if (C >= 7 && C < 27 && Si >= 28 && Si < 50 && S <= 52) return 'loam';
  if (Si >= 80 && C < 12) return 'silt';
  if (Si >= 50 && C < 27) return 'silt loam';
  if (C >= 20 && C < 35 && Si < 28 && S > 45) return 'sandy clay loam';
  if (C >= 27 && C < 40 && S > 20 && S <= 45) return 'clay loam';
  if (C >= 27 && C < 40 && S <= 20) return 'silty clay loam';
  if (C >= 35 && S > 45) return 'sandy clay';
  if (C >= 40 && Si >= 40) return 'silty clay';
  return 'clay';
}

/** The three broad groups a gardener talks in. */
export type Feel = 'sandy' | 'loamy' | 'clayey';

export function feelOf(t: Texture): Feel {
  if (t === 'sand' || t === 'loamy sand' || t === 'sandy loam') return 'sandy';
  if (t.endsWith('clay') || t === 'clay') return 'clayey';
  return 'loamy';
}

/** What each group means in a bed, in a line. */
export const IN_THE_BED: Record<Feel, string> = {
  sandy: 'Drains fast and warms early, but dries out and lets nutrients wash away.',
  loamy: 'Holds water and nutrients and still lets air in: what most vegetables want.',
  clayey: 'Holds water and nutrients well, but drains slowly, packs hard and is slow to warm.',
};

// ---- The jar test ------------------------------------------------------------
//
// Shake a soil in a jar of water and the particles settle by size: sand in
// under a minute, silt over the next few hours, and clay over a day or two
// (Stokes' law: speed goes with the square of the size). Measuring each layer
// gives the mix.

/** Seconds from shaking until each size has mostly settled; the layers are read off at these times. */
export const SETTLED_BY: Record<Particle, number> = {
  sand: 60,
  silt: 6 * 3600,
  clay: 48 * 3600,
};

/** When each size starts to land in earnest. */
const STARTS: Record<Particle, number> = { sand: 2, silt: 60, clay: 2 * 3600 };

/** The share (0 to 1) of a size that has settled `t` seconds after shaking, eased over a log of time. */
export function settled(p: Particle, t: number): number {
  const a = Math.log(STARTS[p]);
  const b = Math.log(SETTLED_BY[p]);
  if (t <= STARTS[p]) return 0;
  const x = Math.min(1, (Math.log(t) - a) / (b - a));
  return x * x * (3 - 2 * x);
}

/** A time after shaking, said the way a person would: 30 s, 5 min, 2 h, 2 days. */
export function sayTime(t: number): string {
  if (t < 60) return `${Math.round(t)} s`;
  if (t < 3600) return `${Math.round(t / 60)} min`;
  if (t < 36 * 3600) return `${Math.round(t / 3600)} h`;
  const d = Math.round(t / 86400);
  return d === 1 ? '1 day' : `${d} days`;
}

/**
 * Of a handful of good garden soil, by volume: roughly half solid and half
 * pore space, the pores about half water and half air a day or two after a
 * soaking rain.
 */
export const HANDFUL = [
  { part: 'minerals', share: 45 },
  { part: 'organic matter', share: 5 },
  { part: 'water', share: 25 },
  { part: 'air', share: 25 },
] as const;
