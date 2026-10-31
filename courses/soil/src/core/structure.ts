// Crumb: how roots, fungi, worms and organic matter stick grains into
// aggregates, and how digging and footsteps break them. A rough model, for a
// figure that shows which way each thing pushes, not a measurement: crumb
// stability rises with months of living roots, organic matter and an undug
// soil, and a stable soil packs less, which opens it to water. Pure
// TypeScript, no DOM.

import { hydraulics, type Hydraulics } from './water';
import type { Mix } from './soil';

export type Disturbance = 'none' | 'fork' | 'dig' | 'till';

export const DISTURBANCE: Record<Disturbance, { name: string; loss: number }> = {
  none: { name: 'No dig', loss: 0 },
  fork: { name: 'Loosen with a fork', loss: 0.08 },
  dig: { name: 'Dig every year', loss: 0.2 },
  till: { name: 'Rototill', loss: 0.32 },
};

export interface Bed {
  /** Months a year with something growing in the bed. */
  roots: number;
  /** Organic matter, % by weight. */
  om: number;
  disturbance: Disturbance;
  /** Whether people walk on the bed, wet or dry. */
  trodden: boolean;
}

/** How well the soil's crumbs hold together, 0 (they melt in water) to 1 (they hold for hours). */
export function stability(b: Bed): number {
  const s = 0.08 + 0.035 * b.roots + 0.065 * b.om - DISTURBANCE[b.disturbance].loss - (b.trodden ? 0.12 : 0);
  return Math.max(0, Math.min(1, s));
}

/**
 * How packed the soil is, as Saxton and Rawls's density factor: crumbly soil
 * is looser than its texture alone would make it, and trodden soil denser.
 */
export function density(b: Bed): number {
  return 1.1 - 0.2 * stability(b) + (b.trodden ? 0.12 : 0);
}

export function bedHydraulics(mix: Mix, b: Bed): Hydraulics {
  return hydraulics(mix, b.om, density(b));
}

/** The share of a dry crumb still in one piece `seconds` after it is dropped in water, for the slake test. */
export function slaked(stab: number, seconds: number): number {
  // A weak crumb falls apart in seconds; a strong one barely softens in ten minutes.
  const halfLife = 4 * Math.pow(400, stab);
  return Math.pow(0.5, seconds / halfLife);
}
