// A whole storm going by, for the lesson on reading an approaching front: the
// warm front, the warm air behind it and the cold front, as a watcher on the
// ground sees them hour by hour; how steep a front is, and what that does to
// its cloud and rain; and what the Cascades take out of a Pacific storm before
// it reaches the dry side of the state.
//
// Hours are counted from the moment the warm front reaches the watcher:
// negative before it, positive after. The cold front follows 12 hours behind.

import { cloudBase, DEW_RATE, DRY_RATE, fullOverWater, parcelAt } from './air';
import type { GenusId } from './clouds';

/** A storm's fronts travel at about this speed. */
export const STORM_KMH = 30;
/** Hours between the warm front and the cold front: the warm sector. */
export const WARM_SECTOR_H = 12;
/** The warm front's surface rises 1 km in 100; the cold front's nose, 1 in 50. */
export const WARM_SLOPE = 100;
export const COLD_SLOPE = 50;

export interface Sky {
  /** The cloud overhead, or none. */
  genus: GenusId | 'clear';
  /** Its base and top, in metres. */
  baseM: number;
  topM: number;
  /** Rain reaching the ground: none, steady or showers. */
  rain: 'none' | 'steady' | 'showers';
}

/** How high the warm front's sloping surface is over a watcher, `hours` before it arrives. */
export function warmSurfaceM(hours: number): number {
  return hours < 0 ? (-hours * STORM_KMH * 1000) / WARM_SLOPE : 0;
}

/** How high the cold air behind the cold front reaches over a watcher, `hours` after the warm front. */
export function coldSurfaceM(hours: number): number {
  const after = hours - WARM_SECTOR_H;
  return after > 0 ? Math.min(6000, (after * STORM_KMH * 1000) / COLD_SLOPE) : 0;
}

/** The sky over a watcher at an hour of the storm. */
export function stormSky(hours: number): Sky {
  const h = hours;
  if (h < -36) return { genus: 'clear', baseM: 0, topM: 0, rain: 'none' };
  if (h < -24) return { genus: 'cirrus', baseM: warmSurfaceM(h), topM: warmSurfaceM(h) + 1200, rain: 'none' };
  if (h < -14) return { genus: 'cirrostratus', baseM: warmSurfaceM(h), topM: Math.max(9500, warmSurfaceM(h) + 1500), rain: 'none' };
  if (h < -6) return { genus: 'altostratus', baseM: warmSurfaceM(h), topM: 8000, rain: 'none' };
  if (h < 0) return { genus: 'nimbostratus', baseM: Math.max(700, warmSurfaceM(h)), topM: 8000, rain: 'steady' };
  if (h < WARM_SECTOR_H - 1.5) return { genus: 'stratocumulus', baseM: 900, topM: 1800, rain: 'none' };
  if (h < WARM_SECTOR_H + 1) return { genus: 'cumulonimbus', baseM: 1000, topM: 10500, rain: 'showers' };
  if (h < WARM_SECTOR_H + 4) return { genus: 'clear', baseM: 0, topM: 0, rain: 'none' };
  return { genus: 'cumulus', baseM: 1300, topM: 2600, rain: 'none' };
}

export interface Weather {
  /** Sea-level pressure in hectopascals (millibars). */
  hPa: number;
  /** Its change over the last three hours. */
  tendency: number;
  /** The direction the wind blows from, in degrees (90 is east), and its speed. */
  windFrom: number;
  windKmh: number;
  tempC: number;
  dewC: number;
}

