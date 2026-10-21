// Cloud seeding for the lessons, simplified to what the lessons need: what freezes a
// supercooled cloud in a cold box, what a seeded layer of cloud does with the
// ice it is given, and how a seeding trial tells a real effect from luck.
//
// Numbers are per litre of cloud. A litre of ordinary cloud holds about a
// hundred thousand droplets and a fifth of a milligram of water.

import { makeRng, type Rng } from './rng';

export type Agent = 'none' | 'dust' | 'iodide' | 'dryIce';

/** Cloud droplets in a litre of cloud. */
export const DROPLETS_PER_L = 1e5;
/** Grams of liquid water in a litre of an ordinary layer cloud (0.2 g in a cubic metre). */
export const WATER_G_PER_L = 2e-4;

/**
 * Ice crystals per litre that ordinary air's dust and soil can start at a
 * temperature (Fletcher's rule of thumb): about one in a hundred thousand
 * litres at −1 °C, rising tenfold for every 4 °C colder, to about one per
 * litre at −20 °C. Below −38 °C every droplet freezes by itself.
 */
export function naturalIce(tempC: number): number {
  if (tempC >= 0) return 0;
  if (tempC <= -38) return DROPLETS_PER_L;
  return 1e-5 * Math.exp(0.6 * -tempC);
}

/**
 * Crystals per litre that a pinch of each agent starts in a supercooled cloud
 * at a temperature. Dry ice is so cold (−78 °C) that the air in its wake
 * freezes on its own, at any temperature below 0 °C. Silver iodide is a
 * template: it starts working below about −5 °C and works better colder.
 * Ordinary dust is a poor template and needs it much colder.
 */
export function iceFrom(agent: Agent, tempC: number): number {
  if (tempC >= 0) return 0;
  switch (agent) {
    case 'none':
      return naturalIce(tempC) * 0.01; // a clean box: what dust there is was filtered out
    case 'dust':
      return naturalIce(tempC) * 30;
    case 'iodide': {
      const k = Math.max(0, Math.min(1, (-tempC - 5) / 10));
      return k > 0 ? 1e6 * k * k : 0;
    }
    case 'dryIce':
      return 1e8;
  }
}

export type BoxResult = 'warm' | 'nothing' | 'sparkles' | 'snow';

/** What a cold box of supercooled cloud does with an agent. */
export function coldBox(agent: Agent, tempC: number): { perL: number; result: BoxResult } {
  if (tempC >= 0) return { perL: 0, result: 'warm' };
  const perL = iceFrom(agent, tempC);
  return { perL, result: perL < 0.05 ? 'nothing' : perL < 1000 ? 'sparkles' : 'snow' };
}

// ---- Seeding a layer of cloud ------------------------------------------------

/** Crystals per litre made by a pound of dry ice dropped over each mile of flight, spread through the layer below. */
export const CRYSTALS_PER_LB_MILE = 56;

export type LayerResult = 'warm' | 'nothing' | 'flurries' | 'hole' | 'overseeded';

export interface Seeded {
  /** Ice crystals per litre: what was dropped plus what nature makes at this temperature. */
  perL: number;
  /** How big each grows, sharing out the cloud's water, in millimetres. */
  sizeMm: number;
  result: LayerResult;
}

/**
 * A supercooled layer at `tempC` seeded with `lbPerMile` of dry ice. The
 * crystals share out the layer's water between them. A few big crystals fall
 * out as flurries and leave the layer as it was; tens to hundreds per litre
 * take the water quickly, grow big enough to fall, and snow the layer out,
 * leaving a hole; with thousands per litre, each one gets so little water that
 * it stays too small to fall, and the cloud turns to a lingering veil of ice.
 */
export function seedLayer(lbPerMile: number, tempC: number): Seeded {
  if (tempC >= 0) return { perL: 0, sizeMm: 0, result: 'warm' };
  const perL = lbPerMile * CRYSTALS_PER_LB_MILE + naturalIce(tempC);
  const grams = WATER_G_PER_L / Math.max(perL, 1e-9);
  // A ball of ice of that mass, in millimetres; a plate or a star of the same
  // mass is about three times as wide.
  const sizeMm = Math.min(5, 3 * 10 * Math.cbrt((6 * grams) / (Math.PI * 0.9)));
  const result: LayerResult = perL < 0.3 ? 'nothing' : perL < 5 ? 'flurries' : perL <= 3000 ? 'hole' : 'overseeded';
  return { perL, sizeMm, result };
}

// ---- Did it work? ------------------------------------------------------------

/** Seeding adds this much to a storm's snow, on average, in the trial. */
export const TRUE_EFFECT = 1.15;
/** How much storms vary by themselves (the spread of the logarithm of their snowfall). */
export const STORM_SPREAD = 0.55;
export const STORMS_PER_WINTER = 20;

export interface Storm {
  /** Snowfall, as water, in millimetres. */
  mm: number;
  seeded: boolean;
}

/** A normal deviate, from two uniform ones. */
function gauss(rng: Rng): number {
  const u = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/**
 * The storms of `winters` winters. With `random`, a coin decides which are
 * seeded. Without it, the seeder picks the storms that look most promising,
 * which tend to be the ones that would have snowed the most anyway.
 */
export function runTrial(winters: number, random: boolean, seed: number): Storm[] {
  const rng = makeRng(seed);
  const storms: Storm[] = [];
  for (let i = 0; i < winters * STORMS_PER_WINTER; i++) {
    const z = gauss(rng);
    const natural = 8 * Math.exp(STORM_SPREAD * z);
    const coin = rng() < 0.5;
    // The seeder's eye is good but not perfect.
    const looksGood = z + 0.6 * gauss(rng) > 0;
    const seeded = random ? coin : looksGood;
    storms.push({ mm: natural * (seeded ? TRUE_EFFECT : 1), seeded });
  }
  return storms;
}

export interface Verdict {
  seeded: number;
  unseeded: number;
  /** Seeded snowfall over unseeded, as a ratio of their typical (geometric mean) storms. */
  ratio: number;
  /** The range luck alone could have put the ratio in (about 95 times in 100). */
  low: number;
  high: number;
}

export function judge(storms: readonly Storm[]): Verdict {
  const logs = (s: boolean) => storms.filter((x) => x.seeded === s).map((x) => Math.log(x.mm));
  const a = logs(true);
  const b = logs(false);
  const mean = (v: number[]) => v.reduce((p, q) => p + q, 0) / Math.max(1, v.length);
  const sd = (v: number[]) => {
    const m = mean(v);
    return Math.sqrt(v.reduce((p, q) => p + (q - m) ** 2, 0) / Math.max(1, v.length - 1));
  };
  const diff = mean(a) - mean(b);
  const se = Math.sqrt((sd(a) ** 2) / Math.max(1, a.length) + (sd(b) ** 2) / Math.max(1, b.length));
  return { seeded: a.length, unseeded: b.length, ratio: Math.exp(diff), low: Math.exp(diff - 2 * se), high: Math.exp(diff + 2 * se) };
}
