// Dust and dry winds, as plain numbers: how a high cloud base turns a storm's
// rain into a cold blast and a wall of dust, how air warms and dries sinking
// down a slope, and how hard the wind blows through a gap in the mountains.

import { DEW_RATE, DRY_RATE } from './air';

// ---- Rain that never lands, and the blast it makes ------------------------------------------

/** The share of a storm's rain that reaches the ground from a base `baseKm` above it, through dry air, 0 to 1. */
export const rainLands = (baseKm: number) => Math.max(0, Math.min(1, 1 - (baseKm - 0.5) / 2.5));

/** How much colder than the air around it, °C, the downdraft is when it reaches the ground: rain evaporating on the way down chills it. */
export const downdraftChill = (baseKm: number) => Math.round((2 + 3.2 * Math.min(baseKm, 2.5)) * 10) / 10;

/** How fast the cold air spreads out along the ground, km/h: a pool of colder, heavier air about a kilometre deep slumping outwards. */
export const outflowKmh = (chillC: number) => Math.round(0.9 * Math.sqrt((9.8 * 1000 * chillC) / 300) * 3.6);

export type Soil = 'ploughed' | 'stubble' | 'wet';
/** The wind, km/h, it takes to lift dust off each kind of field. */
export const LIFT_KMH: Record<Soil, number> = { ploughed: 25, stubble: 45, wet: 70 };

/** How tall a wall of dust the gust front raises, m, over the given soil. */
export const dustWall = (gustKmh: number, soil: Soil) => Math.round(Math.min(1500, Math.max(0, gustKmh - LIFT_KMH[soil]) * 40));

// ---- Down the slope ------------------------------------------------------------------------

/** Saturation vapour pressure over water, hPa (Magnus). */
const vapour = (c: number) => 6.112 * Math.exp((17.62 * c) / (243.12 + c));

/** A parcel that sank from `fromM`, where it was `fromC` with dew point `dewC`, to `atM`, warming at the dry rate all the way. */
export function sinkTo(fromM: number, fromC: number, dewC: number, atM: number): { c: number; dewC: number; humidity: number } {
  const drop = fromM - atM;
  const c = fromC + DRY_RATE * drop;
  const dew = dewC + DEW_RATE * drop;
  return { c: Math.round(c * 10) / 10, dewC: Math.round(dew * 10) / 10, humidity: Math.round((100 * vapour(dew)) / vapour(c)) };
}

// ---- Through the gap ----------------------------------------------------------------------

/** The wind, km/h, driven through a gap in a mountain range by `hPa` more pressure on one side than the other, less what friction takes. */
export const gapWind = (hPa: number) => Math.round(0.5 * Math.sqrt((2 * hPa * 100) / 1.25) * 3.6);