/** The barometer through the storm: a slow fall ahead of it, a sharp rise behind the cold front. */
export function stormPressure(hours: number): number {
  const h = Math.max(-48, Math.min(36, hours));
  if (h < -36) return 1019 - (h + 48) * 0.05;
  if (h < 0) return 1018.4 - ((h + 36) / 36) * 13.4; // 1018 to 1005: about 1 hPa every 3 hours, steadily
  if (h < WARM_SECTOR_H) return 1005 - (h / WARM_SECTOR_H) * 2.5; // nearly steady in the warm air
  if (h < WARM_SECTOR_H + 6) return 1002.5 + ((h - WARM_SECTOR_H) / 6) * 9; // a quick rise behind the cold front
  return 1011.5 + ((h - WARM_SECTOR_H - 6) / 18) * 5;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.max(0, Math.min(1, k));

/** What the barometer, the vane and the thermometer say at an hour of the storm. */
export function stormWeather(hours: number): Weather {
  const h = hours;
  const hPa = stormPressure(h);
  const tendency = hPa - stormPressure(h - 3);
  let windFrom: number;
  let windKmh: number;
  let tempC: number;
  let dewC: number;
  if (h < 0) {
    // Ahead of the warm front the wind backs round to the southeast and freshens.
    const k = (h + 48) / 48;
    windFrom = lerp(200, 135, k * 1.4);
    windKmh = lerp(8, 25, k);
    tempC = lerp(9, 10, k);
    // Rain falling into the cold air raises its dew point.
    dewC = h > -6 ? lerp(5, 9, (h + 6) / 6) : lerp(2, 5, k);
  } else if (h < WARM_SECTOR_H) {
    windFrom = lerp(190, 220, h / WARM_SECTOR_H);
    windKmh = 20;
    tempC = lerp(13, 16, h / 4);
    dewC = 11;
  } else {
    // The cold front: a sudden shift to the west or northwest, gusty, colder and drier.
    const k = (h - WARM_SECTOR_H) / 3;
    windFrom = lerp(220, 300, k);
    windKmh = lerp(45, 22, (h - WARM_SECTOR_H - 1) / 10);
    tempC = lerp(16, 8, k);
    dewC = lerp(11, 0, k);
  }
  return { hPa, tendency, windFrom: ((windFrom % 360) + 360) % 360, windKmh, tempC, dewC };
}

const POINTS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
/** A wind direction in words: "southeast". */
export function compass(deg: number): string {
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

// ---- How steep a front is -------------------------------------------------

export interface Lift {
  /** How fast the air at the front is lifted, in centimetres a second. */
  cmPerS: number;
  /** Layers from gentle lifting, towers from abrupt lifting. */
  kind: 'layers' | 'thick' | 'towers';
  /** How long rain falls on any one spot as the front goes by, and how hard. */
  rainHours: number;
  mmPerHour: number;
}

/**
 * A front `1 in slope` steep, moving at STORM_KMH. The air ahead of it is
 * lifted at the front's speed times its slope. Rain falls where the lifted air
 * is deep enough to make it (taken as 3 km deep), so a gentle front spreads its
 * rain over a wide belt and a steep one squeezes the same water into a narrow
 * band: about 10 mm either way, slow and long or hard and short.
 */
export function frontLift(slope: number): Lift {
  const ms = (STORM_KMH * 1000) / 3600;
  const cmPerS = (ms / slope) * 100;
  const beltKm = 3 * slope;
  const rainHours = beltKm / STORM_KMH;
  return {
    cmPerS,
    kind: cmPerS < 12 ? 'layers' : cmPerS < 20 ? 'thick' : 'towers',
    rainHours,
    mmPerHour: 10 / rainHours,
  };
}

// ---- Over the Cascades ----------------------------------------------------

/** The basin east of the mountains lies about this high. */
export const BASIN_M = 500;
/** Pacific air at the coast. */
export const COAST_C = 14;

export interface Crossing {
  /** The height the air turns to cloud as it climbs the western slopes, or null if it never does. */
  cloudBaseM: number | null;
  /** Grams of water wrung out of every kilogram of air, as rain and snow on the western slopes. */
  wrungG: number;
  /** The air at the crest. */
  crestC: number;
  /** The air coming down into the basin. */
  eastC: number;
  eastDewC: number;
  /** Its relative humidity there, 0 to 1. */
  eastRH: number;
}

/** Grams of vapour in a kilogram of air with this dew point at this height. */
function mixing(dewC: number, heightM: number): number {
  const p = 1013.25 * Math.exp(-heightM / 8400);
  const e = fullOverWater(dewC);
  return (622 * e) / (p - e);
}

/**
 * Pacific air (COAST_C, with the dew point given) blown over a range `crestM`
 * high and down into the basin. Climbing, it cools at the dry rate to its cloud
 * base, then more slowly as cloud; whatever condenses is taken to fall out on
 * the slopes. Coming down the far side it has no cloud left to evaporate, so it
 * warms at the dry rate all the way: warmer and much drier than it set out.
 */
export function crossRange(crestM: number, coastDewC: number): Crossing {
  const top = parcelAt(crestM, COAST_C, coastDewC);
  const base = top.cloud ? cloudBase(COAST_C, coastDewC) : null;
  const wrungG = top.cloud ? Math.max(0, mixing(coastDewC, 0) - mixing(top.dewC, crestM)) : 0;
  const down = Math.max(0, crestM - BASIN_M);
  const eastC = top.tempC + DRY_RATE * down;
  const eastDewC = top.dewC + DEW_RATE * down;
  return {
    cloudBaseM: base,
    wrungG,
    crestC: top.tempC,
    eastC,
    eastDewC,
    eastRH: fullOverWater(eastDewC) / fullOverWater(eastC),
  };
}
