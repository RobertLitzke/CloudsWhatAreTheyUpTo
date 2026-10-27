// The coast's air, simplified: a shallow layer chilled by the sea, then the
// air aloft. In summer, air sinking under the Pacific High keeps the air aloft
// warm, warmer than the sea-chilled air under it: a lid. A bubble from the
// sea's surface rises while it is warmer than the air around it, as in
// Lesson 5, so its fate is set by two numbers: how warm the sea is, and how
// warm the air is a kilometre and a half up.

import { DRY_RATE, cloudBase, parcelAt } from './air';

/** The top of the sea-chilled layer, metres. */
export const MIXED_M = 500;
/** Where the air aloft is given, metres. */
export const ALOFT_M = 1500;
/** How fast the free air above that cools with height, °C per metre. */
export const FREE_RATE = 6.5 / 1000;
/** Where the weather stops, metres. */
export const CEILING_M = 12000;

export interface CoastAir {
  /** The sea's surface temperature, °C. The air on it is a little warmer and nearly full of vapour. */
  seaC: number;
  /** The air's temperature 1.5 km up, °C. */
  aloftC: number;
}

/** The air around the bubble at a height, °C. */
export function coastEnvTemp(h: number, a: CoastAir): number {
  const ground = a.seaC + 1;
  const mixedTop = ground - DRY_RATE * 0.85 * MIXED_M;
  if (h <= MIXED_M) return ground - DRY_RATE * 0.85 * h;
  if (h <= ALOFT_M) return mixedTop + ((a.aloftC - mixedTop) * (h - MIXED_M)) / (ALOFT_M - MIXED_M);
  return a.aloftC - FREE_RATE * (h - ALOFT_M);
}

/** The bubble from the sea's surface: where it turns to cloud, how high it gets, and its fuel (°C × m of warmth over the air around it). */
export function coastBubble(a: CoastAir): { baseM: number; topM: number; fuel: number } {
  const t0 = a.seaC + 1.5;
  const dew = a.seaC;
  const baseM = cloudBase(t0, dew);
  let topM = 0;
  let fuel = 0;
  for (let h = 50; h <= CEILING_M; h += 50) {
    const diff = parcelAt(h, t0, dew).tempC - coastEnvTemp(h, a);
    if (diff < 0) break;
    topM = h;
    fuel += diff * 50;
  }
  return { baseM, topM, fuel };
}

/** Whether the air above the sea-chilled layer is warmer than its top: a lid. */
export const hasLid = (a: CoastAir) => a.aloftC > a.seaC + 1 - DRY_RATE * 0.85 * MIXED_M;
