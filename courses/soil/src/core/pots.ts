// Pots: the water a mix holds at each height above the bottom of a pot once it
// has stopped dripping, and how much of the pot that leaves wet through and
// how much holds air. Pure TypeScript, no DOM.

export type MixId = 'garden' | 'peat' | 'bark';

export interface MixInfo {
  name: string;
  /** Pore space, as a share of the mix's volume. */
  pores: number;
  /**
   * The height of the saturated layer at the bottom of a drained pot, in cm:
   * how high the mix's pores can hold water up against gravity before air can
   * get in. Fine pores hold water higher than coarse ones.
   */
  perched: number;
  /** How quickly the mix dries out above that layer: higher drains more sharply. */
  spread: number;
}

/**
 * Typical values for a sieved garden loam, a peat or coir potting mix, and a
 * mix of composted bark, grit and some peat or coir. The heights follow the
 * pattern measured for growing media; any one bag or soil can differ by half
 * again.
 */
export const MIXES: Record<MixId, MixInfo> = {
  garden: { name: 'Garden soil', pores: 0.48, perched: 16, spread: 0.4 },
  peat: { name: 'Peat or coir mix', pores: 0.85, perched: 5, spread: 0.5 },
  bark: { name: 'Bark and grit mix', pores: 0.7, perched: 2, spread: 0.45 },
};

export const MIX_IDS = Object.keys(MIXES) as MixId[];

/**
 * Water held at `z` cm above the bottom of the mix, as a share of the mix's
 * volume, once a watered pot has stopped dripping: the pores are full up to
 * the perched height, and above it the mix holds less the higher it sits
 * (Brooks and Corey's curve).
 */
export function waterAt(mix: MixInfo, z: number): number {
  return z <= mix.perched ? mix.pores : mix.pores * Math.pow(mix.perched / z, mix.spread);
}

export interface Drained {
  /** Depth of potting mix above any gravel, in cm. */
  depth: number;
  /** Share of the mix that sits saturated, 0 to 1. */
  soaked: number;
  /** Air in the mix, as a share of the mix's volume, averaged over the pot. */
  air: number;
}

/**
 * A pot `height` cm tall filled with `mix` above `gravel` cm of gravel, after
 * watering and draining. Water will not leave the fine mix for the coarse
 * gravel until the mix just above it is saturated, so the perched layer forms
 * on top of the gravel, as it would on the bottom of the pot.
 */
export function drained(id: MixId, height: number, gravel = 0): Drained {
  const mix = MIXES[id];
  const depth = Math.max(0, height - gravel);
  if (depth === 0) return { depth, soaked: 0, air: 0 };
  const steps = 200;
  let air = 0;
  for (let i = 0; i < steps; i++) air += mix.pores - waterAt(mix, ((i + 0.5) / steps) * depth);
  return { depth, soaked: Math.min(1, mix.perched / depth), air: air / steps };
}
